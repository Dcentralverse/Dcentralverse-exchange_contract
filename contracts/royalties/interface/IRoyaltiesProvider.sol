// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

interface IRoyaltiesProvider {
    function setRoyaltiesForToken(
        address nftContract,
        uint256 tokenId,
        address royaltyRecipient,
        uint256 royaltyFee
    ) external;

    function calculateRoyaltiesAndGetRecipient(
        address nftContract,
        uint256 tokenId,
        uint256 amount
    ) external view returns (address, uint256);
}
