var tokenContract;
var userAccount;
var tierROI = [ 20, 10, 8, 6, 5, 0];
var myAccount;
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
	//document.getElementById("address").value = (await web3.eth.getAccounts())[0];
	myAccount = (await web3.eth.getAccounts())[0];
	updatePage();
})

function connectContract(){
	if ( tokenContract == null ){
		//var address = document.getElementById("address").value;
		var contractAddress = "0x77c7C8C60283eBC3774aE4fCBe4F25530E4edC8A";
		var contractABI = human_standard_token_abi;
		//console.log(contractABI);
		tokenContract = new web3.eth.Contract(contractABI, contractAddress);
	}
}
	
/*
const promisify = (inner) =>
    new Promise((resolve, reject) =>
        inner((err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    );*/

async function getBalance() {
    var address, wei, balance
    address = myAccount;
    web3.eth.getBalance(address).call().then( (bal) =>{
        balance = web3.utils.fromWei(bal, 'ether');
        document.getElementById("output").innerHTML = balance + " ETH";
    }).catch( (error) => {
        document.getElementById("output").innerHTML = error;
    });
}

async function updatePage() {
	connectContract();
	getKTCBalance();
	listMyPools();
}

async function getKTCBalance() {
	connectContract();
	var tokenBalance = tokenContract.methods.balanceOf(myAccount).call().then( (res) => {
		//document.getElementById("output2").innerHTML = res + " KTC";
		document.getElementById("myBalance").innerHTML = Math.trunc(res / 10**12) / 10**6 ;
	}).catch( (err) => {
		console.log(err);
	});

	/* Updating network status: masternode numbers */
	//TODO replace by a getter function
	var totalSupply = tokenContract.methods.totalSupply().call().then( (totalSupply) => {
		$("#totalSupply").text(Math.trunc((totalSupply)/10**18));
	});
	var tier1n = tokenContract.methods.tierNumber(0).call().then( (numTier) => {
		$("#tier1n").text(numTier);
	});
	var tier2n = tokenContract.methods.tierNumber(1).call().then( (numTier) => {
		$("#tier1n").text(numTier);
	});
	var tier3n = tokenContract.methods.tierNumber(2).call().then( (numTier) => {
		$("#tier1n").text(numTier);
	});
	var tier4n = tokenContract.methods.tierNumber(3).call().then( (numTier) => {
		$("#tier1n").text(numTier);
	});
	var tier5n = tokenContract.methods.tierNumber(4).call().then( (numTier) => {
		$("#tier1n").text(numTier);
	});

}


function claimDividends(poolName){
	connectContract();
	
	//console.log("Claim dividends at block: "+(await web3.eth.getBlockNumber()));
	
	
	tokenContract.methods.withdrawPoolDividends(web3.utils.utf8ToHex(poolName)).send({from: myAccount, gas: 900000}).then( (res) => {
		alertSuccess(poolName, window.lang['successDividends'] );
		updatePage();
	}).catch( (err) => {
		console.log(err);
		alertError(poolName, window.lang['errorDividends'] );
	});
}


function searchPool(){
	connectContract();
	
	var poolName = document.getElementById("searchPool").value;
	var poolNameWeb3 = web3.utils.utf8ToHex(poolName);

	tokenContract.methods.getPoolStatus(poolNameWeb3, myAccount).call().then( (poolInfo) => {
		console.log(poolInfo);
		//poolInfo: [pool's members, tierLevel, pending dividends, total balance and arg _address balance]
		if ( poolInfo[3] == 0 ) {
			console.log('No such pool');
			$('#searchPoolRes').html("<br>"+window.lang["nosuchpool"]);
		}
		else {
			console.log(window.lang["pool"]+": "+poolName+", "+window.lang["balance"]+": "+poolInfo[3]);
			if ( $('#poolList #'+poolName ).length ){
				$('#searchPoolRes').html('<hr>'+window.lang["youareinpool"]+' '+poolName+
					'.<br><a href="#" onclick="$(\'#pills-home-tab\').tab(\'show\')">'+window.lang["seemypools"]+'</a>');
			}
			else {
				$('#searchPoolRes').html('<hr><div id="'+poolName+'" class="poolContainer">'+
					poolContainer(poolName, poolInfo[0], poolInfo[1], poolInfo[2], poolInfo[3], poolInfo[4])+
					( ( poolInfo[1]>0) ? '<div class="poolAddFunds">'+
					'<div class="form-inline ">'+
					'<input type="text" class="form-control mr-2 col '+poolName+'KTCAmount" placeholder="'+window.lang["ktcamountmin1"]+'" id="'+poolName+'KTCAmount">'+
					'<input type="button" class="btn btn-primary '+poolName+'AddAmount" value="'+window.lang["addfunds"]+'" onClick="addFunds(\''+poolName+'\')">'+
					'</div></div>' : ' ')+
				'</div>');
			}
		}
	}).catch( (err) => {
		console.log(error);
		alertError(poolName, window.lang['unexpectederror'] );
	});
}


