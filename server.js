const { ethers } = require("ethers");
const admin = require("firebase-admin");

// ফায়ারবেস ইনিশিয়ালাইজেশন (আপনার ফায়ারবেস প্রজেক্ট কনফিগারেশন অনুযায়ী)
const serviceAccount = require("./firebase-service-key.json"); // অথবা এনভায়রনমেন্ট ভ্যারিয়েবল ব্যবহার করতে পারেন

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ugon-76893-default-rtdb.firebaseio.com"
});

const db = admin.database();

// নেটওয়ার্ক লিস্ট এবং RPC
const networks = {
  BSC: { name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org/", symbol: "BNB", explorer: "https://bscscan.com/tx/" },
  ETH: { name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH", explorer: "https://etherscan.io/tx/" },
  POLYGON: { name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC", explorer: "https://polygonscan.com/tx/" },
  AVAX: { name: "Avalanche", rpc: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX", explorer: "https://snowtrace.io/tx/" },
  BASE: { name: "Base", rpc: "https://mainnet.base.org", symbol: "ETH", explorer: "https://basescan.org/tx/" }
};

const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// ট্র্যাক করার জন্য ওয়ালেট লিস্ট মেমোরিতে রাখা
let monitoredWallets = new Map(); // address -> true

async function loadWalletsFromFirebase() {
  db.ref("wallets").on("value", (snapshot) => {
    if (snapshot.exists()) {
      const walletsData = snapshot.val();
      monitoredWallets.clear();
      Object.values(walletsData).forEach(w => {
        if (w.address) {
          monitoredWallets.set(w.address.toLowerCase(), true);
        }
      });
      console.log(`[Tracker] Loaded ${monitoredWallets.size} wallets to monitor.`);
    }
  });
}

// প্রতিটি নেটওয়ার্কের জন্য রিয়েল-টাইম ব্লক লিসেনার স্টার্ট করা
function startNetworkTrackers() {
  Object.keys(networks).forEach(netKey => {
    const net = networks[netKey];
    const provider = new ethers.JsonRpcProvider(net.rpc);

    console.log(`[Tracker] Starting listener for ${netKey}...`);

    provider.on("block", async (blockNumber) => {
      try {
        if (monitoredWallets.size === 0) return;

        let block = await provider.getBlock(blockNumber, true);
        if (!block || !block.prefetchedTransactions) return;

        // ১. নেটিভ কয়েন ট্র্যাকিং (Native Coin Deposits)
        for (let tx of block.prefetchedTransactions) {
          if (tx.to && monitoredWallets.has(tx.to.toLowerCase())) {
            let amtFormatted = parseFloat(ethers.formatEther(tx.value || 0)).toFixed(6);
            if (parseFloat(amtFormatted) > 0) {
              saveTransactionToDatabase(tx.to.toLowerCase(), {
                hash: tx.hash,
                net: netKey,
                type: "Receive",
                amt: amtFormatted,
                sym: net.symbol,
                to: tx.to,
                from: tx.from || "External",
                date: new Date().toLocaleString()
              });
            }
          }
        }

        // ২. অজানা/চেনা টোকেন ট্র্যাকিং (ERC20/BEP20 Transfer Events)
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        
        let logs = await provider.getLogs({
          topics: [transferTopic],
          fromBlock: blockNumber,
          toBlock: blockNumber
        });

        for (let log of logs) {
          try {
            // log.topics[2] হলো 'to' এড্রেস (padded)
            if (log.topics && log.topics[2]) {
              let rawToAddress = "0x" + log.topics[2].substring(26).toLowerCase();
              
              if (monitoredWallets.has(rawToAddress)) {
                // টোকেন ডিটেলস ফেচ করা (সিম্বল এবং ডেসিমেল)
                let tokenContract = new ethers.Contract(log.address, erc20Abi, provider);
                let [sym, decimals] = await Promise.all([
                  tokenContract.symbol().catch(() => "UNKNOWN"),
                  tokenContract.decimals().catch(() => 18)
                ]);

                let parsedValue = ethers.formatUnits(log.data, decimals);
                let amtFormatted = parseFloat(parsedValue).toFixed(6);

                if (parseFloat(amtFormatted) > 0) {
                  // Sender বের করার চেষ্টা
                  let fromAddress = "0x" + (log.topics[1] ? log.topics[1].substring(26) : "0000000000000000000000000000000000000000");

                  saveTransactionToDatabase(rawToAddress, {
                    hash: log.transactionHash,
                    net: netKey,
                    type: "Receive",
                    amt: amtFormatted,
                    sym: sym,
                    to: rawToAddress,
                    from: fromAddress,
                    date: new Date().toLocaleString()
                  });
                }
              }
            }
          } catch (innerErr) {
            // সিঙ্গেল লগ এরর ইগনোর করা
          }
        }

      } catch (err) {
        console.error(`[Error] Block processing error on ${netKey}:`, err.message);
      }
    });
  });
}

// ফায়ারবেসে ট্রানজেকশন সেভ এবং ডুপ্লিকেট চেক করা
async function saveTransactionToDatabase(addressKey, txObj) {
  const sanitizedKey = addressKey.replace(/[\.#$\/\[\]]/g, "_");
  const historyRef = db.ref(`history/${sanitizedKey}`);

  historyRef.once("value", (snapshot) => {
    let history = snapshot.val() || [];
    if (!Array.isArray(history)) history = [];

    // ডুপ্লিকেট চেক
    let exists = history.some(h => h.hash.toLowerCase() === txObj.hash.toLowerCase());
    if (!exists) {
      history.unshift(txObj);
      historyRef.set(history);
      console.log(`[Success] Deposit detected & saved for ${addressKey}: ${txObj.amt} ${txObj.sym}`);
    }
  });
}

// সার্ভার স্টার্ট
loadWalletsFromFirebase();
startNetworkTrackers();

const PORT = process.env.PORT || 3000;
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Pro Wallet Background Tracker is Running!"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
