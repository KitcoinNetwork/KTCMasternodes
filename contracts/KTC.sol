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
	
	uint256[5] public tierReq = [ 100, 50, 20, 10, 5];
	uint256[5] public tierLimit = [ 101, 10000, 10000, 10000, 10000];
	uint256[5] public tierNumber = [ 0, 0, 0, 0, 0];
	//Yields in perthousand to allow 1 comma; careful in calculations
	uint256[5] public tierYield  = [ 80, 50, 40, 30, 20];
	
	mapping (address => Nodes) private _nodes;
	
	struct Nodes
    {
        uint8[5] tierNodes;
        uint32 lastWithdraw;
		uint256 lastBlockNumberWithdraw;
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
	* @dev Lock 10000 KTC to buy a masternode
	* Will lock owner tokens if masternode is registered
	* @return True if masternode is bought and tokens are burnt, false if not
	*/
	function buyMasternode(uint256 buyTierLevel) public returns (bool) {
		//fails if not enough funds
		require ( balanceOf(tx.origin) >= tierReq[ buyTierLevel ] * (uint256(10)**uint256(decimals())) );
		//fails if Tier1Limit is already reached
		require ( tierNumber[ buyTierLevel ] < tierLimit[ buyTierLevel ] );
		
		Nodes storage senderNodes = _nodes[tx.origin];

		//if user didn't have nodes before, set lastBlockNumberWithdraw to now
		if ( countNodes(senderNodes) == 0 ){
			senderNodes.lastBlockNumberWithdraw = block.number ;
		}
		else {
			//otherwise withdraw dividends first
			withdrawDividend();
		}
		
		//Add node to sender node list and remove/burn tokens from his balance
		senderNodes.tierNodes[buyTierLevel] = senderNodes.tierNodes[buyTierLevel] + 1;
		tierNumber[ buyTierLevel ] = tierNumber[ buyTierLevel ] + 1;
		_burn(tx.origin, tierReq[ buyTierLevel ] * (uint256(10)**uint256(decimals())) );
		
		return true;
	}
	
	/** 
	* @dev Send the dividends associated with all sender masternodes to him
	* and update the last withdrawal
	*/
	function withdrawDividend() public returns (uint256) {
		return withdrawDividends(tx.origin);
	}
	function withdrawDividends(address _address) private returns (uint256){
		Nodes storage senderNodes = _nodes[_address];
		
		//require timestamp to be at least older than XXX == limit withdrawals interval to avoid rounding errors but we don't care if decimals = 18
		//require ( block.number - senderNodes.lastBlockNumberWithdraw > 1440 );
		
		uint256 div = showDividend(tx.origin, block.number);
		_mint(tx.origin, div);
		senderNodes.lastBlockNumberWithdraw = block.number;
		return div;
	}
	
	/**
	* @dev Returns the dividends currently waiting to be withdrawn
	*/
	function showDividend(address _address, uint256 currentBlockNumber) public view returns (uint256) {
		//Nodes storage senderNodes = _nodes[msg.sender];
		//if ( countNodes() == 0 ) return 0;
		
		//Nodes memory node = _nodes[msg.sender];
		
		//if lastBlockNumberWithdraw>0 that means the address owns nodes
		if ( _nodes[_address].lastBlockNumberWithdraw > 0){
			uint256 period = currentBlockNumber - _nodes[_address].lastBlockNumberWithdraw;
			uint256 dividendsOwed = 0;
			for ( uint i = 0; i < tierReq.length ; i++ ){
				uint n =  _nodes[_address].tierNodes[i] ;
				//since blocktime is 1 second, we approximate dirtily, keep 360 days to compensate slight overtime
				//divide by 1000 since yield is expressed in perthousand not percent
				dividendsOwed = dividendsOwed + n * period * (uint256(10)**uint256(decimals())) * tierYield[i] / 1000 / 360 / 86400;
			}
			return dividendsOwed;
		}
		else
			return 0;
	}
	
	
	/**
	* @dev 
	*/
	function sellMasternode(uint sellTierLevel) public returns (bool) {
		require ( sellTierLevel > 0 );
		Nodes storage userNodes = _nodes[tx.origin];
		require( userNodes.tierNodes[ sellTierLevel ] > 0 );
		
		//withdraw and update dividend state
		withdrawDividend();
		
		//User has tier node, so remove from list and update(=mint) token balance
		userNodes.tierNodes[ sellTierLevel ] = userNodes.tierNodes[ sellTierLevel ] - 1;
		tierNumber[ sellTierLevel ] = tierNumber[ sellTierLevel ] - 1;
		_mint(msg.sender, tierReq[ sellTierLevel ] * (uint256(10)**uint256(decimals())) );
		return true;
	}
	
	
	function showMasternode(address _address) public view returns (uint8, uint8, uint8, uint8, uint8) {
		return (_nodes[_address].tierNodes[0],
				_nodes[_address].tierNodes[1],
				_nodes[_address].tierNodes[2],
				_nodes[_address].tierNodes[3],
				_nodes[_address].tierNodes[4]
				);
	}
	
	function transferMasternode(address _buyerAddress) public returns (bool){
		Nodes storage sellerNodes = _nodes[tx.origin];
		require( sellerNodes.tierNodes[ 0 ] > 0 );
		//first withdraw dividends for both buyer and seller to set things straight
		withdrawDividends(tx.origin);
		withdrawDividends(_buyerAddress);
		
		Nodes storage buyerNodes = _nodes[_buyerAddress];
		sellerNodes.tierNodes[0] = sellerNodes.tierNodes[0] - 1;
		buyerNodes.tierNodes[0] = buyerNodes.tierNodes[0] + 1;
		return true;
	}
	
	
	
}



