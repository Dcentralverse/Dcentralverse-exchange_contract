// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./mixins/DcvSale.sol";
import "./mixins/DcvOffer.sol";

contract DcvExchange is DcvSale, DcvOffer, OwnableUpgradeable {
    /**
     * @notice Initialized Dcentralverse exchange contract
     * @dev Only called once
     * @param _royaltiesProvider - royalties provider contract
     * @param _royaltiesSigner - authorized address to sign royalty parameters
     * @param _erc20PaymentToken - ERC20 token that will be used for payments
     * @param _feeRecipientAddress - address to receive exchange fees
     * @param _platformPercentage - platform fee percentage
     */
    function __DcvExchange_init(
        address _royaltiesProvider,
        address _royaltiesSigner,
        address _erc20PaymentToken,
        address _feeRecipientAddress,
        uint256 _platformPercentage
    ) external initializer {
        __Ownable_init_unchained();
        __ReentrancyGuard_init_unchained();

        _updateDistributorConfiguration(_feeRecipientAddress);
        _updateExchangeConfiguration(
            _royaltiesProvider,
            _royaltiesSigner,
            _erc20PaymentToken,
            _platformPercentage
        );
    }

    /**
     * @notice Updated contract internal configuration, callable by exchange owner
     * @param _royaltiesProvider - royalties provider contract
     * @param _royaltiesSigner - authorized address to sign royalty parameters
     * @param _erc20PaymentToken - ERC20 token that will be used for payments
     * @param _feeRecipientAddress - address to receive exchange fees
     * @param _platformPercentage - platform fee percentage
     */
    function updateConfiguration(
        address _royaltiesProvider,
        address _royaltiesSigner,
        address _erc20PaymentToken,
        address _feeRecipientAddress,
        uint256 _platformPercentage
    ) external onlyOwner {
        _updateDistributorConfiguration(_feeRecipientAddress);
        _updateExchangeConfiguration(
            _royaltiesProvider,
            _royaltiesSigner,
            _erc20PaymentToken,
            _platformPercentage
        );
    }
}
