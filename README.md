# Dcentralverse Exchange

Dcentralverse Exchange is a decentralized platform for facilitating the sale of Non-Fungible Tokens (NFTs).

## DcvSale

These functions will be called when a buyer wants to buy an NFT which seller has listed for sale.

Function `buyFromSale` is used when seller of that NFT is not original minter (doesn't have rights to change royalty parameters) or if seller is original minter but he wants to sell NFT without changing royalty parameters.

Function `buyFromSaleWithRoyalty` is used only when seller of that NFT is original minter and he wants to sell NFT with royalty parameters being set.

### 1. buyFromSale

Seller wants to sell NFT:

1. Seller signs the message that authorizes the sale.
2. Save the seller signature in the database with sale details.

Buyer wants to buy this NFT:

1. Buyer calls `buyFromSale` function with the seller signature and sale details. Buyer must attach enough ETH to cover the price of the NFT.

```solidity
function buyFromSale(
    bytes calldata signature,
    Sale calldata sale
) external payable;
```

Parameters:

| Name | Type | Description |
|---|---|---|
| signature | bytes | Signature of the seller that authorizes the sale. |
| sale | Sale | Sale details. |

`Sale` struct:

| Name | Type | Description |
|---|---|---|
| seller | address | Address of NFT owner that is selling NFT. |
| orderNonce | uint256 | Unique seller identifier for this order. |
| nftContract | address | Address of NFT contract. |
| tokenId | uint256 | ID of the NFT. |
| price | uint256 | Price of the NFT.

Example of using `orderNonce`: start with 0 and increment by 1 for each new sale for that seller. Keep track of `orderNonce` for each seller in the database.

To get typed message that needs to be signed by seller, use `getTypedMessage_sale` function that is located in test/helpers/eip712.js.
These are fields you need to pass to get typed message:
- `chainId` (ID of chain, for example Polygon Mainnet is 137)
- `verifierContract` (address of DcvExchange contract)
- `orderNonce`
- `nftContract`
- `tokenId`
- `price`

When seller signs this typed message, you get signature that buyer needs to pass to `buyFromSale` function with other sale details (`Sale` struct).

### 2. buyFromSaleWithRoyalty

Seller wants to sell NFT:

1. Seller chooses royalty percentage, seller's address will be royalty recipient.
2. Dcv team checks that royalty recipient is original minter of that NFT, and that percentage is valid. For example: 5% is 500, maximum is 10000 (100%).
3. If everything is valid, Dcv team signs royalty parameters for that NFT.
4. Seller signs the message that authorizes the sale.
5. Save both signatures (team and seller) in the database with sale details.

Buyer wants to buy this NFT:

1. Buyer calls `buyFromSaleWithRoyalty` function with both signatures and sale details. Buyer must attach enough ETH to cover the price of the NFT.

```solidity
function buyFromSaleWithRoyalty(
    bytes calldata sellerSignature,
    bytes calldata royaltySignature,
    SaleWithRoyalty calldata sale
) external payable;
```

Parameters:

| Name | Type | Description |
|---|---|---|
| sellerSignature | bytes | Signature of the seller that authorizes the sale. |
| royaltySignature | bytes | Signature of the Dcv team that determines royalty setup. |
| sale | SaleWithRoyalty | Sale details. |

`SaleWithRoyalty` struct:

| Name | Type | Description |
|---|---|---|
| seller | address | Address of NFT owner that is selling NFT. |
| orderNonce | uint256 | Unique identifier for this order and seller. |
| nftContract | address | Address of NFT contract. |
| tokenId | uint256 | ID of the NFT. |
| price | uint256 | Price of the NFT. |
| royaltyRecipient | address | Address to receive royalty payments. |
| royaltyPercentage | uint256 | Percentage to be paid as royalties. |

Example of using `orderNonce`: start with 0 and increment by 1 for each new sale for that seller. Keep track of `orderNonce` for each seller in the database.

To get typed message that needs to be signed by Dcv team, use `getTypedMessage_royaltyParameters` function that is located in test/helpers/eip712.js.
These are fields you need to pass to get typed message:
- `chainId` (ID of chain, for example Polygon Mainnet is 137)
- `verifierContract` (address of DcvExchange contract)
- `nftContract`
- `tokenId`
- `royaltyRecipient`
- `royaltyPercentage`

To get typed message that needs to be signed by seller, use `getTypedMessage_saleWithRoyalty` function that is located in test/helpers/eip712.js.
These are fields you need to pass to get typed message:
- `chainId` (ID of chain, for example Polygon Mainnet is 137)
- `verifierContract` (address of DcvExchange contract)
- `orderNonce`
- `nftContract`
- `tokenId`
- `price`
- `royaltyRecipient`
- `royaltyPercentage`

Buyer needs to pass both signatures to `buyFromSaleWithRoyalty` function with other sale details (`SaleWithRoyalty` struct).


## DcvOffer

This function will be called when a bidder wants to create offer for NFT.

### 1. acceptOffer

Bidder wants to create offer for NFT:

1. Bidder signs the message that authorizes the offer.
2. Save the bidder signature in the database with offer details.

Seller wants to accept this offer for NFT:

1. Seller calls `acceptOffer` function with the bidder signature and offer details.

```solidity
function acceptOffer(
    bytes calldata signature,
    Offer calldata offer
) external;
```

Parameters:

| Name | Type | Description |
|---|---|---|
| signature | bytes | Signature of the bidder that authorizes the offer. |
| offer | Offer | Offer details. |

`Offer` struct:

| Name | Type | Description |
|---|---|---|
| bidder | address | Address of bidder that is creating offer for NFT. |
| orderNonce | uint256 | Unique bidder identifier for this order. |
| nftContract | address | Address of NFT contract. |
| tokenId | uint256 | ID of the NFT. |
| price | uint256 | Offer price for the NFT. |
| expiresAt | uint256 | Timestamp when offer expires. |

To get typed message that needs to be signed by bidder, use `getTypedMessage_offer` function that is located in test/helpers/eip712.js.
These are fields you need to pass to get typed message:
- `chainId` (ID of chain, for example Polygon Mainnet is 137)
- `verifierContract` (address of DcvExchange contract)
- `orderNonce`
- `nftContract`
- `tokenId`
- `price`
- `expiresAt`

When bidder signs this typed message, you get signature that seller needs to pass to `acceptOffer` function with other offer details (`Offer` struct).

## DcvNonceManager

Example of using `orderNonce` in sales/offers: start with 0 and increment by 1 for each new sale/offer for that user. Keep track of single `orderNonce` for each user in the database. So there should not be two sales/offers with the same `orderNonce` for the same user. Two sales/offers can have the same `orderNonce` if they are created by different users.

This function will be called when a seller wants to cancel sale or a bidder wants to cancel offer. This function will be called directly from seller or bidder. If user wants to cancel sale/offer, he needs to pass `orderNonce` of that sale/offer to `cancelNonce` function.

### cancelNonce

```solidity
function cancelNonce(uint256 nonce) external;
```

Parameters:
| Name | Type | Description |
|---|---|---|
| nonce | uint256 | Nonce that will be cancelled for caller. |
