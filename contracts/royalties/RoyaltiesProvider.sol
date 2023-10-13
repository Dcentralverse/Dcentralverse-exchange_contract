// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RoyaltiesProvider is OwnableUpgradeable {
    struct Royalties {
        address recipient;
        uint256 fee;
    }

    uint256 internal constant MAX_FEE = 10000;
    mapping(address nftContract => mapping(uint256 tokenId => Royalties royalty))
        internal _royaltiesPerTokenId;
    mapping(address nftContract => uint256 limit) public royaltyLimit;
    address public exchangeAddress;

    event NewRoyaltiesLimitForCollection(
        address indexed nftContract,
        uint256 limit
    );

    event RoyaltiesSetForToken(
        address indexed nftContract,
        uint256 indexed tokenId,
        address feeRecipient,
        uint256 fee
    );

    error InvalidCaller();
    error FeeOverTheLimit();

    function __RoyaltiesProvider_init() external initializer {
        __Ownable_init_unchained();
    }

    function setRoyaltiesForToken(
        address nftContract,
        uint256 tokenId,
        address royaltyRecipient,
        uint256 royaltyFee
    ) external {
        if (msg.sender != exchangeAddress) revert InvalidCaller();
        if (
            royaltyLimit[nftContract] > 0 &&
            royaltyFee > royaltyLimit[nftContract]
        ) revert FeeOverTheLimit();

        _royaltiesPerTokenId[nftContract][tokenId] = Royalties(
            royaltyRecipient,
            royaltyFee
        );

        emit RoyaltiesSetForToken(
            nftContract,
            tokenId,
            royaltyRecipient,
            royaltyFee
        );
    }

    function setRoyaltiesLimitForCollection(
        address nftContract,
        uint256 newLimit
    ) external onlyOwner {
        if (newLimit > MAX_FEE) revert FeeOverTheLimit();

        royaltyLimit[nftContract] = newLimit;

        emit NewRoyaltiesLimitForCollection(nftContract, newLimit);
    }

    function setExchangeAddress(address _exchangeAddress) external onlyOwner {
        exchangeAddress = _exchangeAddress;
    }

    function calculateRoyaltiesAndGetRecipient(
        address nftContract,
        uint256 tokenId,
        uint256 amount
    ) external view returns (address, uint256) {
        Royalties memory royaltiesForToken = _royaltiesPerTokenId[nftContract][
            tokenId
        ];

        if (
            royaltiesForToken.recipient != address(0) &&
            royaltiesForToken.fee > 0
        ) {
            return (
                royaltiesForToken.recipient,
                (amount * royaltiesForToken.fee) / MAX_FEE
            );
        }

        return (address(0), 0);
    }
}
