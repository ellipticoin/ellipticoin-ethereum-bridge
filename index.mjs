import Long from "long";
import base64url from "base64url";
import dotenv from "dotenv";
import cbor from "borc";
import ecClient from "ec-client";
import ethers from "ethers";
import fs from "fs";
import net from "net";
import os from "os";
import _ from "lodash";
import websocket from "websocket";
import uniswapSDK from "@uniswap/sdk";
import Web3 from "web3";
const {
  WETH,
  ChainId,
  Token,
  TokenAmount,
  Fetcher,
  Pair,
  TradeType,
  Route,
  Trade,
  Percent,
} = uniswapSDK;
const CHAIN_ID = ChainId.GÖRLI;
const WebSocketClient = websocket.w3cwebsocket;
dotenv.config();
const ipcPath = process.env["HOME"] + "/.local/share/openethereum/jsonrpc.ipc";
// const ipcPath =
//   process.env["HOME"] +
//   "/Library/Application Support/io.parity.ethereum/jsonrpc.ipc";
const IPC_PROVIDER = new ethers.providers.IpcProvider(ipcPath);
const INFURA_PROVIDER = new ethers.providers.InfuraProvider(
  process.env.INFURA_NETWORK,
  process.env.INFURA_API_KEY
);
const ELLIPTICOIN_ADDRESS = Buffer.from(
  "vQMn3JvS3ATITteQ-gOYfuVSn2buuAH-4e8NY_CvtwA",
  "base64"
);
const BRIDGE_CONTRACT_ADDRESS = Buffer.concat([
  ELLIPTICOIN_ADDRESS,
  Buffer.from("EthereumBridge"),
]);

const { Ellipticoin, transactionHash } = ecClient;
const ECClient = ecClient.Client;
const CLIENT = ECClient.fromConfig(`${os.homedir()}/.ec-wallet/config.yaml`);
Ellipticoin.client = CLIENT;
const ECCB_ABI = JSON.parse(
  fs.readFileSync("ellipticoin_bridge/artifacts/ECCBToken.json", "utf8")
).abi;
const WETH_TOKEN = WETH[CHAIN_ID];
const ECCB_TOKEN = new Token(
  CHAIN_ID,
  "0x2e524faf0ed4880b42c971345605f2623daf469f",
  4
);
const WALLET = new ethers.Wallet(
  process.env.ETHEREUM_PRIVATE_KEY,
  INFURA_PROVIDER
);
const ECCB = new ethers.Contract(ECCB_TOKEN.address, ECCB_ABI, WALLET);
const {
  utils: { parseEther },
} = ethers;

const SLIPPAGE = new Percent(5, 1000);
const TRANSACTION_FEE = 100;
var transactionHashes = [];
var web3 = new Web3(ipcPath, net);
const instance = new web3.eth.Contract(ECCB_ABI, ECCB.address);
instance.events
  .SwapAndBurn({
    filter: {},
    fromBlock: "latest",
  })
  .on("data", async function (event) {
    let address = Buffer.from(
      event.returnValues.ellipticoin_address.substring(2),
      "hex"
    );
    let amount = parseInt(event.returnValues.amount);
    console.log(
      `Processing buy: https://etherscan.io/tx/${event.transactionHash}`
    );
    if (event.transactionHash in transactionHashes) {
      console.log(
        `Already processed https://etherscan.io/tx/${event.transactionHash}. Skipping`
      );
      return;
    }
    transactionHashes.push(event.transactionHash);
    let transfer = await CLIENT.post({
      contract_address: Buffer.concat([
        ELLIPTICOIN_ADDRESS,
        Buffer.from("EthereumBridge", "utf8"),
      ]),
      function: "transfer",
      arguments: [Array.from(address), Math.floor(amount - TRANSACTION_FEE)],
    });
    console.log(
      `Processed buy: https://block-explorer.ellipticoin.org/transactions/${base64url(
        transactionHash(transfer)
      )}`
    );
  })
  .on("changed", function (event) {
    console.log("changed");
  })
  .on("error", (error) => console.error(error))
  .on("close", () => console.error("closed"));

async function mintAndSwap(amount, address, ellipticoinTransactionHash) {
  let pair = await Fetcher.fetchPairData(WETH_TOKEN, ECCB_TOKEN);
  let route = new Route([pair], ECCB_TOKEN);
  const trade = new Trade(
    route,
    new TokenAmount(ECCB_TOKEN, amount),
    TradeType.EXACT_INPUT
  );
  console.log(
    `Processing sell: https://block-explorer.ellipticoin.org/transactions/${base64url(
      ellipticoinTransactionHash
    )}`
  );
  const { hash } = await ECCB.mintAndSwap(
    trade.maximumAmountIn(SLIPPAGE).raw.toString(),
    0,
    trade.route.path.map((t) => t.address),
    address,
    Math.ceil(Date.now() / 1000) + 60 * 20,
    ellipticoinTransactionHash,
    {
      gasPrice: ethers.utils.parseUnits("30", "gwei"),
    }
  );
  console.log(`Processed sell: https://etherscan.io/tx/${hash}`);
}

var client = new WebSocketClient("wss://davenport.ellipticoin.org/websocket");
// var client = new WebSocketClient("ws://localhost:8081/websocket");
setInterval(() => client.send(new ArrayBuffer(0)), 30000);
client.onmessage = ({ data }) => processBlock(decodeBytes(data));
const decodeBytes = (bytes) => cbor.decode(Buffer.from(bytes));

function isBurn(transaction) {
  return (
    Buffer.compare(transaction.contract_address, BRIDGE_CONTRACT_ADDRESS) ==
      0 && _.isEqual(transaction.return_value, { Ok: null })
  );
}

async function processBlock(block) {
  block.transactions.forEach((transaction) => {
    if (isBurn(transaction)) {
      processBurn(transaction);
    }
  });
}

async function processBurn(transaction) {
  const [amount, ethereumAddress] = transaction.arguments;
  if (transaction.function == "burn") {
  } else if (transaction.function == "burn_and_swap") {
    await mintAndSwap(
      amount,
      "0x" + Buffer.from(ethereumAddress).toString("hex"),
      transactionHash(transactionHash)
    );
  }
}
