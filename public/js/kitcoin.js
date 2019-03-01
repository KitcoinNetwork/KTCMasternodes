var tokenContract;
var userAccount;

window.addEventListener('load', async () => {
    if (window.ethereum) {
            window.web3 = new Web3(ethereum);
            try {
                // Request account access if needed
                await ethereum.enable();
                // Acccounts now exposed
                web3.eth.sendTransaction({/* ... */});
            } catch (error) {
                // User denied account access...
            }
	}
        // Legacy dapp browsers...
	else if (typeof web3 !== 'undefined') {
        console.log('Web3 Detected! ' + web3.currentProvider.constructor.name)
        window.web3 = new Web3(web3.currentProvider);
    } else {
        console.log('No Web3 Detected... using HTTP Provider')
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"));
    }
	//web3.eth.getAccounts(console.log);
	console.log(web3.version);
	
	//TODO: run after setting contract address
	//listMyPools();
	document.getElementById("address").value = (await web3.eth.getAccounts())[0];
})

function connectContract(){
	if ( tokenContract == null ){
		var address = document.getElementById("address").value;
		var contractAddress = document.getElementById("contractAddress").value;
		var contractABI = human_standard_token_abi;
		//console.log(contractABI);
		tokenContract = new web3.eth.Contract(contractABI, contractAddress);
	}
}
	

