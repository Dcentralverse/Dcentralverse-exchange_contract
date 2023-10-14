const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployDcvExchangeWithDeps,
  deployCollection,
  deployErc20Token,
} = require("../helpers/deploy");
const { FEE_RECIPIENT } = require("../helpers/constants");
const { getTypedMessage_offer } = require("../helpers/eip712");

const OFFER_ACCEPTED = "OfferAccepted";
const OFFER_EXPIRED = "OfferExpired";
const NONCE_USED = "NonceUsed";
const INVALID_SIGNATURE = "InvalidSignature";
const INVALID_CALLER = "InvalidCaller";

describe("DcvOffer", () => {
  let dcvExchange, erc20Token, nftContract, royaltiesProvider;

  let owner, user1, user2, royaltiesRecipient, royaltiesSigner;

  const getOfferSignature = async (signer, tokenId, price, expiresAt) => {
    const typedMessage = getTypedMessage_offer({
      chainId: network.config.chainId,
      verifierContract: dcvExchange.address,
      orderNonce: 1,
      nftContract: nftContract.address,
      tokenId: tokenId,
      price: price,
      expiresAt: expiresAt,
    });

    const signature = await signer._signTypedData(
      typedMessage.domain,
      typedMessage.types,
      typedMessage.values
    );

    return signature;
  };

  async function deploy() {
    [owner, user1, user2, royaltiesRecipient, royaltiesSigner] =
      await ethers.getSigners();

    const result = await deployDcvExchangeWithDeps(owner, royaltiesSigner);

    dcvExchange = result.dcvExchangeContract;
    erc20Token = result.erc20TokenContract;
    royaltiesProvider = result.royaltiesProviderContract;

    nftContract = await deployCollection();

    await nftContract.mint(user1.address);
    await nftContract.mint(user1.address);
    await nftContract.mint(user1.address);
    await nftContract.mint(user1.address);

    await nftContract
      .connect(user1)
      .setApprovalForAll(dcvExchange.address, true);

    await royaltiesProvider.setExchangeAddress(owner.address);

    await royaltiesProvider.setRoyaltiesForToken(
      nftContract.address,
      4,
      royaltiesRecipient.address,
      500
    );
  }

  describe("Accept NFT offer", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("should be able to accept offer", async () => {
      const royaltiesRecipientBalance1 = await erc20Token.balanceOf(
        royaltiesRecipient.address
      );
      const feeBalance1 = await erc20Token.balanceOf(FEE_RECIPIENT);

      await erc20Token.transfer(user2.address, ethers.utils.parseUnits("0.5"));

      await erc20Token
        .connect(user2)
        .approve(dcvExchange.address, ethers.utils.parseUnits("0.5"));

      const signature = await getOfferSignature(
        user2,
        4,
        ethers.utils.parseUnits("0.5"),
        2000994705
      );

      const user1Balance1 = await erc20Token.balanceOf(user1.address);

      const acceptOfferTx = await dcvExchange
        .connect(user1)
        .acceptOffer(signature, {
          bidder: user2.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.5"),
          expiresAt: 2000994705,
        });

      await expect(acceptOfferTx)
        .to.emit(dcvExchange, OFFER_ACCEPTED)
        .withArgs(
          nftContract.address,
          4,
          user2.address,
          user1.address,
          ethers.utils.parseUnits("0.5"),
          ethers.utils.parseUnits("0.0125")
        );

      expect(await nftContract.ownerOf(4)).to.equal(user2.address);

      const user1Balance2 = await erc20Token.balanceOf(user1.address);
      expect(user1Balance2.sub(user1Balance1)).to.equal(
        ethers.utils.parseUnits("0.4625")
      );

      const feeBalance2 = await erc20Token.balanceOf(FEE_RECIPIENT);
      expect(feeBalance2.sub(feeBalance1).toString()).to.equal(
        ethers.utils.parseUnits("0.0125")
      );

      const royaltiesRecipientBalance2 = await erc20Token.balanceOf(
        royaltiesRecipient.address
      );
      expect(
        royaltiesRecipientBalance2.sub(royaltiesRecipientBalance1)
      ).to.equal(ethers.utils.parseUnits("0.025"));
    });

    it("should fail to accept offer that is expired", async () => {
      const signature = await getOfferSignature(
        user2,
        4,
        ethers.utils.parseUnits("0.5"),
        1658060224
      );

      await expect(
        dcvExchange.connect(user1).acceptOffer(signature, {
          bidder: user2.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.5"),
          expiresAt: 1658060224,
        })
      ).to.be.revertedWithCustomError(dcvExchange, OFFER_EXPIRED);
    });

    it("should fail to accept offer that is cancelled", async () => {
      const signature = await getOfferSignature(
        user2,
        4,
        ethers.utils.parseUnits("0.5"),
        2000994705
      );

      await dcvExchange.connect(user2).cancelNonce(1);

      await expect(
        dcvExchange.connect(user1).acceptOffer(signature, {
          bidder: user2.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.5"),
          expiresAt: 2000994705,
        })
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });

    it("should fail to accept offer that is already accepted", async () => {
      await erc20Token.transfer(user2.address, ethers.utils.parseUnits("0.5"));

      await erc20Token
        .connect(user2)
        .approve(dcvExchange.address, ethers.utils.parseUnits("0.5"));

      const signature = await getOfferSignature(
        user2,
        4,
        ethers.utils.parseUnits("0.5"),
        2000994705
      );

      await dcvExchange.connect(user1).acceptOffer(signature, {
        bidder: user2.address,
        orderNonce: 1,
        nftContract: nftContract.address,
        tokenId: 4,
        price: ethers.utils.parseUnits("0.5"),
        expiresAt: 2000994705,
      });

      await expect(
        dcvExchange.connect(user1).acceptOffer(signature, {
          bidder: user2.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.5"),
          expiresAt: 2000994705,
        })
      ).to.be.revertedWithCustomError(dcvExchange, NONCE_USED);
    });

    it("should fail to accept offer that is not signed by bidder", async () => {
      const signature = await getOfferSignature(
        user2,
        4,
        ethers.utils.parseUnits("0.5"),
        2000994705
      );

      await expect(
        dcvExchange.connect(user1).acceptOffer(signature, {
          bidder: user2.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.715"), // price is changed
          expiresAt: 2000994705,
        })
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_SIGNATURE);
    });

    it("should fail to accept offer if caller is same as bidder", async () => {
      const signature = await getOfferSignature(
        user1,
        4,
        ethers.utils.parseUnits("0.5"),
        2000994705
      );

      await expect(
        dcvExchange.connect(user1).acceptOffer(signature, {
          bidder: user1.address,
          orderNonce: 1,
          nftContract: nftContract.address,
          tokenId: 4,
          price: ethers.utils.parseUnits("0.5"),
          expiresAt: 2000994705,
        })
      ).to.be.revertedWithCustomError(dcvExchange, INVALID_CALLER);
    });
  });
});
