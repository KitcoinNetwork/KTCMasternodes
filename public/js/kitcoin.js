var tokenContract;
var userAccount;
var tierROI = [ 20, 10, 8, 6, 5, 0];
var myAccount;
var maxGas = 4900000;
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
        //window.web3 = new Web3(new Web3.providers.HttpProvider("http://47.244.152.188/zlMOcq5cppnTUPlMz5wUCOK9udioH7LG"));
    }
	//web3.eth.getAccounts(console.log);
	console.log(web3.version);
	
	//TODO: run after setting contract address
	//listMyPools();
	//document.getElementById("address").value = (await web3.eth.getAccounts())[0];
	myAccount = web3.eth.accounts[0];
	connectContract();
	updatePage();
})


function fromHex(hex){
	var str;
	
  try{
    str = decodeURIComponent(hex.substr(2).replace(/(..)/g,'%$1'))
  }
  catch(e){
    str = hex
    console.log('invalid hex input: ' + hex)
  }
  return str.replace(/\0+$/, '').replace(' ','_');
}


function toHex(str){
	var hex;
  try{
    hex = unescape(encodeURIComponent(str.replace('_',' ')))
    .split('').map(function(v){
      return v.charCodeAt(0).toString(16)
    }).join('')
  }
  catch(e){
    hex = str
    console.log('invalid text input: ' + str)
  }
  var pad ="000000000000000000000000000000000000000000000000000000000000000000";
  return "0x" + hex + pad.substring(0, pad.length - hex.length - 2) 

}





function connectContract(){
	if ( tokenContract == null ){
		//Prod address
		var contractAddress = "0x9951B16b68A7c54456726244370d03264D2f6C72"
		//Dev address 
		//var contractAddress = "0x77c7C8C60283eBC3774aE4fCBe4F25530E4edC8A";
		var contractABI = human_standard_token_abi;
		tokenContract = web3.eth.contract(contractABI).at(contractAddress);
	}
}
	


function updatePage() {
	//connectContract();
	getKTCBalance();
	updateNetworkStatus();
	listMyPools();
}

function getKTCBalance() {
	//connectContract();
	tokenContract.balanceOf(myAccount,  function (err, res)  {
		document.getElementById("myBalance").innerHTML = Math.trunc(res / 10**12) / 10**6 ;
	});
}

function updateNetworkStatus(){
	/* Updating network status: masternode numbers */
	tokenContract.totalSupply(function (err, totalSupply) {
		$("#totalSupply").text(Math.trunc((totalSupply)/10**18));
	});
	tokenContract.tierNumber(0, function (err, numTier) {
		$("#tier1n").text(numTier);
	});
	tokenContract.tierNumber(1, function (err, numTier) {
		$("#tier2n").text(numTier);
	});
	tokenContract.tierNumber(2, function (err, numTier) {
		$("#tier3n").text(numTier);
	});
	tokenContract.tierNumber(3, function (err, numTier) {
		$("#tier4n").text(numTier);
	});
	tokenContract.tierNumber(4, function (err, numTier) {
		$("#tier5n").text(numTier);
	});

}


function claimDividends(poolName){
	//connectContract();
	//console.log("Claim dividends at block: "+(await web3.eth.getBlockNumber()));
	
	tokenContract.withdrawPoolDividends(toHex(poolName), {from: myAccount, gas: maxGas}, function (err, res) {
		if (err) {
			console.log(err);
			alertError(poolName, window.lang['errorDividends'] );
		} else {
			alertSuccess(poolName, window.lang['successDividends'] );
			getKTCBalance();
		}
	});
}


function searchPool(){
	//connectContract();
	
	var poolName = document.getElementById("searchPool").value;
	var poolNameWeb3 = toHex(poolName);
	console.log(poolNameWeb3);

	tokenContract.getPoolStatus(poolNameWeb3, myAccount, function (err, poolInfo) {
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



function listMyPools(){
	//connectContract();
	$("#poolList").empty();
	document.getElementById('balanceInPools').innerHTML = 0;
	tokenContract.getMyPools(myAccount, function(err, res){
		console.log(res, err);
		res.forEach( function(poolName){
			console.log(poolName);
			var pool = poolName;
			tokenContract.getPoolStatus(pool, myAccount, function(err, poolInfo){
				document.getElementById('balanceInPools').innerHTML = parseInt(document.getElementById('balanceInPools').innerHTML) + Math.trunc(poolInfo[4]/10**12) / 10**6;
				var poolName = fromHex(pool);
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
					$('.hidd').hide();
			});

		});
		if ( res.length == 0 ){
		$('#poolList').append('<div class="dashboard-container mh-15"><div style="padding-top: 40px; text-align: center;">'+
					window.lang["youarenotinapool"]+'<br><a href="#" onclick="$(\'#pills-profile-tab\').tab(\'show\')">'+
					window.lang["joinapool"]+'</a></div></div>');
		}
	});

	
}

function alertError(appendToDiv, errorMessage){
	$('#error-alert').remove();
	$('#'+appendToDiv).append('<div class="alert alert-danger" id="error-alert">'+errorMessage+'</div>');
	$("#error-alert").fadeTo(8000, 500).slideUp(500, function(){
		$("#error-alert").slideUp(500);
	});
}
function alertSuccess(appendToDiv, errorMessage){
	$('#success-alert').remove();
	$('#'+appendToDiv).append('<div class="alert alert-success" id="success-alert">'+errorMessage+'</div>');
	$("#success-alert").fadeTo(8000, 500).slideUp(500, function(){
		$("#success-alert").slideUp(500);
	});
}


function createPool(){
	connectContract();
	
	var name = document.getElementById("createPool").value;
	//forbid special chars cuz it interfers with the frontend
	var match = /[*?\-+^${}[\]().|\\\'\"\/\&`~%;,:!_@<>=§#²]/.exec(name);
	if ( ! /^[a-z0-9\u4e00-\u9fa5]+$/i.test(name) ) {
		//console.log(match.index);
		alertError("createAPool", "Bad characters");
		return;
	}
	
	tokenContract.createPool(toHex(name), {from: myAccount, gas: maxGas}, function(err, result) {
		if (err) alertError("createAPool", window.lang['errorCreatingPool'] );
		else {
			alertSuccess("createAPool", window.lang['successCreatingPool'] );
			updatePage();
		}
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
	
	tokenContract.joinPool(toHex(poolName), value*10**18, {from: myAccount, gas: maxGas}, function (err, result) {
		//console.log(result);
		if (err) {
			console.log(err);
			alertError(poolName, window.lang['errorAddingFunds'] );
		}else {
			alertSuccess(poolName, window.lang['successAddingFunds'] );
			updatePage();
		}
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
	
	tokenContract.leavePool(toHex(poolName), value*10**18, {from: myAccount, gas: maxGas}, function (err, result) {
		if (err) alertError(poolName, window.lang['errorWithdrawingFunds'] );
		else {
			alertSuccess(poolName, window.lang['successWithdrawingFunds'] );
			updatePage();
		}
		
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
	
	console.log("Transferring KTC: "+value*10**18);
	tokenContract.transferShare(toHex(poolName), value * 10**18, toAddress, {from: myAccount, gas: maxGas}, function( err, result) {
		if (err) alertError(poolName, window.lang['errorTransferringFunds'] );
		else {
			console.log(result);
			alertSuccess(poolName, window.lang['successTransferringFunds'] );
			updatePage();
		}
	});
	
}








