const { ethers } = require("hardhat");

const keccak256 = (value) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(value));

const getTypedMessage_offer = ({
  chainId,
  verifierContract,
  orderNonce,
  nftContract,
  tokenId,
  price,
  expiresAt,
}) => {
  const domain = {
    name: "Dcentralverse Exchange",
    version: "1",
    chainId: chainId,
    verifyingContract: verifierContract,
    salt: keccak256("Dcentralverse Exchange Salt"),
  };

  const types = {
    Offer: [
      { name: "orderNonce", type: "uint256" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
    ],
  };

  const values = {
    orderNonce: orderNonce,
    nftContract: nftContract,
    tokenId: tokenId,
    price: price.toString(),
    expiresAt: expiresAt,
  };

  return { domain, types, values };
};

const getTypedMessage_sale = ({
  chainId,
  verifierContract,
  orderNonce,
  nftContract,
  tokenId,
  price,
}) => {
  const domain = {
    name: "Dcentralverse Exchange",
    version: "1",
    chainId: chainId,
    verifyingContract: verifierContract,
    salt: keccak256("Dcentralverse Exchange Salt"),
  };

  const types = {
    Sale: [
      { name: "orderNonce", type: "uint256" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
  };

  const values = {
    orderNonce: orderNonce,
    nftContract: nftContract,
    tokenId: tokenId,
    price: price.toString(),
  };

  return { domain, types, values };
};

const getTypedMessage_saleWithRoyalty = ({
  chainId,
  verifierContract,
  orderNonce,
  nftContract,
  tokenId,
  price,
  royaltyRecipient,
  royaltyPercentage,
}) => {
  const domain = {
    name: "Dcentralverse Exchange",
    version: "1",
    chainId: chainId,
    verifyingContract: verifierContract,
    salt: keccak256("Dcentralverse Exchange Salt"),
  };

  const types = {
    SaleWithRoyalty: [
      { name: "orderNonce", type: "uint256" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "royaltyRecipient", type: "address" },
      { name: "royaltyPercentage", type: "uint256" },
    ],
  };

  const values = {
    orderNonce: orderNonce,
    nftContract: nftContract,
    tokenId: tokenId,
    price: price.toString(),
    royaltyRecipient: royaltyRecipient,
    royaltyPercentage: royaltyPercentage,
  };

  return { domain, types, values };
};

const getTypedMessage_royaltyParameters = ({
  chainId,
  verifierContract,
  nftContract,
  tokenId,
  royaltyRecipient,
  royaltyPercentage,
}) => {
  const domain = {
    name: "Dcentralverse Exchange",
    version: "1",
    chainId: chainId,
    verifyingContract: verifierContract,
    salt: keccak256("Dcentralverse Exchange Salt"),
  };

  const types = {
    RoyaltyParameters: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "royaltyRecipient", type: "address" },
      { name: "royaltyPercentage", type: "uint256" },
    ],
  };

  const values = {
    nftContract: nftContract,
    tokenId: tokenId,
    royaltyRecipient: royaltyRecipient,
    royaltyPercentage: royaltyPercentage,
  };

  return { domain, types, values };
};

module.exports = {
  getTypedMessage_offer,
  getTypedMessage_sale,
  getTypedMessage_saleWithRoyalty,
  getTypedMessage_royaltyParameters,
};
