pragma solidity >= 0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/KTC.sol";

contract TestKTC {
	KTC Kit = KTC(DeployedAddresses.KTC());
	
	function testCreatorBalance() public {
		uint256 balanceOwner = Kit.balanceOf(tx.origin);
		
		Assert.equal(balanceOwner, 60000000000000000000000000, "Contract creator balance is incorrect");
	}
	
	
	function testCreatePool() public {
		bytes32 name = "testpool";
		bytes32 poolName = Kit.createPool(name);
		Assert.equal(name, poolName, "Pool created doesn't have proper name");
		uint div = Kit.showPoolDividends("testpool", block.number + 10000);
		Assert.equal(div, 0, "Just created pool dividends are not zero");
	}
	
	
	function testAddFundsPool() public {
		uint256 value = 1000000000000000000000;
		Kit.joinPool("testpool", value);
		uint div = Kit.showPoolDividends("testpool", block.number + 10000);
		Assert.notEqual(div, 0, "Pool dividends shouldn't be zero after adding enough funds");
	}
	
	
	function testGetPoolStatus() public {
		(uint members, uint256 tier, uint256 div, uint256 bal, uint256 balAdd) = Kit.getPoolStatus('testpool', tx.origin);
		Assert.equal(members, 1, "New pool has not even its creator as member...");
	}
	
}