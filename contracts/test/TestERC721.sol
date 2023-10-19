// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    uint256 private _currentTokenId;

    constructor() ERC721("MyToken", "MTK") {}

    function mint(address recipient) external {
        _mint(recipient, ++_currentTokenId);
    }
}
