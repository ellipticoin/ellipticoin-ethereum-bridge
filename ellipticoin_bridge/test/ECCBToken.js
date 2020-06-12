const { expect } = require("chai")
const { utils: {parseEther}} = ethers
describe("Token contract", function () {
  const ALICE_EC = Buffer.concat([Buffer.alloc(31), Buffer.from([1])])
  beforeEach(async function () {
    MockUniswapV2Router01 = await ethers.getContractFactory("MockUniswapV2Router01")
    Token = await ethers.getContractFactory("ECCBToken")
    const signers = await ethers.getSigners()
    ;[ownerSigner, aliceSigner, bobSigner, ...otherSigners] = signers
    ;[owner, alice, bob, ...addrs] = await Promise.all(
      signers.map((addr) => addr.getAddress())
    )
    router = await MockUniswapV2Router01.deploy()
    await router.deployed()
    token = await Token.deploy(router.address)
    await token.deployed()
  })

  describe("Minting", function () {
    it("Should mint tokens to the address specified", async function () {
      await token.mint(50, alice)
      expect(await token.balanceOf(alice)).to.equal(50)
    })
  })

  describe("Mint And Swap", function () {
    it("Should mint tokens and swap them for ETH", async function () {
      await token.mintAndSwap(
        1,
        1,
        [],
        alice,
        1,
        Buffer.alloc(32)
      )
      let lastCall = await router.getLastSwapExactTokensForETH()
      expect(lastCall[0]).to.eq(1)
      expect(lastCall[1]).to.eq(1)
      expect(lastCall[2]).to.deep.eq([])
      expect(lastCall[3]).to.eq(alice)
      expect(lastCall[4]).to.eq(1)
    })
  })

  describe("Swap and Burn", function () {
    it("Should swap ETH for tokens and burn them", async function () {

      await token.swapAndBurn(
        1,
        [],
        ALICE_EC,
        1, {
          value: parseEther("1")
        }
      )
      let swapAndBurnEvent = await new Promise((resolve, reject) => {
        token.on('SwapAndBurn', (a, b, e) => {
          resolve(e);
        });
      });
      expect(swapAndBurnEvent.args.ellipticoin_address).to.eq("0x" + ALICE_EC.toString('hex'));
      let lastCall = await router.getLastSwapExactETHForTokens()
      expect(lastCall[0]).to.eq(parseEther("1"))
      expect(lastCall[1]).to.eq(1)
      expect(lastCall[2]).to.deep.eq([])
      expect(lastCall[3]).to.eq(owner)
      expect(lastCall[4]).to.eq(1)
    })
  })

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await token.mint(50, owner)
      await token.transfer(alice, 50)
      expect(await token.balanceOf(alice)).to.equal(50)

      await token.connect(aliceSigner).transfer(bob, 50)
      expect(await token.balanceOf(bob)).to.equal(50)
    })

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner)

      await expect(
        token.connect(aliceSigner).transfer(owner, 1)
      ).to.be.revertedWith("transfer amount exceeds balance")

      expect(await token.balanceOf(owner)).to.equal(
        initialOwnerBalance
      )
    })
  })
})
