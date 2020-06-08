const ADDRESS = "0xacA15A1a1BBC25D12Dec36749364430cf4540B42"
const AMOUNT = "1000"
const {utils: {parseEther}} = ethers

async function main() {
  const ECCBToken = await ethers.getContract("ECCBToken")
  const token = await ECCBToken.attach(ADDRESS)
  const address  = (await ethers.getSigners())[0].getAddress()

  const { hash } = await token.mint(parseEther(AMOUNT), address)
  console.log(`Minted: ${AMOUNT} EC https://kovan.etherscan.io/tx/${hash}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
