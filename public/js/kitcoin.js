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
async function getERC20Balance() {
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
	
	/* Updating my status: my masternodes */
	var mydividends = await tokenContract.methods.showDividend("0x1e81F9210adD6c747CD33490cE6Ec94226532177", blockNumber+1).call().then((result) => {
			$("#divToClaim").text(result);
		}).catch((err) => {
			$("#divToClaim").text(0);
		});
	var mynodes = await tokenContract.methods.showMasternode("0x1e81F9210adD6c747CD33490cE6Ec94226532177").call().then((result) => {
		console.log(result);
		$("#mynode1").text(result[0]);
		$("#mynode2").text(result[1]);
		$("#mynode3").text(result[2]);
		$("#mynode4").text(result[3]);
		$("#mynode5").text(result[4]);
		
	}).catch ((err) => {
		console.log(err);
	});

	//tokenContract.name().then(console.log);
    //decimals = promisify(cb => tokenContract.name.call(cb))
    /*balance = promisify(cb => tokenContract.balanceOf(address, cb))
    name = promisify(cb => tokenContract.name(cb))
    symbol = promisify(cb => tokenContract.symbol(cb))*/

    /*try {
        adjustedBalance = await balance / Math.pow(10, await decimals)
        document.getElementById("output2").innerHTML = adjustedBalance;
        document.getElementById("output2").innerHTML += " " + await symbol + " (" + await name + ")";
		console.log(await decimals);
    } catch (error) {
        document.getElementById("output2").innerHTML = error;
    }*/
	

}

async function buyMasternode(tier){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	
	var blockNumber = await web3.eth.getBlockNumber();
	console.log("Block number: "+blockNumber);
	var buyNode = tokenContract.methods.buyMasternode( tier - 1 );
	try {
		console.log(await buyNode.send({from: myAccount, gas: 200000}));
		getERC20Balance();
	} catch (error){
		console.log(error);
	}	
}

async function sellMasternode(tier){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	
	var blockNumber = await web3.eth.getBlockNumber();
	console.log("Block number: "+blockNumber);
	var sellNode = tokenContract.methods.sellMasternode( tier - 1 );
	try {
		console.log(await sellNode.send({from: myAccount, gas: 200000}));
		getERC20Balance();
	} catch (error){
		console.log(error);
	}	
}

async function claimDividends(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	console.log("Claim dividends at block: "+(await web3.eth.getBlockNumber()));
	
	var claim = tokenContract.methods.withdrawDividend().send({from: myAccount, gas: 200000}).then( (res) => {
		getERC20Balance();
	}).catch( (err) => {
		console.log(error);
	});
}

async function transferMasternode(){
	connectContract();
	var myAccount = (await web3.eth.getAccounts())[0];
	var sendToAddress = document.getElementById("sendToAddress").value;
	
	var transfer = tokenContract.methods.transferMasternode(sendToAddress).send({from: myAccount, gas: 200000}).then( (res) => {
		getERC20Balance();
	}).catch( (err) => {
		console.log(err);
	});
}