function poolContainer(poolName, members, tier, dividends, balance, balanceUser){
	var tierDisplay = parseInt(tier) + 1;
	var code = '<table width="100%"><tr><td><div class="poolName">&#9935; '+poolName+'</div>'+
			'<div class="poolBalance">'+window.lang["balance"]+': '+Math.trunc(balance/10**12)/10**6+' KTC</div>'+
			'<div class="poolMyShare">'+window.lang["myshare"]+': '+Math.trunc(balanceUser/10**12)/10**6+' KTC</div>'+
			'<div class="poolMembers">'+window.lang["members"]+': '+members+' </div>'+
			'<td width="35%" style="text-align: center;"><img class="poolLogo" src="img/Icon_Rank_'+tier+'.png" /><br>'+
			((tier == 0)?window.lang["masternode"]+'<br>20%' : ((tier == 5)? window.lang["notier"] : window.lang["tier"]+" "+tierDisplay+"<br>"+tierROI[tier]+"%" ) )+
			'</td></tr>'+
			
			( (balance/10**18 > 500) ? '<tr><td colspan=2><div  style="/*display: flex; justify-content: space-between;*/">'+window.lang["dividends"]+': '+Number(dividends/10**18).toFixed(8)+'<span> </span>&#x1f87a; <a href="#" onClick="claimDividends(\''+poolName+'\')">'+window.lang["claimdividends"]+'</a></div></td></tr>' : '' )+
			'</table><hr>';
	return code;
}


async function getPoolInfo(name){
	connectContract();
	
	var poolName = web3.utils.utf8ToHex(name);
	tokenContract.methods.getPoolStatus(poolName, myAccount).call().then( (poolInfo) => {
		console.log(poolInfo);
		//poolInfo: [pool's members, tierLevel, pending dividends, total balance and arg _address balance]
		if ( poolInfo[3] == 0 ) console.log('No such pool');
		else console.log("Pool: "+poolName+", Balance: "+poolInfo[3]);
		return poolInfo;
	}).catch( (err) => {
		console.log(error);
		alertError(poolName, window.lang['unexpectederror'] );
		return 
	});
}


async function listMyPools(){
	connectContract();

	var myPools = await tokenContract.methods.getMyPools(myAccount).call();
	console.log(myPools);
	var balanceInPools = 0;

	$("#poolList").empty();
	if ( myPools.length == 0 ) {
		$('#poolList').append('<div class="dashboard-container mh-15"><div style="padding-top: 40px; text-align: center;">'+
					window.lang["youarenotinapool"]+'<br><a href="#" onclick="$(\'#pills-profile-tab\').tab(\'show\')">'+
					window.lang["joinapool"]+'</a></div></div>');
	}
	for ( i = 0; i< myPools.length; i++){
		console.log(myPools[i]);
		var pool = myPools[i];
		var poolInfo = await tokenContract.methods.getPoolStatus(pool, myAccount).call();
		console.log(poolInfo);
		balanceInPools += Math.trunc(poolInfo[4]/10**12) / 10**6;
		var poolName = web3.utils.hexToUtf8(pool);
		$('#poolList').append('<div id="'+poolName+'" class="poolContainer dashboard-container">' +
			poolContainer(poolName, poolInfo[0], poolInfo[1], poolInfo[2], poolInfo[3], poolInfo[4])+
			'<div class="poolAddFunds"><div  style="display: flex; justify-content: space-between;">'+
				((poolInfo[1] > 0) ? 
					( (poolInfo[3]/10**18 < 10000) ? '<a href="#" onClick="event.preventDefault(); $(\'.hidd\').hide(); $(\'.'+poolName+'AddAmount\').show(); $(\'.'+poolName+'KTCAmount\').show();">'+window.lang["addfunds"]+' &#x1f845;</a> &nbsp;' : '') + ' <a href="#" onClick="event.preventDefault(); $(\'.hidd\').hide(); $(\'.'+poolName+'RemAmount\').show(); $(\'.'+poolName+'KTCAmount\').show();"> &#x1f847; '+window.lang["withdrawfunds"]+'</a>'
					: '<a href="#" onClick="event.preventDefault(); $(\'.hidd\').hide(); $(\'.'+poolName+'TrfAmount\').show(); $(\'.'+poolName+'KTCAmount\').show(); $(\'.'+poolName+'KTCDest\').show();">'+window.lang["transferfunds"]+' &#x1f846; </a><br>')+
				'</div>'+
				'<form class="form-inline mt-2"><input type="text" class="form-control col mr-2 mb-1 hidd '+poolName+'KTCAmount" placeholder="'+window.lang["ktcamount"]+'" id="'+poolName+'KTCAmount">'+
				'<input type="button" class="btn btn-primary hidd mb-1 '+poolName+'AddAmount" value="'+window.lang["addfunds"]+'" onClick="addFunds(\''+poolName+'\')">'+
				'<input type="button" class="btn btn-primary hidd mb-1 '+poolName+'RemAmount" value="'+window.lang["withdrawfunds"]+'" onClick="removeFunds(\''+poolName+'\')">'+
				'<input type="button" class="btn btn-primary hidd mb-1 '+poolName+'TrfAmount" value="'+window.lang["transferfunds"]+'" onClick="transferFunds(\''+poolName+'\')">'+
				'<input type="text" class="form-control hidd col-12 '+poolName+'KTCDest" placeholder="'+window.lang["transferaddress"]+'"," id="'+poolName+'TrfFundAdd">'+
				'</form></div></div>');
	}
	document.getElementById('balanceInPools').innerHTML = balanceInPools;
	$('.hidd').hide();
}

