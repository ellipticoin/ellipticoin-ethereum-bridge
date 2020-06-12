const ecClient = require("ec-client");
const os = require("os");
const fs = require("fs");
const AMOUNT = "1000";
const DEADLINE = Math.ceil(Date.now() / 1000) + 60 * 20;
const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const {
  utils: { parseEther },
} = ethers;
const { Ellipticoin, Contract, transactionHash, Client } = ecClient;
const ECClient = ecClient.Client;
const CLIENT = ECClient.fromConfig(`${os.homedir()}/.ec-wallet/config.yaml`);
Ellipticoin.client = CLIENT;
const ELLIPTICOIN_ADDRESS = Buffer.from(
  "vQMn3JvS3ATITteQ-gOYfuVSn2buuAH-4e8NY_CvtwA",
  "base64"
);

const BRIDGE_CONTRACT_ADDRESS = Buffer.concat([
  ELLIPTICOIN_ADDRESS,
  Buffer.from("EthereumBridge"),
]);
async function main() {
  let tx = await CLIENT.deploy(
    "EthereumBridge",
    fs.readFileSync("ethereum_bridge/dist/ethereum_bridge.wasm"),
    []
  );
  await CLIENT.waitForTransactionToBeMined(tx);
  tx = await Ellipticoin.approve(
    Array.from(BRIDGE_CONTRACT_ADDRESS),
    parseInt(AMOUNT) * 10000
  );
  await CLIENT.waitForTransactionToBeMined(tx);
  const address = await (await ethers.getSigners())[0].getAddress();
  tx = await CLIENT.post({
    contract_address: Buffer.concat([
      ELLIPTICOIN_ADDRESS,
      Buffer.from("EthereumBridge", "utf8"),
    ]),
    function: "burn",
    arguments: [
      Math.floor(parseInt(AMOUNT) * 10000),
      Array.from(Buffer.from(address.substring(2), "hex")),
    ],
  });
  await CLIENT.waitForTransactionToBeMined(tx);

  const ECCBToken = await ethers.getContractFactory("ECCBToken");
  const token = await ECCBToken.deploy(ROUTER_ADDRESS);
  var { hash } = await token.mint(parseInt(AMOUNT) * 10000, address)
  console.log(`Minted: ${AMOUNT} EC https://etherscan.io/tx/${hash}`)
  console.log("ECCBToken deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
