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

const ECCB_ADDRESS = "0x39dd802A1093336D907972c757a2Cf4772e3394e"
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

async function main() {
  const signer = (await ethers.getSigners())[0]
  const address = await signer.getAddress()
  const UniswapV2Router01 = await ethers.getContract("UniswapV2Router01")
  const router = UniswapV2Router01.attach(ROUTER_ADDRESS)
  let pair = await Pair.fetchData(WETH, ECCB)
  let route = new Route([pair], ECCB)
  const trade = new Trade(
    route,
    new TokenAmount(ECCB, parseEther(SELL_AMOUNT)),
    TradeType.EXACT_INPUT
  )

  let tx = await router.swapExactTokensForETH(
    trade.maximumAmountIn(SLIPPAGE).raw.toString(),
    trade.minimumAmountOut(SLIPPAGE).raw.toString(),
    trade.route.path.map((t) => t.address),
    address,
    DEADLINE
  )
  console.log(`sold ${SELL_AMOUNT} EC https://kovan.etherscan.io/tx/${tx.hash}`)
  console.log(`EC Balance: ${await balanceOf(ECCB_ADDRESS, address)}`)
  console.log(`ETH Balance: ${ethers.utils.formatEther(await signer.getBalance())}`)
}

async function balanceOf(tokenAddress, owner) {
    const ERC20ABI = [
    {
      name: 'balanceOf',
      type: 'function',
      inputs: [
        {
          name: '_owner',
          type: 'address',
        },
      ],
      outputs: [
        {
          name: 'balance',
          type: 'uint256',
        },
      ],
      constant: true,
      payable: false,
    },
  ];
  const token = new ethers.Contract(tokenAddress, ERC20ABI, (await ethers.getSigners())[0])
  return ethers.utils.formatEther(await token.balanceOf(owner))
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
