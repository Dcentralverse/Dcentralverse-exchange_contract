// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./DcvExchangeCore.sol";
import "./DcvFundsDistributor.sol";
import "./DcvEIP712.sol";
import "./DcvNonceManager.sol";

abstract contract DcvOffer is
    ReentrancyGuardUpgradeable,
    DcvExchangeCore,
    DcvFundsDistributor,
    DcvEIP712,
    DcvNonceManager
{
    using ECDSA for bytes32;

    bytes32 private constant OFFER_TYPEHASH =
        keccak256(
            "Offer(uint256 orderNonce,address nftContract,uint256 tokenId,uint256 price,uint256 expiresAt)"
        );

    struct Offer {
        address bidder;
        uint256 orderNonce;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 expiresAt;
    }

    event OfferAccepted(
        address indexed nftContract,
        uint256 indexed tokenId,
        address bidder,
        address indexed seller,
        uint256 price,
        uint256 platformFee
    );

    error OfferExpired();

    function acceptOffer(
        bytes calldata signature,
        Offer calldata offer
    ) external nonReentrant {
        if (block.timestamp > offer.expiresAt) revert OfferExpired();
        if (offer.bidder == msg.sender) revert InvalidCaller();

        _verifySignature(signature, offer);

        _invalidateNonce(offer.bidder, offer.orderNonce);

        _acceptOffer(offer);
    }

    function _acceptOffer(Offer calldata offer) internal {
        (
            uint256 platformFee,
            address royaltyRecipient,
            uint256 royaltyFee
        ) = _calculateFees(offer.nftContract, offer.tokenId, offer.price);

        IERC721(offer.nftContract).transferFrom(
            msg.sender,
            offer.bidder,
            offer.tokenId
        );

        _distributeErc20Funds(
            erc20PaymentToken,
            offer.price,
            royaltyFee,
            royaltyRecipient,
            platformFee,
            msg.sender,
            offer.bidder
        );

        emit OfferAccepted(
            offer.nftContract,
            offer.tokenId,
            offer.bidder,
            msg.sender,
            offer.price,
            platformFee
        );
    }

    function _verifySignature(
        bytes calldata signature,
        Offer calldata offer
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _buildDomainSeparator(),
                keccak256(
                    abi.encode(
                        OFFER_TYPEHASH,
                        offer.orderNonce,
                        offer.nftContract,
                        offer.tokenId,
                        offer.price,
                        offer.expiresAt
                    )
                )
            )
        );

        if (digest.recover(signature) != offer.bidder) {
            revert InvalidSignature();
        }
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
