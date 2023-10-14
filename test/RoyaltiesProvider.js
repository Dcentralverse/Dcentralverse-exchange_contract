const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployRoyaltiesProvider,
  deployCollection,
} = require("./helpers/deploy");

const INVALID_CALLER = "InvalidCaller";
const FEE_OVER_THE_LIMIT = "FeeOverTheLimit";
const INVALID_ADDRESS = "InvalidAddress";
const ROYALTIES_SET_FOR_TOKEN = "RoyaltiesSetForToken";

describe("RoyaltiesProvider", function () {
  let royaltiesProviderContract, nftContract;
  let owner, randomCaller, contractAddress2;

  beforeEach(async () => {
    [owner, randomCaller, contractAddress2] = await ethers.getSigners();

    royaltiesProviderContract = await deployRoyaltiesProvider();

    nftContract = await deployCollection();
  });

  describe("deploy", () => {
    it("sets initial owner", async () => {
      expect(await royaltiesProviderContract.owner()).to.equal(owner.address);
    });
  });

  describe("setRoyaltiesForToken", () => {
    beforeEach(async () => {
      await royaltiesProviderContract.setExchangeAddress(owner.address);
    });

    it("sets royalties for token", async () => {
      const tx = await royaltiesProviderContract.setRoyaltiesForToken(
        nftContract.address,
        1,
        owner.address,
        500
      );

      await expect(tx)
        .to.emit(royaltiesProviderContract, ROYALTIES_SET_FOR_TOKEN)
        .withArgs(nftContract.address, 1, owner.address, 500);

      const royalty = await royaltiesProviderContract.royaltiesPerTokenId(
        nftContract.address,
        1
      );
      expect(royalty).to.deep.equal([owner.address, 500]);

      const feeAndRecipient =
        await royaltiesProviderContract.calculateRoyaltiesAndGetRecipient(
          nftContract.address,
          1,
          ethers.utils.parseEther("1")
        );
      expect(feeAndRecipient).to.deep.equal([
        owner.address,
        ethers.utils.parseEther("0.05"),
      ]);
    });

    it("should revert if caller is not exchange address", async () => {
      await expect(
        royaltiesProviderContract
          .connect(randomCaller)
          .setRoyaltiesForToken(nftContract.address, 1, owner.address, 500)
      ).to.be.revertedWithCustomError(
        royaltiesProviderContract,
        INVALID_CALLER
      );
    });

    it("should revert if fee is over the set limit of collection", async () => {
      await royaltiesProviderContract.setRoyaltiesLimitForCollection(
        nftContract.address,
        500
      );

      await expect(
        royaltiesProviderContract.setRoyaltiesForToken(
          nftContract.address,
          1,
          owner.address,
          501
        )
      ).to.be.revertedWithCustomError(
        royaltiesProviderContract,
        FEE_OVER_THE_LIMIT
      );
    });

    it("should revert if royalty recipient is zero address", async () => {
      await expect(
        royaltiesProviderContract.setRoyaltiesForToken(
          nftContract.address,
          1,
          ethers.constants.AddressZero,
          500
        )
      ).to.be.revertedWithCustomError(
        royaltiesProviderContract,
        INVALID_ADDRESS
      );
    });
  });

  describe("setExchangeAddress", () => {
    it("sets exchange address", async () => {
      await royaltiesProviderContract.setExchangeAddress(
        contractAddress2.address
      );

      expect(await royaltiesProviderContract.exchangeAddress()).to.equal(
        contractAddress2.address
      );
    });

    it("reverts if caller is not owner", async () => {
      await expect(
        royaltiesProviderContract
          .connect(randomCaller)
          .setExchangeAddress(contractAddress2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setRoyaltiesLimitForCollection", () => {
    it("sets limit for collection", async () => {
      const tx = await royaltiesProviderContract.setRoyaltiesLimitForCollection(
        nftContract.address,
        750
      );

      await expect(tx)
        .to.emit(royaltiesProviderContract, "NewRoyaltiesLimitForCollection")
        .withArgs(nftContract.address, 750);
    });

    it("reverts if new limit is invalid", async () => {
      await expect(
        royaltiesProviderContract.setRoyaltiesLimitForCollection(
          nftContract.address,
          10001
        )
      ).to.be.revertedWithCustomError(
        royaltiesProviderContract,
        FEE_OVER_THE_LIMIT
      );
    });

    it("reverts if caller is not owner", async () => {
      await expect(
        royaltiesProviderContract
          .connect(randomCaller)
          .setRoyaltiesLimitForCollection(nftContract.address, 750)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
