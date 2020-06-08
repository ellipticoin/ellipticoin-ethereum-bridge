const UNISWAP_ROUTER_ADDRESS = "0xf164fC0Ec4E93095b804a4795bBe1e041497b92a" 
async function main() {
  const ECCBToken = await ethers.getContractFactory("ECCBToken")
  const token = await ECCBToken.deploy(UNISWAP_ROUTER_ADDRESS)

  await token.deployed()

  console.log("ECCBToken deployed to:", token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
