// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../royalties/interface/IRoyaltiesProvider.sol";

abstract contract DcvExchangeCore {
    uint256 internal constant MAX_FEE = 10_000;
    IRoyaltiesProvider public royaltiesProvider;
    IERC20 public erc20PaymentToken;
    uint256 public platformPercentage;
    address public royaltiesSigner;

    error InvalidCaller();
    error InvalidAddress();
    error InvalidPercentage();
    error UnsufficientCurrencySupplied();
    error UnauthorizedRoyaltyChange();

    function _updateExchangeConfiguration(
        address _royaltiesProvider,
        address _royaltiesSigner,
        address _erc20PaymentToken,
        uint256 _platformPercentage
    ) internal {
        if (
            _royaltiesProvider == address(0) ||
            _royaltiesSigner == address(0) ||
            _erc20PaymentToken == address(0)
        ) revert InvalidAddress();
        if (_platformPercentage > MAX_FEE) revert InvalidPercentage();

        royaltiesProvider = IRoyaltiesProvider(_royaltiesProvider);
        royaltiesSigner = _royaltiesSigner;
        erc20PaymentToken = IERC20(_erc20PaymentToken);
        platformPercentage = _platformPercentage;
    }

    function _calculateFeeAndSetRoyalty(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        address royaltyRecipient,
        uint256 royaltyPercentage
    ) internal returns (uint256 platformFee) {
        royaltiesProvider.setRoyaltiesForToken(
            nftContract,
            tokenId,
            royaltyRecipient,
            royaltyPercentage
        );

        platformFee = _calculateCut(platformPercentage, price);
    }

    function _calculateFees(
        address nftContract,
        uint256 tokenId,
        uint256 price
    )
        internal
        view
        returns (
            uint256 platformFee,
            address royaltyRecipient,
            uint256 royaltyFee
        )
    {
        platformFee = _calculateCut(platformPercentage, price);

        (royaltyRecipient, royaltyFee) = royaltiesProvider
            .calculateRoyaltiesAndGetRecipient(nftContract, tokenId, price);
    }

    function _requireSufficientEtherSupplied(
        uint256 sufficientAmount
    ) internal view {
        if (msg.value < sufficientAmount) {
            revert UnsufficientCurrencySupplied();
        }
    }

    function _calculateCut(
        uint256 fee,
        uint256 amount
    ) internal pure returns (uint256) {
        return (amount * fee) / MAX_FEE;
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
