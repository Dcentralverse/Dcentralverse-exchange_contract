const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployDcvExchangeWithDeps,
  deployCollection,
} = require("../helpers/deploy");
const {
  getTypedMessage_sale,
  getTypedMessage_saleWithRoyalty,
  getTypedMessage_royaltyParameters,
} = require("../helpers/eip712");
const { FEE_RECIPIENT } = require("../helpers/constants");

const NONCE_USED = "NonceUsed";
const INVALID_CALLER = "InvalidCaller";
const UNSUFFICIENT_CURRENCY_SUPPLIED = "UnsufficientCurrencySupplied";
const INVALID_SIGNATURE = "InvalidSignature";
const SALE_SUCCESS = "SaleSuccess";
const UNAUTHORIZED_ROYALTY_CHANGE = "UnauthorizedRoyaltyChange";

describe("DcvSale", () => {
  let dcvExchange, nftContract, royaltiesProvider;

  let owner, user1, user2, royaltiesSigner, royaltiesRecipient;

  const RANDOM_SIGNATURE =
    "0xb09257ab12d450f9e0e090ead5f267b7f2e476595907f4fe761fcb26bef546e2422220fc070a4c087fac439db8e6c03a0e7ea31cd29850f504cf17a31cfe12831c";
  const ONE_ETHER = ethers.utils.parseEther("1");
  const ZERO_ONE_ETHER = ethers.utils.parseUnits("0.1");

  async function deploy() {
    [owner, user1, user2, royaltiesSigner, royaltiesRecipient] =
      await ethers.getSigners();

    const result = await deployDcvExchangeWithDeps(owner, royaltiesSigner);

    dcvExchange = result.dcvExchangeContract;
    royaltiesProvider = result.royaltiesProviderContract;

    nftContract = await deployCollection();

    await nftContract.mint(owner.address);
  }

  const getSaleSignature = async ({ signer = user1 }) => {
    await nftContract.mint(signer.address);
    await nftContract
      .connect(signer)
      .setApprovalForAll(dcvExchange.address, true);

    const typedMessage = getTypedMessage_sale({
      chainId: network.config.chainId,
      verifierContract: dcvExchange.address,
      nftContract: nftContract.address,
      price: ONE_ETHER,
    });

    const signature = await signer._signTypedData(
      typedMessage.domain,
      typedMessage.types,
      typedMessage.values
    );

    return signature;
  };

  const getSaleWithRoyaltySignature = async ({ signer = user1 }) => {
    await nftContract.mint(signer.address);
    await nftContract
      .connect(signer)
      .setApprovalForAll(dcvExchange.address, true);

    const typedMessage1 = getTypedMessage_saleWithRoyalty({
      chainId: network.config.chainId,
      verifierContract: dcvExchange.address,
      nftContract: nftContract.address,
      price: ONE_ETHER,
      royaltyRecipient: signer.address,
      royaltyPercentage: 500,
    });

    const sellerSignature = await signer._signTypedData(
      typedMessage1.domain,
      typedMessage1.types,
      typedMessage1.values
    );

    const typedMessage2 = getTypedMessage_royaltyParameters({
      chainId: network.config.chainId,
      verifierContract: dcvExchange.address,
      nftContract: nftContract.address,
      royaltyRecipient: signer.address,
      royaltyPercentage: 500,
    });

    const royaltySignature = await royaltiesSigner._signTypedData(
      typedMessage2.domain,
      typedMessage2.types,
      typedMessage2.values
    );

    return { sellerSignature, royaltySignature };
  };

  describe("Buy from sale", () => {
    beforeEach(async () => {
      await deploy();

      await royaltiesProvider.setExchangeAddress(owner.address);

      await royaltiesProvider.setRoyaltiesForToken(
        nftContract.address,
        2,
        royaltiesRecipient.address,
        500
      );
    });

    it("should succesfully buy from sale", async () => {
      const royaltiesRecipientBalance1 = await ethers.provider.getBalance(
        royaltiesRecipient.address
      );
      const feeBalance1 = await ethers.provider.getBalance(FEE_RECIPIENT);

      const signature = await getSaleSignature({});

      const user1Balance1 = await ethers.provider.getBalance(user1.address);

      const saleTx = await dcvExchange.connect(user2).buyFromSale(
        signature,
        {
          seller: user1.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 2,
          price: ONE_ETHER,
        },
        {
          value: ONE_ETHER,
        }
      );

      await expect(saleTx)
        .to.emit(dcvExchange, SALE_SUCCESS)
        .withArgs(
          nftContract.address,
          2,
          user1.address,
          user2.address,
          ONE_ETHER,
          ethers.utils.parseEther("0.025")
        );

      expect(await nftContract.ownerOf(2)).to.equal(user2.address);

      const user1Balance2 = await ethers.provider.getBalance(user1.address);
      expect(user1Balance2.sub(user1Balance1)).to.equal(
        ethers.utils.parseUnits("0.925")
      );

      const feeBalance2 = await ethers.provider.getBalance(FEE_RECIPIENT);
      expect(feeBalance2.sub(feeBalance1).toString()).to.equal(
        ethers.utils.parseUnits("0.025")
      );

      const royaltiesRecipientBalance2 = await ethers.provider.getBalance(
        royaltiesRecipient.address
      );
      expect(
        royaltiesRecipientBalance2.sub(royaltiesRecipientBalance1)
      ).to.equal(ethers.utils.parseUnits("0.05"));
    });

    it("should fail with sale cancelled", async () => {
      const signature = await getSaleSignature({});

      await dcvExchange.connect(user1).cancelNonce(1);

      await expect(
        dcvExchange.connect(user2).buyFromSale(
          signature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });

    it("should fail if caller is same as seller", async () => {
      await expect(
        dcvExchange.buyFromSale(RANDOM_SIGNATURE, {
          seller: owner.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 1,
          price: ZERO_ONE_ETHER,
        })
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_CALLER);
    });

    it("should fail with price not correct (too low provided)", async () => {
      const signature = await getSaleSignature({});

      await expect(
        dcvExchange.connect(user2).buyFromSale(
          signature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
          },
          {
            value: ZERO_ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(
        dcvExchange,
        UNSUFFICIENT_CURRENCY_SUPPLIED
      );
    });

    it("should fail with invalid signature", async () => {
      await expect(
        dcvExchange.connect(user2).buyFromSale(
          RANDOM_SIGNATURE,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_SIGNATURE);
    });

    it("should fail to buy from same sale twice", async () => {
      const signature = await getSaleSignature({});

      await dcvExchange.connect(user2).buyFromSale(
        signature,
        {
          seller: user1.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 2,
          price: ONE_ETHER,
        },
        {
          value: ONE_ETHER,
        }
      );

      await nftContract
        .connect(user2)
        .transferFrom(user2.address, user1.address, 2);

      await expect(
        dcvExchange.connect(user2).buyFromSale(
          signature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });
  });

  describe("Buy from sale with royalty", () => {
    beforeEach(async () => {
      await deploy();

      await royaltiesProvider.setExchangeAddress(dcvExchange.address);
    });

    it("should successfully buy from sale and set royalty", async () => {
      const feeBalance1 = await ethers.provider.getBalance(FEE_RECIPIENT);

      const { sellerSignature, royaltySignature } =
        await getSaleWithRoyaltySignature({});

      const user1Balance1 = await ethers.provider.getBalance(user1.address);

      let royalty = await royaltiesProvider.calculateRoyaltiesAndGetRecipient(
        nftContract.address,
        2,
        ONE_ETHER
      );
      expect(royalty).to.deep.equal([ethers.constants.AddressZero, 0]);

      const saleTx = await dcvExchange.connect(user2).buyFromSaleWithRoyalty(
        sellerSignature,
        royaltySignature,
        {
          seller: user1.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 2,
          price: ONE_ETHER,
          royaltyRecipient: user1.address,
          royaltyPercentage: 500,
        },
        {
          value: ONE_ETHER,
        }
      );

      await expect(saleTx)
        .to.emit(dcvExchange, SALE_SUCCESS)
        .withArgs(
          nftContract.address,
          2,
          user1.address,
          user2.address,
          ONE_ETHER,
          ethers.utils.parseEther("0.025")
        );

      expect(await nftContract.ownerOf(2)).to.equal(user2.address);

      const user1Balance2 = await ethers.provider.getBalance(user1.address);
      expect(user1Balance2.sub(user1Balance1)).to.equal(
        ethers.utils.parseUnits("0.975")
      );

      const feeBalance2 = await ethers.provider.getBalance(FEE_RECIPIENT);
      expect(feeBalance2.sub(feeBalance1).toString()).to.equal(
        ethers.utils.parseUnits("0.025")
      );

      royalty = await royaltiesProvider.calculateRoyaltiesAndGetRecipient(
        nftContract.address,
        2,
        ONE_ETHER
      );
      expect(royalty).to.deep.equal([
        user1.address,
        ethers.utils.parseEther("0.05"),
      ]);
    });

    it("should fail with sale cancelled", async () => {
      const { sellerSignature, royaltySignature } =
        await getSaleWithRoyaltySignature({});

      await dcvExchange.connect(user1).cancelNonce(1);

      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          sellerSignature,
          royaltySignature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });

    it("should fail if caller is same as seller", async () => {
      await expect(
        dcvExchange.buyFromSaleWithRoyalty(RANDOM_SIGNATURE, RANDOM_SIGNATURE, {
          seller: owner.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 1,
          price: ZERO_ONE_ETHER,
          royaltyRecipient: user1.address,
          royaltyPercentage: 500,
        })
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_CALLER);
    });

    it("should fail if seller is not royalty recipient", async () => {
      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          RANDOM_SIGNATURE,
          RANDOM_SIGNATURE,
          {
            seller: owner.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, UNAUTHORIZED_ROYALTY_CHANGE);
    });

    it("should fail with price not correct (too low provided)", async () => {
      const { sellerSignature, royaltySignature } =
        await getSaleWithRoyaltySignature({});

      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          sellerSignature,
          royaltySignature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ZERO_ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(
        dcvExchange,
        UNSUFFICIENT_CURRENCY_SUPPLIED
      );
    });

    it("should fail with invalid seller signature", async () => {
      const { royaltySignature } = await getSaleWithRoyaltySignature({});

      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          RANDOM_SIGNATURE,
          royaltySignature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_SIGNATURE);
    });

    it("should fail with invalid royalty signature", async () => {
      const { sellerSignature } = await getSaleWithRoyaltySignature({});

      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          sellerSignature,
          RANDOM_SIGNATURE,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_SIGNATURE);
    });

    it("should fail to buy from same sale twice", async () => {
      const { sellerSignature, royaltySignature } =
        await getSaleWithRoyaltySignature({});

      await dcvExchange.connect(user2).buyFromSaleWithRoyalty(
        sellerSignature,
        royaltySignature,
        {
          seller: user1.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 2,
          price: ONE_ETHER,
          royaltyRecipient: user1.address,
          royaltyPercentage: 500,
        },
        {
          value: ONE_ETHER,
        }
      );

      await nftContract
        .connect(user2)
        .transferFrom(user2.address, user1.address, 2);

      await expect(
        dcvExchange.connect(user2).buyFromSaleWithRoyalty(
          sellerSignature,
          royaltySignature,
          {
            seller: user1.address,
            orderNonce: 1,
            nftContract: nftContract.address,
            tokenId: 2,
            price: ONE_ETHER,
            royaltyRecipient: user1.address,
            royaltyPercentage: 500,
          },
          {
            value: ONE_ETHER,
          }
        )
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });
  });
});
