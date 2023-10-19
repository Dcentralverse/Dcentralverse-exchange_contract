// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract DcvFundsDistributor {
    address public feeRecipientAddress;

    error FundsTransferFailed();

    function _updateDistributorConfiguration(
        address _feeRecipientAddress
    ) internal {
        feeRecipientAddress = _feeRecipientAddress;
    }

    function _distributeEtherFunds(
        uint256 price,
        uint256 royaltyFee,
        address royaltyRecipient,
        uint256 platformFee,
        address seller
    ) internal {
        uint256 sellerProceeds = price - platformFee - royaltyFee;

        if (royaltyFee > 0) {
            _transferEther(royaltyRecipient, royaltyFee);
        }

        if (platformFee > 0) {
            _transferEther(feeRecipientAddress, platformFee);
        }

        _transferEther(seller, sellerProceeds);
    }

    function _distributeErc20Funds(
        IERC20 paymentErc20TokenAddress,
        uint256 price,
        uint256 royaltyFee,
        address royaltyRecipient,
        uint256 platformFee,
        address seller,
        address buyer
    ) internal {
        uint256 sellerProceeds = price - platformFee - royaltyFee;

        if (royaltyFee > 0) {
            _transferErc20(
                paymentErc20TokenAddress,
                buyer,
                royaltyRecipient,
                royaltyFee
            );
        }

        if (platformFee > 0) {
            _transferErc20(
                paymentErc20TokenAddress,
                buyer,
                feeRecipientAddress,
                platformFee
            );
        }

        _transferErc20(paymentErc20TokenAddress, buyer, seller, sellerProceeds);
    }

    function _transferEther(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert FundsTransferFailed();
    }

    function _transferErc20(
        IERC20 paymentErc20TokenAddress,
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        bool success = paymentErc20TokenAddress.transferFrom(
            sender,
            recipient,
            amount
        );
        if (!success) revert FundsTransferFailed();
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
