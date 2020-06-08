import Long from "long";
import base64url from "base64url";
import dotenv from "dotenv";
import cbor from "borc";
import ecClient from "ec-client";
import ethers from "ethers";
import fs from "fs";
import os from "os";
import _ from "lodash";
import websocket from "websocket";
import uniswapSDK from "@uniswap/sdk";
import Web3 from "web3";
const {
  ChainId,
  Token,
  TokenAmount,
  Pair,
  TradeType,
  Route,
  Trade,
  Percent,
} = uniswapSDK;
dotenv.config();
const WebSocketClient = websocket.w3cwebsocket;
const INFURA = new ethers.providers.InfuraProvider(
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
let ellipticoinBalance;

const CLIENT = ECClient.fromConfig(`${os.homedir()}/.ec-wallet/config.yaml`);
// CLIENT.bootnodes = ["http://localhost:4461"];
Ellipticoin.client = CLIENT;
const ECCB_ABI = JSON.parse(
  fs.readFileSync(
    "ellipticoin_bridge/artifacts/ECCBToken.json",
    "utf8"
  )
).abi;
const WALLET = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY, INFURA);
const ECCB_ADDRESS = "0x89108B7Bf410Ce52e41eFd41e565ca180Df1EC53";

const ECCB = new ethers.Contract(ECCB_ADDRESS, ECCB_ABI, WALLET);
const ROUTER_ABI = JSON.parse(
  fs.readFileSync(
    "ellipticoin_bridge/artifacts/UniswapV2Router01.json",
    "utf8"
  )
).abi;
const ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a";
const ROUTER = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, WALLET);

const {
  utils: { parseEther },
} = ethers;

const WETH_TOKEN = new Token(
  ChainId.KOVAN,
  "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
  18,
);
const ECCB_TOKEN = new Token(
  ChainId.KOVAN,
  ECCB_ADDRESS,
  4,
);
const SLIPPAGE = new Percent(5, 1000);
let web3 = new Web3("wss://kovan.infura.io/ws/v3/28d900c929bf4df88e0a4adc9f790e22");
const instance = new web3.eth.Contract(ECCB_ABI, ECCB_ADDRESS);
instance.events.SwapAndBurn({
    filter: {},
    fromBlock: "latest"
})
.on('data', async function(event){
    let address = Buffer.from(event.returnValues.ellipticoin_address.substring(2), "hex")
    console.log(event.returnValues.amount)
    let amount = parseInt(event.returnValues.amount)
    console.log(await CLIENT.post({
      contract_address: Buffer.concat([
        ELLIPTICOIN_ADDRESS,
        Buffer.from("EthereumBridge", "utf8"),
      ]),
      function: "transfer",
      arguments: [
        Array.from(address),
        Math.floor(amount),
      ],
    }));
    
})
.on('changed', function(event){
    // remove event from local database
})
.on('error', () => console.error('error'))
.on('close', () => console.error('closed'));

async function mintAndSwap(amount, address, ellipticoinTransactionHash) {
  let pair = await Pair.fetchData(WETH_TOKEN, ECCB_TOKEN);
  let route = new Route([pair], ECCB_TOKEN);
  const trade = new Trade(
    route,
    new TokenAmount(ECCB_TOKEN, amount),
    TradeType.EXACT_INPUT
  );

  let { hash } = await ECCB.mintAndSwap(
    trade.maximumAmountIn(SLIPPAGE).raw.toString(),
    trade.minimumAmountOut(SLIPPAGE).raw.toString(),
    trade.route.path.map((t) => t.address),
    address,
    Math.ceil(Date.now() / 1000) + 60 * 20,
    ellipticoinTransactionHash,
    {
      gasLimit: 5000000,
    }
  );
  console.log(
    `Minted and swapped: ${amount} EC https://kovan.etherscan.io/tx/${hash}`
  );
}

var client = new WebSocketClient("ws://localhost:4462/websocket");
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
