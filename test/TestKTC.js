const KTC = artifacts.require("KTC");

contract("KTC", accounts => {
	const owner = accounts[0];
	const alice = accounts[1];
	const bob = accounts[2];
	const toto = web3.utils.fromAscii('toto');
	const tata = web3.utils.fromAscii('tata');
	let decimals  = 18;
	let Kit;
	const BN = web3.utils.BN;

	
	it("should put 60000000000000000000000000 in the first account", async () => {
		Kit = await KTC.deployed();
		let ownerBalance = await Kit.balanceOf.call(accounts[0]);
		//decimals = await Kit.decimals().valueOf();
		assert.equal( ownerBalance.valueOf(), 60000000000000000000000000 );
	});
	
	it("should send Alice and Bob some funds", async() => {
		//let howMuch = new BN(600 * 10**decimals);
		var amount = 60000;
		let howMuch = web3.utils.toBN(web3.utils.toWei(amount.toString(), 'ether'));
		let sendAlice = await Kit.transfer(alice, howMuch);
		let sendBob = await Kit.transfer(bob, howMuch);
	});
	  
	it('should not have a default pool called "toto"', async () => {
		let nodeInfo = await Kit.getPoolStatus.call(toto, owner);
		assert.equal( nodeInfo[3].valueOf(), 0);
	});
	

	it('should create a new pool "toto"', async () => {
		let createNode = await Kit.createPool(toto);
		let nodeInfo = await Kit.getPoolStatus.call(toto, owner);
		assert.equal ( nodeInfo[0].valueOf(), 1, "there should be one member in the new pool");
		assert.notEqual ( nodeInfo[3].valueOf(), 0, "there should be some funds in the pool");
	});
	
	it('my pools should now include this new pool', async () => {
		let myP = await Kit.getMyPools.call(owner);
		assert.equal(web3.utils.hexToUtf8(myP[0]), web3.utils.toAscii(toto), "new pool should be in Alice's list");
	});
	
	it('should withdraw dividends', async () => {
		Kit.withdrawPoolDividends(toto);
		
	});
	
	it('Alice & Bob can join the pool, and pool level updated', async() => {
		var amount = 2500;
		let howMuch = web3.utils.toBN(web3.utils.toWei(amount.toString(), 'ether'));
		Kit.withdrawPoolDividends(toto);
		let aliceJoins = await Kit.joinPool(toto, howMuch , {from: alice, gas: 200000});
		let result = await Kit.getPoolStatus.call(toto, alice);

		assert.equal(web3.utils.fromWei(result[3], 'ether'), 2600, "there should now be 2100 KTC in the pool");
		assert.equal(result[0].valueOf(), 2, "there should now be 2 members in the pool");
		assert.equal(result[1].valueOf(), 2, "the pool should now be of tier 2: >2000 KTC");
		
		//Bob joins too
		let bobJoins = await Kit.joinPool(toto, howMuch , {from: bob, gas: 200000});
		result = await Kit.getPoolStatus.call(toto, bob);

		assert.equal(web3.utils.fromWei(result[3], 'ether'), 5100, "there should now be 2100 KTC in the pool");
		assert.equal(result[0].valueOf(), 3, "there should now be 3 members in the pool");
		assert.equal(result[1].valueOf(), 1, "the pool should now be of tier 1: >5000 KTC");
	});
	
	it('should distribute dividends to everybody on request', async() => {
		let ownerBalance = await Kit.balanceOf.call(owner);
		let aliceBalance = await Kit.balanceOf.call(alice);
		
		div = await Kit.withdrawPoolDividends(toto);
		
		let newOwnerBal = await Kit.balanceOf.call(owner);
		let newAliceBal = await Kit.balanceOf.call(alice);
		
		assert.notEqual(web3.utils.fromWei(ownerBalance, 'ether'), web3.utils.fromWei(newOwnerBal, 'ether') , "Dividends not paid to owner");
		assert.notEqual(web3.utils.fromWei(aliceBalance, 'ether'), web3.utils.fromWei(newAliceBal, 'ether'), "Dividends not paid to alice");
	});
	
	it('Alice withdraw some funds from the pool', async () => {
		var amount = 1000;
		let howMuch = web3.utils.toBN(web3.utils.toWei(amount.toString(), 'ether'));
		let leavePool = await Kit.leavePool(toto, howMuch);
		let poolStatus = await Kit.getPoolStatus.call(toto, alice);
		assert.equal(web3.utils.fromWei(poolStatus[3], 'ether'), 4100, "Funds not removed from pool balance");
		assert.equal(poolStatus[1].valueOf(), 2, "Pool not downgraded on funds removal");
		
		var alicePools = await Kit.getMyPools.call(alice);
		//console.log(alicePools);
		assert.equal(web3.utils.hexToUtf8(alicePools[0]), web3.utils.toAscii(toto), "pool should still be in Alice list");
		
	});

	it('Bob removes all funds from pool "toto"', async () => {
		var amount = 2500;
		let howMuch = web3.utils.toBN(web3.utils.toWei(amount.toString(), 'ether'));
		let leavePool = await Kit.leavePool(toto, howMuch, {from: bob, gas: 200000});
		let poolStatus = await Kit.getPoolStatus.call(toto, bob);
		assert.equal(web3.utils.fromWei(poolStatus[3], 'ether'), 1600, "Funds not removed from pool balance");
		assert.equal(poolStatus[1].valueOf(), 3, "Pool not downgraded on funds removal");
		
		var bobPools = await Kit.getMyPools.call(bob);
		assert.equal(bobPools.length, 0, "pool should have been removed from Bob's pool list");
	});
	
	it('Alice creates a new pool', async() => {
		let createNode = await Kit.createPool(tata, {from: alice, gas: 200000});
		let nodeInfo = await Kit.getPoolStatus.call(tata, alice);
		assert.equal ( nodeInfo[0].valueOf(), 1, "there should be one member in the new pool");
		assert.notEqual ( nodeInfo[3].valueOf(), 0, "there should be some funds in the pool");
		
		var alicePools = await Kit.getMyPools.call(alice);
		assert.equal ( alicePools.length, 2, "Alice should belong to 2 pools now");
	});
	
	it('Should list all existing pools ??', async() => {

	});
	
});




