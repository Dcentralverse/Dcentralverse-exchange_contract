// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

abstract contract DcvEIP712 {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)"
        );

    bytes32 private constant SALT_HASH =
        keccak256("Dcentralverse Exchange Salt");

    string private constant DOMAIN_NAME = "Dcentralverse Exchange";

    error InvalidSignature();

    function _buildDomainSeparator() internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes(DOMAIN_NAME)),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this),
                    SALT_HASH
                )
            );
    }

    /**
     * @notice See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[1000] private __gap;
}
