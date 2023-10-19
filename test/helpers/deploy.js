const { ethers, upgrades } = require("hardhat");
const { FEE_RECIPIENT } = require("./constants");

const deployErc20Token = async (deployer) => {
  const Erc20Token = await ethers.getContractFactory("TestERC20");
  const erc20Token = await Erc20Token.deploy(deployer.address);
  await erc20Token.deployed();
  return erc20Token;
};

const deployCollection = async () => {
  const Collection = await ethers.getContractFactory("TestERC721");
  const collection = await Collection.deploy();
  await collection.deployed();
  return collection;
};

const deployDcvExchange = async (
  royaltiesProviderAddress,
  royaltiesSigner,
  erc20PaymentTokenAddress
) => {
  const DcvExchange = await ethers.getContractFactory("DcvExchange");
  const dcvExchangeContract = await upgrades.deployProxy(
    DcvExchange,
    [
      royaltiesProviderAddress,
      royaltiesSigner,
      erc20PaymentTokenAddress,
      FEE_RECIPIENT,
      250,
    ],
    {
      initializer: "__DcvExchange_init",
    }
  );
  await dcvExchangeContract.deployed();
  return dcvExchangeContract;
};

const deployDcvExchangeWithDeps = async (
  erc20TokenRecipient,
  royaltiesSigner
) => {
  const royaltiesProviderContract = await deployRoyaltiesProvider();

  const erc20TokenContract = await deployErc20Token(erc20TokenRecipient);

  const dcvExchangeContract = await deployDcvExchange(
    royaltiesProviderContract.address,
    royaltiesSigner.address,
    erc20TokenContract.address
  );

  await royaltiesProviderContract.setExchangeAddress(
    dcvExchangeContract.address
  );

  return { erc20TokenContract, royaltiesProviderContract, dcvExchangeContract };
};

const deployRoyaltiesProvider = async () => {
  const RoyaltiesProvider = await ethers.getContractFactory(
    "RoyaltiesProvider"
  );
  const royaltiesProviderProxy = await upgrades.deployProxy(
    RoyaltiesProvider,
    [],
    {
      initializer: "__RoyaltiesProvider_init",
    }
  );
  await royaltiesProviderProxy.deployed();
  return royaltiesProviderProxy;
};

module.exports = {
  deployErc20Token,
  deployCollection,
  deployDcvExchange,
  deployDcvExchangeWithDeps,
  deployRoyaltiesProvider,
};
