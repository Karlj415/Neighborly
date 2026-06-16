// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LeaseEscrow is ReentrancyGuard, Ownable {
    struct Escrow {
        uint256 amount;
        address payable landlord;
        address[] tenants;
        mapping(address => bool) approvals;
        uint256 disputeTimer;
        bool isReleased;
        bool isActive;
        uint256 createdAt;
    }
    
    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId = 1;
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed landlord, address[] tenants, uint256 amount);
    event EscrowApproval(uint256 indexed escrowId, address indexed approver);
    event EscrowReleased(uint256 indexed escrowId, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event DisputeTimerSet(uint256 indexed escrowId, uint256 expiresAt);
    
    // Dispute timer duration (30 days)
    uint256 public constant DISPUTE_DURATION = 30 days;
    
    constructor() {}
    
    /**
     * Create new escrow for lease security deposit
     * @param _landlord Address of the landlord
     * @param _tenants Array of tenant addresses
     */
    function createEscrow(
        address payable _landlord, 
        address[] memory _tenants
    ) external payable returns (uint256) {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        require(_tenants.length > 0, "Must have at least one tenant");
        require(_landlord != address(0), "Invalid landlord address");
        
        uint256 escrowId = nextEscrowId++;
        
        Escrow storage newEscrow = escrows[escrowId];
        newEscrow.amount = msg.value;
        newEscrow.landlord = _landlord;
        newEscrow.tenants = _tenants;
        newEscrow.isReleased = false;
        newEscrow.isActive = true;
        newEscrow.createdAt = block.timestamp;
        newEscrow.disputeTimer = 0;
        
        emit EscrowCreated(escrowId, _landlord, _tenants, msg.value);
        
        return escrowId;
    }
    
    /**
     * Approve release of escrow funds
     * Only landlord or tenants can approve
     */
    function approveRelease(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.isActive, "Escrow not active");
        require(!escrow.isReleased, "Escrow already released");
        require(
            msg.sender == escrow.landlord || _isTenant(_escrowId, msg.sender),
            "Not authorized to approve"
        );
        require(!escrow.approvals[msg.sender], "Already approved");
        
        escrow.approvals[msg.sender] = true;
        emit EscrowApproval(_escrowId, msg.sender);
        
        // Check if we have enough approvals to release
        if (_hasEnoughApprovals(_escrowId)) {
            _releaseEscrow(_escrowId);
        }
    }
    
    /**
     * Start dispute timer - can be called by any party
     * After timer expires, funds can be released without full consensus
     */
    function startDisputeTimer(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.isActive, "Escrow not active");
        require(!escrow.isReleased, "Escrow already released");
        require(
            msg.sender == escrow.landlord || _isTenant(_escrowId, msg.sender),
            "Not authorized"
        );
        require(escrow.disputeTimer == 0, "Dispute timer already started");
        
        escrow.disputeTimer = block.timestamp + DISPUTE_DURATION;
        emit DisputeTimerSet(_escrowId, escrow.disputeTimer);
    }
    
    /**
     * Release funds after dispute timer expires
     * Can be called by anyone after timer expires
     */
    function releaseAfterDispute(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.isActive, "Escrow not active");
        require(!escrow.isReleased, "Escrow already released");
        require(escrow.disputeTimer > 0, "No dispute timer set");
        require(block.timestamp >= escrow.disputeTimer, "Dispute timer not expired");
        
        _releaseEscrow(_escrowId);
    }
    
    /**
     * Emergency refund - only owner can call (for extreme cases)
     */
    function emergencyRefund(uint256 _escrowId) external onlyOwner {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.isActive, "Escrow not active");
        require(!escrow.isReleased, "Escrow already released");
        
        uint256 amount = escrow.amount;
        escrow.isReleased = true;
        escrow.isActive = false;
        
        // Refund equally among tenants
        uint256 refundPerTenant = amount / escrow.tenants.length;
        for (uint i = 0; i < escrow.tenants.length; i++) {
            payable(escrow.tenants[i]).transfer(refundPerTenant);
        }
        
        emit EscrowRefunded(_escrowId, amount);
    }
    
    /**
     * Get escrow details
     */
    function getEscrow(uint256 _escrowId) external view returns (
        uint256 amount,
        address landlord,
        address[] memory tenants,
        uint256 disputeTimer,
        bool isReleased,
        bool isActive,
        uint256 createdAt
    ) {
        Escrow storage escrow = escrows[_escrowId];
        return (
            escrow.amount,
            escrow.landlord,
            escrow.tenants,
            escrow.disputeTimer,
            escrow.isReleased,
            escrow.isActive,
            escrow.createdAt
        );
    }
    
    /**
     * Check if address has approved release
     */
    function hasApproved(uint256 _escrowId, address _address) external view returns (bool) {
        return escrows[_escrowId].approvals[_address];
    }
    
    /**
     * Internal function to release escrow to landlord
     */
    function _releaseEscrow(uint256 _escrowId) internal nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        uint256 amount = escrow.amount;
        
        escrow.isReleased = true;
        escrow.isActive = false;
        
        escrow.landlord.transfer(amount);
        emit EscrowReleased(_escrowId, amount);
    }
    
    /**
     * Check if we have enough approvals (landlord + majority of tenants)
     */
    function _hasEnoughApprovals(uint256 _escrowId) internal view returns (bool) {
        Escrow storage escrow = escrows[_escrowId];
        
        // Need landlord approval
        if (!escrow.approvals[escrow.landlord]) {
            return false;
        }
        
        // Need majority of tenants
        uint256 tenantApprovals = 0;
        for (uint i = 0; i < escrow.tenants.length; i++) {
            if (escrow.approvals[escrow.tenants[i]]) {
                tenantApprovals++;
            }
        }
        
        uint256 requiredTenantApprovals = (escrow.tenants.length / 2) + 1;
        return tenantApprovals >= requiredTenantApprovals;
    }
    
    /**
     * Check if address is a tenant in the escrow
     */
    function _isTenant(uint256 _escrowId, address _address) internal view returns (bool) {
        Escrow storage escrow = escrows[_escrowId];
        for (uint i = 0; i < escrow.tenants.length; i++) {
            if (escrow.tenants[i] == _address) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}