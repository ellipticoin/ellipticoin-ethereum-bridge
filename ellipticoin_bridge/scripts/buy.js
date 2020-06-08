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

const ECCB_ADDRESS = "0x8c5b638d00BB369D1C2D85ffC941d0c4C8fa2891"
const WETH = new Token(
  ChainId.KOVAN,
  "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
  18,
  "WETH",
  "Caffeine"
)
const ECCB = new Token(
  ChainId.KOVAN,
  "0xc6d7a992615a2443e2c13a5bce624c03a088eb9f",
  18,
  "ECCB",
  "Caffeine"
)

const ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a"
const BUY_AMOUNT = "0.002"
const DEADLINE = Math.ceil(Date.now() / 1000) + 60 * 20
const SLIPPAGE = new Percent(5, 1000)

async function main() {
  const signer = (await ethers.getSigners())[0]
  const address = await (await ethers.getSigners())[0].getAddress()
  const UniswapV2Router01 = await ethers.getContract("UniswapV2Router01")
  const router = UniswapV2Router01.attach(ROUTER_ADDRESS)
  let pair = await Pair.fetchData(ECCB, WETH)
  let route = new Route([pair], WETH)
  const trade = new Trade(
    route,
    new TokenAmount(WETH, parseEther(BUY_AMOUNT)),
    TradeType.EXACT_INPUT
  )

  let tx = await router.swapExactETHForTokens(
    trade.minimumAmountOut(SLIPPAGE).raw.toString(),
    trade.route.path.map((t) => t.address),
    address,
    DEADLINE,
    {
    value: parseEther(BUY_AMOUNT)
  }
  )
  console.log(`bought ${BUY_AMOUNT} EC https://kovan.etherscan.io/tx/${tx.hash}`)
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
