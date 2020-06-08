const ecClient = require("ec-client")
const os = require("os")
const fs = require("fs")
const AMOUNT = "50"
const ETHER_AMOUNT = "0.025"
const DEADLINE = Math.ceil(Date.now() / 1000) + 60 * 20
const ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a"
const {
  utils: { parseEther },
} = ethers
const { Ellipticoin, Contract, transactionHash, Client } = ecClient
const ECClient = ecClient.Client
const CLIENT = ECClient.fromConfig(`${os.homedir()}/.ec-wallet/config.yaml`)
// CLIENT.bootnodes = ["http://localhost:4461"]
Ellipticoin.client = CLIENT
const ELLIPTICOIN_ADDRESS = Buffer.from(
  "vQMn3JvS3ATITteQ-gOYfuVSn2buuAH-4e8NY_CvtwA",
  "base64"
)

const BRIDGE_CONTRACT_ADDRESS = Buffer.concat([
  ELLIPTICOIN_ADDRESS,
  Buffer.from("EthereumBridge"),
])
async function main() {
  let tx = await CLIENT.deploy(
    "EthereumBridge",
    Buffer.alloc(2000),
    fs.readFileSync("ethereum_bridge/dist/ethereum_bridge.wasm"),
    []
  )
  await CLIENT.waitForTransactionToBeMined(tx)
  tx = await Ellipticoin.approve(
    Array.from(BRIDGE_CONTRACT_ADDRESS),
    parseInt(AMOUNT) * 10000
  )
  await CLIENT.waitForTransactionToBeMined(tx)
  tx = await CLIENT.post({
    contract_address: Buffer.concat([
      ELLIPTICOIN_ADDRESS,
      Buffer.from("EthereumBridge", "utf8"),
    ]),
    function: "burn",
    arguments: [
      parseInt(AMOUNT) * 10000,
      Array.from(Buffer.from("Ab521188aA30ccc4a88Ec9ea6BC55541b72eD1d3", "hex"))
    ],
  })
  await CLIENT.waitForTransactionToBeMined(tx)

  const address = await (await ethers.getSigners())[0].getAddress()
  const ECCBToken = await ethers.getContractFactory("ECCBToken")
  const token = await ECCBToken.deploy(ROUTER_ADDRESS)

  ECCBTokenAddress = (await token.deployed()).address
  var { hash } = await token.mint(parseEther(AMOUNT), address)
  console.log(`Minted: ${AMOUNT} EC https://kovan.etherscan.io/tx/${hash}`)
  var { hash } = await token.approve(ROUTER_ADDRESS, parseEther(AMOUNT))
  console.log(`Approved https://kovan.etherscan.io/tx/${hash}`)
  const UniswapV2Router01 = await ethers.getContract("UniswapV2Router01")
  const router = UniswapV2Router01.attach(ROUTER_ADDRESS)
  console.log([ECCBTokenAddress])
  var { hash } = await router.addLiquidityETH(
    ECCBTokenAddress,
    parseInt(AMOUNT) * 10000,
    parseInt(AMOUNT) * 10000,
    ethers.utils.parseEther(ETHER_AMOUNT),
    address,
    DEADLINE,
    {
      value: parseEther(ETHER_AMOUNT),
    }
  )
  console.log(`Added liquidity https://kovan.etherscan.io/tx/${hash}`)
  console.log("ECCBToken deployed to:", token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
