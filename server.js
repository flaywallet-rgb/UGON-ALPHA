const { ethers } = require("ethers");
const admin = require("firebase-admin");
const express = require("express");

// সরাসরি আপনার ফায়ারবেস ক্রেডেনশিয়াল কোডে যুক্ত করা হলো
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: "ugon-76893",
    private_key_id: "0f308cf621c4c57cbdb599eb45765d59569e5915",
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7NUaB8PvgvLq3\n0o4+1KUsboQeaus+R7W9ldGg6C43QS0FseH/x/AoyWHhInAKIoDH+Pftv3xfUN/h\nEUNaIZkl6aGL8p/aFBe2B4CfVSMxNyj42UtHHTkDsTNo45EaXKCeVFSOnvbpaqGF\nV2jTX6LxTdmmfFSixJ530IXTnlK+apBjx3CPZp1XXaFlTRWFumM2H9glzdRlevOt\n9jwxEfI6rzmlC9x3VXLx1RxCm9HMk1Or4p5msafx2kVrttrCaQLsBOcO9xzrEYl5\nxp8AjVlPi5SCf9mlDbWWvMiw+KYBsGkd4yn0UwxR/hBWb+IpeyC/MK9kEElJZAOv\n7Hw8Evm/AgMBAAECggEAHIhLpT1Z3lBVcvPb6zaUsBdt+obYMMdUKz980jXg6Vn9\nJyuL4uSRtV2wFdSeV+UXVKMdAnbXWV2lqZNsfP227kDT9tT1SRMb5AnzsBUVRoh+\nLaNMpluNV4M37yoT8P0iG8+FjbErt7qhQIXoe6LNXlK7s/SqH56w+ljlNLIiMVQg\nthT+RAJ1Dm6370wYyn+ZnqCU+V6fB9keqe/Mw4rLjyaD5qA58tY2HeHnGYWny12k\niqA4dkzLuWp61HmKtIjzFgsFataxotTSV7bchPYJos/U61xOeHvfDF/JEKhaPQy3\nG32CeSc8MWkCdPCfPUUHYFEk4eetOf6o53dKGcnWJQKBgQDnIq+cZF38xzMGAEXU\ngMHh/7x4jECMAypjmSZgvOqds50t9ow5bjDwgi43JdZ5GZWllX10qCYAfqrf/G9M\nyCUJ1XWNiePdcWJmTFbN/TcB6dRB20TPxrmF3JZIkYKWTKfJDJ0nM+7ANoDY7epN\nGGxiKmR9ruOF4EtPW+0WPdcsZQKBgQDPWNvzDTH90Z33+w/9ynYf5DpMswZvkoHP\nPmJF9geMCt4/RSh+py7DMwzwbgKAy8NwfjNc3J13SWdj7HhPYCoSQac2NLybsIT8\nO4pjYzPubECgeOMBcRZXeOBaqriV1238XePJZsKa2aeV2qxoBo4yMyLREg33VNol\nPExZZOtxUwKBgHQ3BIVmEbvfjNAfovzOIK45n9Ic8vdzQAUEJD/PvUe93/IUXT0j\nIohLbGFeLRCGxK+VEpdtVG47Qj+M9YltuPHQ2mJoSqI1OHynNZ4tC1Ny9r6GOXsf\nOHkOCKJER5y6vkJgjUQA4LLUtMReG8jX1uck2ZI4NT5DIJquZe8g+OfhAoGBAIrP\/3hpVhWKFwqkjyEmQQy6u3kLxXw+hh8bsakKvCS6Re3vu9uGy1ytObVgwNY/FBmk\ns3gwzk7E2q3f6u+g/ql4QJyek8JbW7yNk+lTybmNyXplU/xsHDv1VaX9c1QFhMGW\njeAQpqoKmxJM8m02Lk5XQ7DaOHVj3iNdifOzB5i3AoGBAJonimOCQ39ZmeQjfN3w\ne7UJRwmabo6/pucD7iSjyM/miJk8DlfxccB0DUOB3++4Ox2ttV0mYUY+FlzxAeho\ndj7bgO/9+lGnNlA+cD8ccNlC3cj1tAjtO7nqlpNKY+K132F5FOSWSNG0w6XgbJmJ\nkjdPhZWDSm3FalGDSXAXX+CW5\n-----END PRIVATE KEY---------`,
    client_email: "firebase-adminsdk-fbsvc@ugon-76893.iam.gserviceaccount.com",
    client_id: "109437285185381350328",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ugon-76893.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
  }),
  databaseURL: "https://ugon-76893-default-rtdb.firebaseio.com"
});

const db = admin.database();

const networks = {
  BSC: { name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org/", symbol: "BNB" },
  ETH: { name: "Ethereum", rpc: "https://cloudflare-eth.com", symbol: "ETH" },
  POLYGON: { name: "Polygon", rpc: "https://polygon-rpc.com", symbol: "MATIC" },
  AVAX: { name: "Avalanche", rpc: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX" },
  BASE: { name: "Base", rpc: "https://mainnet.base.org", symbol: "ETH" }
};

const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let monitoredWallets = new Map();

function loadWalletsFromFirebase() {
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

        const transferTopic = ethers.id("Transfer(address,address,uint256)");
        let logs = await provider.getLogs({
          topics: [transferTopic],
          fromBlock: blockNumber,
          toBlock: blockNumber
        });

        for (let log of logs) {
          try {
            if (log.topics && log.topics[2]) {
              let rawToAddress = "0x" + log.topics[2].substring(26).toLowerCase();
              
              if (monitoredWallets.has(rawToAddress)) {
                let tokenContract = new ethers.Contract(log.address, erc20Abi, provider);
                let [sym, decimals] = await Promise.all([
                  tokenContract.symbol().catch(() => "UNKNOWN"),
                  tokenContract.decimals().catch(() => 18)
                ]);

                let parsedValue = ethers.formatUnits(log.data, decimals);
                let amtFormatted = parseFloat(parsedValue).toFixed(6);

                if (parseFloat(amtFormatted) > 0) {
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
          } catch (innerErr) {}
        }
      } catch (err) {
        console.error(`[Error] Block processing error on ${netKey}:`, err.message);
      }
    });
  });
}

async function saveTransactionToDatabase(addressKey, txObj) {
  const sanitizedKey = addressKey.replace(/[\.#$\/\[\]]/g, "_");
  const historyRef = db.ref(`history/${sanitizedKey}`);

  historyRef.once("value", (snapshot) => {
    let history = snapshot.val() || [];
    if (!Array.isArray(history)) history = [];

    let exists = history.some(h => h.hash.toLowerCase() === txObj.hash.toLowerCase());
    if (!exists) {
      history.unshift(txObj);
      historyRef.set(history);
      console.log(`[Success] Deposit detected & saved for ${addressKey}: ${txObj.amt} ${txObj.sym}`);
    }
  });
}

loadWalletsFromFirebase();
startNetworkTrackers();

const app = express();
app.get("/", (req, res) => res.send("Pro Wallet Background Tracker is Live & Running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
