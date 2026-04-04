// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IDataToken {
    function mint(address to, uint256 amount) external;
}

/// @title DataRewards
/// @notice Accepts data submissions and lets reviewers approve them for token rewards.
contract DataRewards is AccessControl {
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    struct Submission {
        uint256 id;
        address submitter;
        string dataURI;
        uint256 rewardAmount;
        bool approved;
        bool rewarded;
    }

    IDataToken public dataToken;
    uint256 public nextSubmissionId;

    mapping(uint256 => Submission) public submissions;
    mapping(bytes32 => bool) public usedDataHashes;

    event DataSubmitted(
        uint256 indexed submissionId,
        address indexed submitter,
        string dataURI,
        uint256 rewardAmount
    );

    event DataApproved(
        uint256 indexed submissionId,
        address indexed reviewer,
        address indexed submitter,
        uint256 rewardAmount
    );

    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);

    constructor(address tokenAddress, address admin) {
        require(tokenAddress != address(0), "Invalid token address");
        require(admin != address(0), "Invalid admin");

        dataToken = IDataToken(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REVIEWER_ROLE, admin);
    }

    /// @notice Submit data for review. Duplicate URIs are blocked in this demo.
    function submitData(string calldata dataURI, uint256 rewardAmount) external {
        require(bytes(dataURI).length > 0, "Data URI required");
        require(rewardAmount > 0, "Reward must be > 0");

        bytes32 dataHash = keccak256(abi.encodePacked(dataURI));
        require(!usedDataHashes[dataHash], "Duplicate data URI");

        usedDataHashes[dataHash] = true;

        submissions[nextSubmissionId] = Submission({
            id: nextSubmissionId,
            submitter: msg.sender,
            dataURI: dataURI,
            rewardAmount: rewardAmount,
            approved: false,
            rewarded: false
        });

        emit DataSubmitted(nextSubmissionId, msg.sender, dataURI, rewardAmount);

        nextSubmissionId++;
    }

    /// @notice Approve a submission and mint tokens to the original submitter.
    /// @dev DataRewards must be granted MINTER_ROLE on DataToken before this works.
    function approveSubmission(uint256 submissionId) external onlyRole(REVIEWER_ROLE) {
        Submission storage submission = submissions[submissionId];

        require(submission.submitter != address(0), "Submission not found");
        require(!submission.approved, "Already approved");
        require(!submission.rewarded, "Already rewarded");

        submission.approved = true;
        submission.rewarded = true;

        dataToken.mint(submission.submitter, submission.rewardAmount);

        emit DataApproved(
            submissionId,
            msg.sender,
            submission.submitter,
            submission.rewardAmount
        );
    }

    /// @notice Update reward token address in case token contract is redeployed.
    function setRewardToken(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(0), "Invalid token address");

        address oldToken = address(dataToken);
        dataToken = IDataToken(tokenAddress);

        emit RewardTokenUpdated(oldToken, tokenAddress);
    }

    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        return submissions[submissionId];
    }
}