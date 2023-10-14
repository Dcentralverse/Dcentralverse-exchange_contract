const { ethers } = require("hardhat");
const { getForNetwork } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const { royaltiesProviderProxy, dcvExchangeProxy } = getForNetwork(
    network.name
  );

  console.log("Calling RoyaltiesProvider with the account:", deployer.address);

  const RoyaltiesProvider = await ethers.getContractFactory(
    "RoyaltiesProvider"
  );
  const royaltiesProvider = RoyaltiesProvider.attach(royaltiesProviderProxy);

  await royaltiesProvider.setExchangeAddress(dcvExchangeProxy);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
