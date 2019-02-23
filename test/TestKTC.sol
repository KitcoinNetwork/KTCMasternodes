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
	

	function testMyMasternodesEmpty() public {
		(uint m1, uint m2, uint m3, uint m4, uint m5) = Kit.showMasternode(tx.origin);
		Assert.equal( m1, 0, "No masternode tier0 on creation");
		Assert.equal( m2, 0, "No masternode tier1 on creation");
		Assert.equal( m3, 0, "No masternode tier2 on creation");
		Assert.equal( m4, 0, "No masternode tier3 on creation");
		Assert.equal( m5, 0, "No masternode tier4 on creation");
	}
	
	function testBuyMasternode() public {
		//buy Tier1 of tier0-4
		bool buy = Kit.buyMasternode(1);
		Assert.equal(buy, true, "Buying Masternode failed");
		
		(uint m1, uint m2, uint m3, uint m4, uint m5) = Kit.showMasternode(tx.origin);
		Assert.equal(m1, 0, "Masternode 1 count updated");
		Assert.equal(m2, 1, "Masternode 2 count updated");
		Assert.equal(m3, 0, "Masternode 3 count updated");
		Assert.equal(m4, 0, "Masternode 4 count updated");
		Assert.equal(m5, 0, "Masternode 5 count updated");
		uint256 balanceOwner = Kit.balanceOf(tx.origin);
		Assert.notEqual(balanceOwner, 60000000, "Balance not updated after buying node");
	}
	
	function testShowDividends() public {
		uint div = Kit.showDividend(tx.origin, block.number + 10000);
		Assert.notEqual(div, 0, "Dividends are zero");
	}
	
	function testWithdrawDividends() public {
		uint256 bal1 = Kit.balanceOf(tx.origin);
		uint256 divt = Kit.showDividend(tx.origin, block.number);
		uint256 divr = Kit.withdrawDividend();
		uint256 bal2 = Kit.balanceOf(tx.origin);
		Assert.equal(divt, divr, "Shown and withdrew dividends differ");
		Assert.equal(bal1 + divr, bal2, "Updated balance differs from expected");
	}
	
	function testSellMasternode() public {
		bool sell = Kit.sellMasternode(1);
		Assert.equal(sell, true, "Selling our Masternode failed");
		
		testMyMasternodesEmpty();
		
	}
	
	function testTransferMasternode() public {
		bool buy = Kit.buyMasternode(0);
		address buyerAdd = 0xD3f48e79ba37b170d2406ad8705a2B5A125EA3c0;
		bool sell = Kit.transferMasternode( buyerAdd );
		(uint m1, uint m2, uint m3, uint m4, uint m5) = Kit.showMasternode(buyerAdd);
		Assert.equal(m1, 1, "Masternode not sold");
	}
	
	
	function testCreatePool() public {
		bytes32 name = "toto";
		bytes32 poolName = Kit.createPool(name);
		Assert.equal(name, poolName, "Pool created doesn't have proper name");
		uint div = Kit.showPoolDividends("toto", block.number + 10000);
		Assert.equal(div, 0, "Just created pool dividends are not zero");
	}
	
	
	function testAddFundsPool() public {
		Kit.joinPool("toto", 1000);
		uint div = Kit.showPoolDividends("toto", block.number + 10000);
		Assert.notEqual(div, 0, "Pool dividends shouldn't be zero after adding enough funds");
	}
	
	
	function testGetPoolStatus() public {
		(uint members, uint256 tier, uint256 div, uint256 bal, uint256 balAdd) = Kit.getPoolStatus('toto', tx.origin);
		Assert.equal(members, 1, "New pool has not even its creator as member...");
	}
	
}