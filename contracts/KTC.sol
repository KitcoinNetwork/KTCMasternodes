pragma solidity  >=0.4.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**  
* @title KTC is a basic ERC20 Token  
*/  
contract KTC is ERC20, ERC20Detailed {
	using SafeMath for uint256;
	
	uint256 public constant initial_supply = 60000000;  
	uint256 public constant scaling = uint256(10) ** 8;
	
	uint256[5] public tierReq = [ 10000, 5000, 2000, 1000, 500];
	uint256[5] public tierLimit = [ 101, 1000000, 1000000, 1000000, 10000000];
	uint256[5] public tierNumber = [ 0, 0, 0, 0, 0];
	//Yields in percent
	uint256[5] public tierYield  = [ 20, 13, 10, 7, 5];
	
	uint256 public constant POOL_CREATION_COST = 100;
	
	mapping (address => Nodes) private _nodes;
	mapping (bytes32 => Pool) public _pools;
	//mapping from an address to a list of pools the user belongs to
	mapping (address => MyPools) private _mypools;
	
	struct Nodes
    {
        uint8[5] tierNodes;
        uint32 lastWithdraw;
		uint256 lastBlockNumberWithdraw;
    }
	
	struct Pool
	{
		//membersStake array is the mapping of members address to their pool share
		mapping (address => uint256) membersStake;
		//for iteration, we keep a list of all members
		address[] members;
		uint256 tierLevel;
		uint256 balance;
		uint256 lastBlockNumberWithdraw;
	}
	
	struct MyPools
	{
		bytes32[] pools;
	}
	
	//TODO: convert all values to decimals * real value for calculation purposes
	

	/**  
	* @dev assign totalSupply to account creating this contract 
	*/
	constructor()
		ERC20Detailed("KitCoin", "KTC", 18)
		public 
	{  
		_mint(msg.sender, initial_supply * (uint256(10)**uint256(decimals())));
	}
	
	/**
	* @dev Count current total masternodes
	*/
	function countNodes ( Nodes memory n) private view returns (uint16){
		uint16 nodeCount = 0;
		for ( uint i = 0; i < tierReq.length ; i++ ){
			if ( n.tierNodes[i] > 0 ){
				nodeCount = nodeCount + n.tierNodes[i];
			}
		}
		return nodeCount;
	}
	/* test function for msg.sender / tx.origin
	function bal () public view returns (uint256){
		require( balanceOf(tx.origin) >= 0 );
		return balanceOf(tx.origin);
	}*/
	
	
	/**
	* @dev Creates a new pool with the name _name
	* @return the name of the pool if successful
	*/
	function createPool(bytes32 _name) public returns (bytes32){
		//pool must not already exist
		require ( _pools[_name].lastBlockNumberWithdraw == 0 );
		
		//create the pool
		Pool storage p = _pools[_name] ;
		
		//require an initial deposit to create the pool
		uint256 cost = POOL_CREATION_COST * (uint256(10)**uint256(decimals()));
		require ( balanceOf(tx.origin) > cost );
		_burn(tx.origin, cost );
		
		//initialize the withdrawal date
		p.lastBlockNumberWithdraw = block.number;
		//add creator's address to the list of pool members
		p.members.push(tx.origin);
		//set creator's share
		p.membersStake[tx.origin] = cost;
		
		//update pool status
		p.tierLevel = 5;
		p.balance = cost;
		//add pool to _mypools
		_mypools[tx.origin].pools.push(_name);
		
		return _name;
	}
	
	
	/**
	* @dev Join a pool or increase pool share
	*/
	function joinPool(bytes32 _name, uint256 value) public  {
		Pool storage p = _pools[_name];
		//check that pool exists && not a tier 0 pool
		require ( p.lastBlockNumberWithdraw != 0 && p.tierLevel != 0 );

		//check if allowed: TODO does not overflow max pool stake && pool not already tier0
		require ( p.tierLevel != 0 );
		
		//update pool dividends
		withdrawPoolDividends(_name);
		
		//if not yet a member, add to members[] and add to _mypools list
		if ( p.membersStake[tx.origin] == 0 ){
			p.members.push(tx.origin);
			_mypools[tx.origin].pools.push(_name);
		}

		//add value to current stake
		p.membersStake[tx.origin] = p.membersStake[tx.origin] + value;
		//remove value from user's balance
		_burn(tx.origin, value );
		
		uint256 currentTier = p.tierLevel;
		//update pool status: if current tier is not already max && we passed in a new level && ??? TODO define better
		uint256 couldBeTier = poolLevel ( p.balance + value );
		if ( couldBeTier < currentTier ){
			//if pool changes tier, update network status
			p.tierLevel = couldBeTier;
			//if level was not 5 == tierNumber.length (that is, no level reached yet), then decrease corresponding tierNumber
			if ( currentTier < tierNumber.length ){
				tierNumber[currentTier] = tierNumber[currentTier] - 1;
			}
			tierNumber[couldBeTier] = tierNumber[couldBeTier] + 1;
		}
		//update pool balance
		p.balance = p.balance + value;
	}
	
	/**
	* @dev Get the highest level a pool would have with given balance, checking for tier limits
	*/
	function poolLevel( uint balance ) public view returns (uint256) {
		//we start with the highest pool, i.e tier 0
		for ( uint256 i = 0; i < tierReq.length ; i++ ){
			if ( balance >= (tierReq[i] *uint256(10)**uint256(decimals()) ) && tierNumber[i] < tierLimit[i] )
				return i;
		}
		//can't be in any tier: return tierReq.length, that is 1 higher than max
		return tierReq.length;
	}
	
	
	/**
	* @dev Distribute pool dividends to all users
	*/
	function withdrawPoolDividends(bytes32 _name) public {
		//Pool storage p = _pools[_name];
		if ( _pools[_name].lastBlockNumberWithdraw > 0 && _pools[_name].tierLevel < tierReq.length  ){
			for ( uint256 i = 0; i < _pools[_name].members.length ; i++ ){
				address memberAdd = _pools[_name].members[i];
				uint256 period = block.number - _pools[_name].lastBlockNumberWithdraw;
				//since blocktime is 1 second, we approximate dirtily, keep 360 days to compensate slight overtime
				uint256 div = _pools[_name].membersStake[memberAdd] * period * tierYield[_pools[_name].tierLevel] / 100 / 360 / 86400;
				_mint(memberAdd, div );
			}
		}
	}
	
	
	/**
	* @dev Shows one pool's total pending dividends
	*/
	function showPoolDividends(bytes32 _name, uint256 currentBlockNumber) public view returns (uint256) {
		//if the pool exists && the tierLevel is not over the definition (currently 5)
		if ( _pools[_name].lastBlockNumberWithdraw > 0 && _pools[_name].tierLevel < tierReq.length ){
			uint256 period = currentBlockNumber - _pools[_name].lastBlockNumberWithdraw;
			//since blocktime is 1 second, we approximate dirtily, keep 360 days to compensate slight overtime
			uint256 dividendsOwed = _pools[_name].balance * period * tierYield[_pools[_name].tierLevel] / 100 / 360 / 86400;

			return dividendsOwed;
		}
		else
			return 0;
	}
	
	
	/**
	* @dev Removes part or all a given stakeholder funds from a pool
	*/
	function leavePool(bytes32 _name, uint256 value) public  {
		Pool storage p = _pools[_name];
		//check that pool exists
		require ( p.lastBlockNumberWithdraw != 0 );

		//check if allowed: TODO does not overflow max pool stake && pool not already tier0
		require ( p.tierLevel != 0 );
		
		//update pool dividends
		withdrawPoolDividends(_name);
		
		//if withdraw >= curent stake, remove the user completely
		if ( value >= p.membersStake[tx.origin]  ){
			//remove member from pool's member list & from user's pool list
			removeFromPoolMemberList(p.members, tx.origin);
			removeFromUserPoolList(_mypools[tx.origin].pools, _name);
			
			_mint(tx.origin, p.membersStake[tx.origin]);
			p.membersStake[tx.origin] = 0;
		} else {
			//if withdraw less than all, just mint the value and remove from balance
			_mint(tx.origin, value );
			p.membersStake[tx.origin] = p.membersStake[tx.origin] - value;
		}

		p.balance = p.balance - value;
		if ( p.balance > 0 ){
			uint256 currentTier = p.tierLevel;
			uint256 couldBeTier = poolLevel(p.balance);
			if ( couldBeTier > currentTier ){
				//if the pool changes tier (increase number, that is decrease reward), needs to update network status
				p.tierLevel = couldBeTier;
				//if decreased to 5 == tierNumber.length (that is, no level reached yet), then decrease corresponding tierNumber
				if ( couldBeTier < tierNumber.length ){
					tierNumber[couldBeTier] = tierNumber[couldBeTier] + 1;
				}
				tierNumber[currentTier] = tierNumber[currentTier] - 1;
				
			}
		}
		else {
			delete _pools[_name];
		}
	}
	
	
	/**
	* @dev transfers part or totality of a user's pool funds to another address (necessary for locked pools where withdrawals are not allowed)
	*/
	function transferShare(bytes32 _name, uint256 value, address _toAddress) public {
		Pool storage p = _pools[_name];
		require ( p.membersStake[tx.origin] >= value );
		//update pool dividends
		withdrawPoolDividends(_name);
		
		//if dest isn't part of the group, add him to the group, add the group to his list
		if ( p.membersStake[_toAddress] == 0 ){
			p.members.push(_toAddress);
			_mypools[_toAddress].pools.push(_name);
		}
		//add Balance to User
		p.membersStake[_toAddress] = p.membersStake[_toAddress] + value;
		
		//remove balance from sending User
		p.membersStake[tx.origin] = p.membersStake[tx.origin] - value;
		
		//if sending User has transferred his whole stake, i.e now his value in the pool is 0
		if ( p.membersStake[tx.origin] == 0){
			removeFromPoolMemberList(p.members, tx.origin);
			removeFromUserPoolList(_mypools[tx.origin].pools, _name);
		}
		
	}
	
	
	
	/**
	* @dev removes an address from the address[] members list of a pool's members
	*/
	function removeFromPoolMemberList(address[] storage members, address _address) private {
		for (uint i =0; i < members.length; i++){
			if ( members[i] == _address ){
				if ( i < members.length - 1 ) {
					//if not the last element, replace it by the last element and remove the last
					members[i] = members[ members.length - 1];
				}
				delete members[members.length - 1];
				members.length = members.length - 1;
				return;
			}
		}
	}
	
	
	/**
	* @dev Removes a bytes32 poolName from a user's pool list
	*/
	function removeFromUserPoolList(bytes32[] storage pools, bytes32 _name)private {
		for ( uint i =0; i < pools.length; i++){
			if ( pools[i] == _name ){
				//if i is not the last element, "swap" with last
				if (i < pools.length - 1){
					pools[i] = pools[pools.length -1];
				}
				//remove last element
				delete pools[pools.length -1];
				pools.length = pools.length - 1;
				return;
			}
		}
	}

	
	/**
	* @dev Get information about a pool that _address belongs to
	* @return pool's members, tierLevel, pending dividends, total balance and arg _address balance
	*/
	function getPoolStatus(bytes32 _name, address _address) public view returns (uint, uint256, uint256, uint256, uint256){
		return ( _pools[_name].members.length, _pools[_name].tierLevel, showPoolDividends(_name, block.number), _pools[_name].balance, _pools[_name].membersStake[_address] );
	}

	
	/**
	* @dev Provides a list of pools a user is in
	* Warning: doesn't work from solidity, has to be called from web3js (so no unit tests)
	* @return 
	*/
	function getMyPools(address _address) public view returns (bytes32[] memory) {
		return _mypools[_address].pools ;
	}
	
}



