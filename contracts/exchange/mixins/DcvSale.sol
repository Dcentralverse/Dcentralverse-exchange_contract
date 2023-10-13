// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./DcvExchangeCore.sol";
import "./DcvFundsDistributor.sol";
import "./DcvEIP712.sol";
import "./DcvNonceManager.sol";

abstract contract DcvSale is
    ReentrancyGuardUpgradeable,
    DcvExchangeCore,
    DcvFundsDistributor,
    DcvEIP712,
    DcvNonceManager
{
    using ECDSA for bytes32;

    bytes32 private constant SALE_TYPEHASH =
        keccak256(
            "Sale(uint256 orderNonce,address nftContract,uint256 tokenId,uint256 price)"
        );
    bytes32 private constant SALE_WITH_ROYALTY_TYPEHASH =
        keccak256(
            "SaleWithRoyalty(uint256 orderNonce,address nftContract,uint256 tokenId,uint256 price,address royaltyRecipient,uint256 royaltyPercentage)"
        );
    bytes32 private constant ROYALTY_PARAMETERS_TYPEHASH =
        keccak256(
            "RoyaltyParameters(address nftContract,uint256 tokenId,address royaltyRecipient,uint256 royaltyPercentage)"
        );

    struct Sale {
        address seller;
        uint256 orderNonce;
        address nftContract;
        uint256 tokenId;
        uint256 price;
    }

    struct SaleWithRoyalty {
        address seller;
        uint256 orderNonce;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        address royaltyRecipient;
        uint256 royaltyPercentage;
    }

    event SaleSuccess();

    function buyFromSale(
        bytes calldata signature,
        Sale calldata sale
    ) external payable nonReentrant {
        if (sale.seller == msg.sender) revert InvalidCaller();

        _verifySaleSignature(signature, sale);

        _requireSufficientEtherSupplied(sale.price);

        _invalidateNonce(sale.seller, sale.orderNonce);

        (
            uint256 platformFee,
            address royaltyRecipient,
            uint256 royaltyFee
        ) = _calculateFees(sale.nftContract, sale.tokenId, sale.price);

        _finalizeSale(
            sale.nftContract,
            sale.tokenId,
            sale.seller,
            sale.price,
            royaltyRecipient,
            platformFee,
            royaltyFee
        );
    }

    function buyFromSaleWithRoyalty(
        bytes calldata sellerSignature,
        bytes calldata royaltySignature,
        SaleWithRoyalty calldata sale
    ) external payable nonReentrant {
        if (sale.seller == msg.sender || sale.seller != sale.royaltyRecipient)
            revert InvalidCaller();

        _verifySaleWithRoyaltySignature(
            sellerSignature,
            royaltySignature,
            sale
        );

        _requireSufficientEtherSupplied(sale.price);

        _invalidateNonce(sale.seller, sale.orderNonce);

        (uint256 platformFee, uint256 royaltyFee) = _calculateFeesAndSetRoyalty(
            sale.nftContract,
            sale.tokenId,
            sale.price,
            sale.royaltyRecipient,
            sale.royaltyPercentage
        );

        _finalizeSale(
            sale.nftContract,
            sale.tokenId,
            sale.seller,
            sale.price,
            sale.royaltyRecipient,
            platformFee,
            royaltyFee
        );
    }

    function _finalizeSale(
        address nftContract,
        uint256 tokenId,
        address seller,
        uint256 price,
        address royaltyRecipient,
        uint256 platformFee,
        uint256 royaltyFee
    ) internal {
        IERC721(nftContract).transferFrom(seller, msg.sender, tokenId);

        _distributeEtherFunds(
            price,
            royaltyFee,
            royaltyRecipient,
            platformFee,
            seller
        );

        emit SaleSuccess();
    }

    function _verifySaleSignature(
        bytes calldata signature,
        Sale calldata sale
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _buildDomainSeparator(),
                keccak256(
                    abi.encode(
                        SALE_TYPEHASH,
                        sale.orderNonce,
                        sale.nftContract,
                        sale.tokenId,
                        sale.price
                    )
                )
            )
        );

        if (digest.recover(signature) != sale.seller) {
            revert InvalidSignature();
        }
    }

    function _verifySaleWithRoyaltySignature(
        bytes calldata sellerSignature,
        bytes calldata royaltySignature,
        SaleWithRoyalty calldata sale
    ) internal view {
        _verifyRoyaltyParameters(royaltySignature, sale);

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _buildDomainSeparator(),
                keccak256(
                    abi.encode(
                        SALE_WITH_ROYALTY_TYPEHASH,
                        sale.orderNonce,
                        sale.nftContract,
                        sale.tokenId,
                        sale.price,
                        sale.royaltyRecipient,
                        sale.royaltyPercentage
                    )
                )
            )
        );

        if (digest.recover(sellerSignature) != sale.seller) {
            revert InvalidSignature();
        }
    }

    function _verifyRoyaltyParameters(
        bytes calldata royaltySignature,
        SaleWithRoyalty calldata sale
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                _buildDomainSeparator(),
                keccak256(
                    abi.encode(
                        ROYALTY_PARAMETERS_TYPEHASH,
                        sale.nftContract,
                        sale.tokenId,
                        sale.royaltyRecipient,
                        sale.royaltyPercentage
                    )
                )
            )
        );

        if (digest.recover(royaltySignature) != royaltiesSigner) {
            revert InvalidSignature();
        }
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
