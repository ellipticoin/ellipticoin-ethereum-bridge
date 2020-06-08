const {
  ChainId,
  Token,
  TokenAmount,
  Pair,
  TradeType,
  Route,
  Trade,
  Percent,
} = require("@uniswap/sdk")
const EthereumTx = require('ethereumjs-tx').Transaction
const privateKey = Buffer.from(
  '29DF637D81F5A861B1C7668DB24A28ECE686302D87238B054D6B219305100B13',
  'hex',
)

const {
  utils: { parseEther },
} = ethers

const ECCB_ADDRESS = "0x154ccD29937fcb0cd2f8eB0e03Ab5080c7aeCB51"
const WETH = new Token(
  ChainId.KOVAN,
  "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
  18,
  "WETH",
  "Caffeine"
)
const ECCB = new Token(
  ChainId.KOVAN,
   ECCB_ADDRESS,
  18,
  "ECCB",
  "Caffeine"
)
const ELLIPTICOIN_ADDRESS = Buffer.from(
  "vQMn3JvS3ATITteQ-gOYfuVSn2buuAH-4e8NY_CvtwA",
  "base64"
);

const ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a"
const SELL_AMOUNT = "0.00001"
const DEADLINE = Math.ceil(Date.now() / 1000) + 60 * 20
const SLIPPAGE = new Percent(5, 1000)

async function main() {
  const ECCBToken = await ethers.getContract("ECCBToken")
  const token = await ECCBToken.attach(ECCB_ADDRESS)
  const address  = await (await ethers.getSigners())[0].getAddress()
  const signer = (await ethers.getSigners())[0]
  const UniswapV2Router01 = await ethers.getContract("UniswapV2Router01")
  const router = UniswapV2Router01.attach(ROUTER_ADDRESS)
  let pair = await Pair.fetchData(ECCB, WETH)
  let route = new Route([pair], WETH)
  const trade = new Trade(
    route,
    new TokenAmount(WETH, parseEther(SELL_AMOUNT)),
    TradeType.EXACT_INPUT
  )

  let {hash} = await token.swapAndBurn(
    trade.minimumAmountOut(SLIPPAGE).raw.toString(),
    trade.route.path.map((t) => t.address),
    ELLIPTICOIN_ADDRESS,
    DEADLINE, {
      value: ethers.BigNumber.from(trade.maximumAmountIn(SLIPPAGE).raw.toString()),
    }
  )
  // let tx = await token.populateTransaction.swapAndBurn(
  //   trade.minimumAmountOut(SLIPPAGE).raw.toString(),
  //   trade.route.path.map((t) => t.address),
  //   address,
  //   DEADLINE, {
  //     // value: ethers.BigNumber.from(trade.maximumAmountIn(SLIPPAGE).raw.toString()),
  //     value: parseInt(trade.maximumAmountIn(SLIPPAGE).raw.toString()),
  //     gasLimit: 50000,
  //     gasPrice: 12000000000,
  //     nonce: 265,
  //   }
  // )
  // console.log(tx)
  // const tx2 = new EthereumTx(tx, { chain: 'kovan' })
  // tx2.sign(privateKey)
  // const serializedTx = tx2.serialize()
  // console.log("0x" + serializedTx.toString("hex"))
  console.log(`Swapped and burned: ${SELL_AMOUNT} EC https://kovan.etherscan.io/tx/${hash}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
