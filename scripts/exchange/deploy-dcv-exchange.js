const { ethers, upgrades, network } = require("hardhat");
const { getForNetwork } = require("../utils/addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const { royaltiesProviderProxy, wrappedNativeToken } = getForNetwork(
    network.name
  );

  const royaltiesSigner = "";
  const feeRecipientAddress = "";
  const platformPercentage = 250;

  console.log("Deploying DcvExchange with the account:", deployer.address);

  const DcvExchange = await ethers.getContractFactory("DcvExchange");
  const dcvExchange = await upgrades.deployProxy(
    DcvExchange,
    [
      royaltiesProviderProxy,
      royaltiesSigner,
      wrappedNativeToken,
      feeRecipientAddress,
      platformPercentage,
    ],
    {
      deployer,
      initializer: "__DcvExchange_init",
    }
  );
  await dcvExchange.deployed();

  console.log("DcvExchange deployed to:", dcvExchange.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
