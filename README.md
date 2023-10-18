# Dcentralverse Exchange

Dcentralverse Exchange is a decentralized platform for facilitating the sale of Non-Fungible Tokens (NFTs).

## DcvSale

### 1. buyFromSale

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
| orderNonce | uint256 | Unique identifier for this order and seller. |
| nftContract | address | Address of NFT contract. |
| tokenId | uint256 | ID of the NFT. |
| price | uint256 | Price of the NFT. |

### 2. buyFromSaleWithRoyalty

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
| royaltySignature | bytes | Signature of the seller that authorizes the sale. |
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


## DcvOffer

### acceptOffer

```solidity
function acceptOffer(
    bytes calldata signature,
    Offer calldata offer
) external;
```