function alertError(appendToDiv, errorMessage){
	$('#error-alert').remove();
	$('#'+appendToDiv).append('<div class="alert alert-danger" id="error-alert">'+errorMessage+'</div>');
	$("#error-alert").fadeTo(2000, 500).slideUp(500, function(){
		$("#error-alert").slideUp(500);
	});
}
function alertSuccess(appendToDiv, errorMessage){
	$('#success-alert').remove();
	$('#'+appendToDiv).append('<div class="alert alert-success" id="success-alert">'+errorMessage+'</div>');
	$("#success-alert").fadeTo(2000, 500).slideUp(500, function(){
		$("#success-alert").slideUp(500);
	});
}


function createPool(){
	connectContract();
	
	var name = document.getElementById("createPool").value;
	//forbid special chars cuz it interfers with the frontend
	var match = /[*?\-+^${}[\]().|\\\'\"\/\&`~%;,:!_@<>=§#²]/.exec(name);
	if (match) {
		console.log(match.index);
		alertError("createAPool", "Bad characters");
		return;
	}
	
	tokenContract.methods.createPool(web3.utils.utf8ToHex(name)).send({from: myAccount, gas: 900000}).then( (result) => {
		alertSuccess("createAPool", window.lang['successCreatingPool'] );
		updatePage()
	}).catch( (err) => {
		console.log(err);
		alertError("createAPool", window.lang['errorCreatingPool'] );
	});
}


function addFunds(poolName){
	connectContract();

	var value = $('#'+poolName+'KTCAmount').val();

	if ( isNaN(value) || value == '' || value <= 0){
		alertError(poolName, window.lang['invalidnumber'] );
		return ;
	}
	
	//limiting decimals precision in funds added-removed-transferred
	var mantissa = value.split('.')[1];
	if ( typeof mantissa !== 'undefined' && mantissa > 10**4 ){
		console.log("mantissa: "+mantissa+" - "+mantissa.length);
		alertError(poolName, window.lang['toomanydecimals'] );
		return;
	}
	
	tokenContract.methods.joinPool(web3.utils.utf8ToHex(poolName), web3.utils.toWei(value, 'ether')).send({from: myAccount, gas: 900000}).then( (result) => {
		//console.log(result);
		alertSuccess(poolName, window.lang['successAddingFunds'] );
		updatePage();
	}).catch( (err) => {
		console.log(err);
		alertError(poolName, window.lang['errorAddingFunds'] );
	});
}


function removeFunds(poolName){
	connectContract();
	var value = $('#'+poolName+'KTCAmount').val();

	if ( isNaN(value) || value == '' || value <= 0){
		alertError(poolName, window.lang['invalidnumber'] );
		return ;
	}
	
	//limiting decimals precision in funds added-removed-transferred
	var mantissa = value.split('.')[1];
	if ( typeof mantissa !== 'undefined' && mantissa > 10**4 ){
		console.log("mantissa: "+mantissa+" - "+mantissa.length);
		alertError(poolName, window.lang['toomanydecimals'] );
		return;
	}
	
	tokenContract.methods.leavePool(web3.utils.utf8ToHex(poolName), web3.utils.toWei(value, 'ether')).send({from: myAccount, gas: 900000}).then( (result) => {
		console.log(result);
		alertSuccess(poolName, window.lang['successWithdrawingFunds'] );
		updatePage();
		
	}).catch( (err) => {
		//console.log(err);
		alertError(poolName, window.lang['errorWithdrawingFunds'] );
	});
}


function transferFunds(poolName){
	connectContract();
	var value = $('#'+poolName+'KTCAmount').val();
	var toAddress = $('#'+poolName+'TrfFundAdd').val();
	
	if ( isNaN(value) || value == '' || value <= 0){
		alertError(poolName, window.lang['invalidnumber'] );
		return ;
	}
	if ( toAddress == '' ){
		return;
	}
	
	//limiting decimals precision in funds added-removed-transferred
	var mantissa = value.split('.')[1];
	if ( typeof mantissa !== 'undefined' && mantissa > 10**4 ){
		console.log("mantissa: "+mantissa+" - "+mantissa.length);
		alertError(poolName, window.lang['toomanydecimals'] );
		return;
	}
	
	console.log("Transferring KTC: "+web3.utils.toWei(value, 'ether'));
	tokenContract.methods.transferShare(web3.utils.utf8ToHex(poolName), web3.utils.toWei(value, 'ether'), toAddress).send({from: myAccount, gas: 900000}).then( (result) => {
		console.log(result);
		alertSuccess(poolName, window.lang['successTransferringFunds'] );
		updatePage();
	}).catch( (err) => {
		console.log(err);
		alertError(poolName, window.lang['errorTransferringFunds'] );
	});
	
}