const promisify = (inner) =>
    new Promise((resolve, reject) =>
        inner((err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    );

async function getBalance() {
    var address, wei, balance
    address = document.getElementById("address").value;
    wei = promisify(cb => web3.eth.getBalance(address, cb))
    try {
        balance = web3.utils.fromWei(await wei, 'ether')
        document.getElementById("output").innerHTML = balance + " ETH";
    } catch (error) {
        document.getElementById("output").innerHTML = error;
    }
}
async function getKTCBalance() {
	connectContract();
	var tokenBalance = tokenContract.methods.balanceOf("0x1e81F9210adD6c747CD33490cE6Ec94226532177").call().then( (res) => {
		document.getElementById("output2").innerHTML = res + " KTC";
	}).catch( (err) => {
		console.log(err);
	});

	var blockNumber = await web3.eth.getBlockNumber();
	
	/* Updating network status: masternode numbers */
	//TODO replace by a getter function
	var tier1n = tokenContract.methods.tierNumber(0).call()
	var tier2n = tokenContract.methods.tierNumber(1).call()
	var tier3n = tokenContract.methods.tierNumber(2).call()
	var tier4n = tokenContract.methods.tierNumber(3).call()
	var tier5n = tokenContract.methods.tierNumber(4).call()
	try  {
		$("#tier1n").text(await tier1n);
		$("#tier2n").text(await tier2n);
		$("#tier3n").text(await tier3n);
		$("#tier4n").text(await tier4n);
		$("#tier5n").text(await tier5n);
	} catch (error){
		console.log(error);
	}


	await listMyPools();
	$('.hidd').hide();

}


async function claimDividends(poolName){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	console.log("Claim dividends at block: "+(await web3.eth.getBlockNumber()));
	
	var claim = tokenContract.methods.withdrawPoolDividends(web3.utils.fromAscii(poolName)).send({from: myAccount, gas: 200000}).then( (res) => {
		getKTCBalance();
	}).catch( (err) => {
		console.log(err);
	});
}

async function transferMasternode(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var sendToAddress = document.getElementById("sendToAddress").value;
	
	var transfer = tokenContract.methods.transferMasternode(sendToAddress).send({from: myAccount, gas: 200000}).then( (res) => {
		getKTCBalance();
	}).catch( (err) => {
		console.log(err);
	});
}

async function searchPool(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	
	var poolName = document.getElementById("searchPool").value;
	var poolNameWeb3 = web3.utils.fromAscii(poolName);

	tokenContract.methods.getPoolStatus(poolNameWeb3, myAccount).call().then( (poolInfo) => {
		console.log(poolInfo);
		//poolInfo: [pool's members, tierLevel, pending dividends, total balance and arg _address balance]
		if ( poolInfo[3] == 0 ) {
			console.log('No such pool');
			$('#searchPoolRes').html('No such pool!');
		}
		else {
			console.log("Pool: "+poolName+", Balance: "+poolInfo[3]);
			$('#searchPoolRes').html('<div id="'+poolName+'">' +
			'<div class="poolName">'+poolName+'</div>'+
			'<div class="poolBalance">'+poolInfo[3]/10**18+' KTC</div>'+
			'<div class="poolMyShare">'+poolInfo[4]/10**18+' KTC</div>'+
			'<div class="poolAddFunds">'+
				'<input type="text" class="'+poolName+'KTCAmount" placeholder="KTC amount" id="'+poolName+'KTCAmount">'+
				'<input type="button" class="'+poolName+'AddAmount" value="Add Funds" onClick="addFunds(\''+poolName+'\')">'+
				'</div></div>');
		}
	}).catch( (err) => {
		console.log(error);
	});
}
async function getPoolInfo(name){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	
	var poolName = web3.utils.fromAscii(name);
	tokenContract.methods.getPoolStatus(poolName, myAccount).call().then( (poolInfo) => {
		console.log(poolInfo);
		//poolInfo: [pool's members, tierLevel, pending dividends, total balance and arg _address balance]
		if ( poolInfo[3] == 0 ) console.log('No such pool');
		else console.log("Pool: "+poolName+", Balance: "+poolInfo[3]);
		return poolInfo;
	}).catch( (err) => {
		console.log(error);
		return 
	});
}

async function listMyPools(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];

	var myPools = await tokenContract.methods.getMyPools(myAccount).call();
	console.log(myPools);
	$("#poolList").empty();
	for ( i = 0; i< myPools.length; i++){
		console.log(myPools[i]);
		var pool = myPools[i];
		var poolInfo = await tokenContract.methods.getPoolStatus(pool, myAccount).call();
		console.log(poolInfo);
		var poolName = web3.utils.hexToUtf8(pool);
		$('#poolTemplate').clone().attr('id',poolName).removeClass("hidd").appendTo("#poolList");
		$('#'+poolName+' .poolBalance').html("Balance: "+poolInfo[3]/10**18 + " KTC");
		$('#'+poolName+' .poolMyShare').html("My Share: "+poolInfo[4]/10**18 + " KTC");
		$('#poolList').append('<div id="'+poolName+'">' +
			'<div class="poolName">'+poolName+'</div>'+
			'<div class="poolBalance">'+poolInfo[3]/10**18+' KTC</div>'+
			'<div class="poolMyShare">'+poolInfo[4]/10**18+' KTC</div>'+
			'<div class="poolAddFunds">'+
				'<a href="#" onClick="claimDividends(\''+poolName+'\')">Claim Dividends</a> &nbsp; '+
				'<a href="#" onClick="$(\'.hidd\').hide(); $(\'.'+poolName+'AddAmount\').show(); $(\'.'+poolName+'KTCAmount\').show();">Add Funds</a> &nbsp; '+
				'<a href="#" onClick="$(\'.hidd\').hide(); $(\'.'+poolName+'RemAmount\').show(); $(\'.'+poolName+'KTCAmount\').show();">Withdraw Funds</a> &nbsp; '+
				'<a href="#" onClick="$(\'.hidd\').hide(); $(\'.'+poolName+'TrfAmount\').show(); $(\'.'+poolName+'KTCAmount\').show(); $(\'.'+poolName+'KTCDest\').show();">Transfer Funds</a><br>'+
				'<div>'+
				'<input type="text" class="hidd '+poolName+'KTCAmount" placeholder="KTC amount" id="'+poolName+'KTCAmount">'+
				'<input type="button" class="hidd '+poolName+'AddAmount" value="Add Funds" onClick="addFunds(\''+poolName+'\')">'+
				'<input type="button" class="hidd '+poolName+'RemAmount" value="Withdraw Funds" onClick="removeFunds(\''+poolName+'\')">'+
				'<input type="button" class="hidd '+poolName+'TrfAmount" value="Transfer Funds" onClick="transferFunds(\''+poolName+'\')"><br>'+
				'<input type="text" class="hidd '+poolName+'KTCDest" placeholder="Transfer address" id="'+poolName+'TrfFundAdd">'+
				'</div></div></div>');
	}
	$('.hidd').hide();
}

async function createPool(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var poolName = await web3.utils.utf8ToHex(document.getElementById("createPool").value);
	console.log(poolName);
	var create = await tokenContract.methods.createPool(poolName).send({from: myAccount, gas: 200000}).then( (result) => {
		console.log(result);
		listMyPools();
		$('.hidd').hide();
	}).catch( (err) => {
		console.log(err);
	});
}


async function addFunds(poolName){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var value = $('#'+poolName+'KTCAmount').val();

	var add = await tokenContract.methods.joinPool(web3.utils.fromAscii(poolName), web3.utils.toWei(value, 'ether')).send({from: myAccount, gas: 200000}).then( (result) => {
		console.log(result);
		listMyPools();
	}).catch( (err) => {
		console.log(err);
	});
}

async function removeFunds(poolName){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var value = $('#'+poolName+'KTCAmount').val();

	var add = await tokenContract.methods.leavePool(web3.utils.fromAscii(poolName), web3.utils.toWei(value, 'ether')).send({from: myAccount, gas: 200000}).then( (result) => {
		console.log(result);
		listMyPools();
	}).catch( (err) => {
		console.log(err);
	});
}

async function transferFunds(poolName){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var value = $('#'+poolName+'KTCAmount').val();
	var toAddress = $('#'+poolName+'TrfFundAdd').val();
	
	var transferTo = await tokenContract.methods.transferShare(web3.utils.fromAscii(poolName), web3.utils.toWei(value, 'ether'), toAddress).send({from: myAccount, gas: 200000}).then( (result) => {
		console.log(result);
		listMyPools();
	}).catch( (err) => {
		console.log(err);
	});
}








