// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

abstract contract DcvNonceManager {
    mapping(address user => mapping(uint256 nonce => bool executed))
        internal _executedUserNonces;

    event NonceCanceled(address indexed user, uint256 nonce);

    error NonceUsed();

    function cancelNonce(uint256 nonce) external {
        _invalidateNonce(msg.sender, nonce);

        emit NonceCanceled(msg.sender, nonce);
    }

    function _invalidateNonce(address user, uint256 nonce) internal {
        if (_executedUserNonces[user][nonce]) revert NonceUsed();

        _executedUserNonces[user][nonce] = true;
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
