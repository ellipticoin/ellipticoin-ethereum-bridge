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
const {
  utils: { parseEther },
} = ethers

const ECCB_ADDRESS = "0x8061F57c158B0B0171eb7ADFC4876Bd4236abF33"
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

const ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a"
const SELL_AMOUNT = "1"
const DEADLINE = Math.ceil(Date.now() / 1000) + 60 * 20
const SLIPPAGE = new Percent(5, 1000)
const AMOUNT = "1000"

async function main() {
  const ECCBToken = await ethers.getContract("ECCBToken")
  const token = await ECCBToken.attach(ECCB_ADDRESS)
  const address  = await (await ethers.getSigners())[0].getAddress()


  const signer = (await ethers.getSigners())[0]
  const UniswapV2Router01 = await ethers.getContract("UniswapV2Router01")
  const router = UniswapV2Router01.attach(ROUTER_ADDRESS)
  let pair = await Pair.fetchData(WETH, ECCB)
  let route = new Route([pair], ECCB)
  const trade = new Trade(
    route,
    new TokenAmount(ECCB, parseEther(SELL_AMOUNT)),
    TradeType.EXACT_INPUT
  )

  let {hash} = await token.mintAndSwap(
    trade.maximumAmountIn(SLIPPAGE).raw.toString(),
    trade.minimumAmountOut(SLIPPAGE).raw.toString(),
    trade.route.path.map((t) => t.address),
    address,
    DEADLINE
  )
  console.log(`Minted and swapped: ${AMOUNT} EC https://kovan.etherscan.io/tx/${hash}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
