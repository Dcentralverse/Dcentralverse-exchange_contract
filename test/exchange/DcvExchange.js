const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployDcvExchangeWithDeps } = require("../helpers/deploy");
const { FEE_RECIPIENT } = require("../helpers/constants");

describe("DcvExchange", () => {
  let dcvExchange, royaltiesProvider, erc20PaymentToken;

  let owner,
    royaltiesSigner,
    contractAddress2,
    contractAddress3,
    contractAddress4,
    contractAddress5;

  async function deploy() {
    [
      owner,
      royaltiesSigner,
      contractAddress2,
      contractAddress3,
      contractAddress4,
      contractAddress5,
    ] = await ethers.getSigners();

    const result = await deployDcvExchangeWithDeps(owner, royaltiesSigner);

    dcvExchange = result.dcvExchangeContract;
    royaltiesProvider = result.royaltiesProviderContract;
    erc20PaymentToken = result.erc20TokenContract;
  }

  describe("Initial state", () => {
    beforeEach(deploy);

    it("should have owner", async () => {
      expect(await dcvExchange.owner()).to.equal(owner.address);
    });

    it("should initialize correctly", async () => {
      expect(await dcvExchange.royaltiesProvider()).to.equal(
        royaltiesProvider.address
      );
      expect(await dcvExchange.royaltiesSigner()).to.equal(
        royaltiesSigner.address
      );
      expect(await dcvExchange.erc20PaymentToken()).to.equal(
        erc20PaymentToken.address
      );
      expect(await dcvExchange.feeRecipientAddress()).to.equal(FEE_RECIPIENT);
      expect(await dcvExchange.platformPercentage()).to.equal(250);
    });
  });

  describe("Owner methods", () => {
    beforeEach(deploy);

    it("should update configuration when owner", async () => {
      await dcvExchange.updateConfiguration(
        contractAddress2.address,
        contractAddress3.address,
        contractAddress4.address,
        contractAddress5.address,
        500
      );

      expect(await dcvExchange.royaltiesProvider()).to.equal(
        contractAddress2.address
      );
      expect(await dcvExchange.royaltiesSigner()).to.equal(
        contractAddress3.address
      );
      expect(await dcvExchange.erc20PaymentToken()).to.equal(
        contractAddress4.address
      );
      expect(await dcvExchange.feeRecipientAddress()).to.equal(
        contractAddress5.address
      );
      expect(await dcvExchange.platformPercentage()).to.equal(500);
    });

    it("should fail to update configuration when not owner", async () => {
      await expect(
        dcvExchange
          .connect(royaltiesSigner)
          .updateConfiguration(
            contractAddress2.address,
            contractAddress3.address,
            contractAddress4.address,
            contractAddress5.address,
            500
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
