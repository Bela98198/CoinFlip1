pragma solidity 0.8.6;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
//import "hardhat/console.sol";

contract CoinFlip is Ownable {
    struct Game {
        uint256 id;
        address payable player;
        uint256 bet;
        uint256 prize;
        uint256 choice;
        uint256 result;
        GameState state;
    }

    enum GameState {PENDING, WON, LOST}

    /// Number of all games
    uint256 public totalGamesCount;
    /// Coefficient for win. x / 100
    uint256 public WIN_COEFFICIENT = 195;
    /// Minimal amount for bet
    uint256 public minEtherBet = 0.1 ether;
    /// Maximal amount for bet
    uint256 public maxEtherBet = 10 ether;
    /// Profit from bets
    int256 public houseProfitEther;

    /// Croupier
    address public croupier;
    /// Person how will receive houseProfitEther
    address public profitTaker;

    /// Info of each game
    mapping(bytes32 => Game) public games;

    /// Games seeds
    bytes32[] public listGames;

    event GameCreated(
        address indexed player,
        uint256 bet,
        uint256 choice,
        bytes32 seed
    );

    event GamePlayed(
        address indexed player,
        uint256 bet,
        uint256 prize,
        uint256 choice,
        uint256 result,
        bytes32 indexed seed,
        GameState state
    );

    constructor() {
        croupier = msg.sender;
        profitTaker = msg.sender;
    }

    // Modifier for functions that can only be ran by the croupier
    modifier onlyCroupier() {
        require(
            msg.sender == croupier,
            'Only the croupier can run this function.'
        );
        _;
    }

    // Modifier for functions that can only be ran by the profit taker
    modifier onlyProfitTaker() {
        require(
            msg.sender == profitTaker,
            "Only the profit taker can run this function."
        );
        _;
    }

    // Check that the rate is between min and max bet
    modifier betInRange() {
        require(minEtherBet <= msg.value && msg.value <= maxEtherBet, 'Rate is not between min and max bet');
        _;
    }

    /// Check that sedd is unique
    modifier uniqueSeed(bytes32 _seed) {
        require(games[_seed].id == 0, "Seed already used");
        _;
    }

    /**
        * @notice Add new game
        * @param _seed: Uniqual value for each game
    */
    function play(uint256 _choice, bytes32 _seed) public payable betInRange uniqueSeed(_seed) {
        require(_choice == 0 || _choice == 1, 'Choice should be 0 or 1');

        uint256 possiblePrize = msg.value * WIN_COEFFICIENT / 100;
        require(
            possiblePrize < address(this).balance,
            'Insufficent funds on contract to cover the bet'
        );

        Game storage game = games[_seed];

        totalGamesCount++;

        game.id = totalGamesCount;
        game.player = payable(msg.sender);
        game.bet = msg.value;
        game.choice = _choice;
        game.state = GameState.PENDING;

        houseProfitEther += int256(game.bet);
        listGames.push(_seed);

        emit GameCreated(
            game.player,
            game.bet,
            game.choice,
            _seed
        );
    }

    /**
        * @notice Confirm the game, with seed
        * @param _seed: Uniqual value for each game
    */
    function confirm(
        bytes32 _seed,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public onlyCroupier {
        Game storage game = games[_seed];

        require(game.state == GameState.PENDING, 'Game already played');

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, _seed));

        require(ecrecover(prefixedHash, _v, _r, _s) == croupier, 'Invalid signature');

        game.result = uint256(_s) % 2;
        
        if (game.choice == game.result) {
            game.prize = game.bet * WIN_COEFFICIENT / 100;
            game.state = GameState.WON;
            
            houseProfitEther -= int256(game.prize);
            
            game.player.transfer(game.prize);
        } else {
            game.prize = 0;
            game.state = GameState.LOST;
        }

        emit GamePlayed(
            game.player,
            game.bet,
            game.prize,
            game.choice,
            game.result,
            _seed,
            game.state
        );
    }

    /**
        * @notice Set new minEtherBet and maxEtherBet
        * @param _min: New minEtherBet
        * @param _max: New maxEtherBet
    */
    function setBetRange(uint256 _min, uint256 _max) public onlyOwner {
        minEtherBet = _min;
        maxEtherBet = _max;
    }

    /**
        * @notice Set new WIN_COEFFICIENT    
        * @param amount: New WIN_COEFFICIENT
    */
    function setWinCoefficient(uint256 amount)
        public
        onlyOwner
        returns (uint256)
    {
        WIN_COEFFICIENT = amount;
        return WIN_COEFFICIENT;
    }

    /**
        * @notice Set new croupier
        * @param _croupier: New croupier
    */
    function setCroupier(address _croupier) public onlyOwner {
        croupier = _croupier;
    }

    /**
        * @notice Set new profitTaker
        * @param _profitTaker: New profitTaker
    */
    function setProfitTaker(address _profitTaker) public onlyOwner {
        profitTaker = _profitTaker;
    }

    /**
        * @notice sends houseProfitEther to profitTaker
    */
    function takeProfit() public onlyProfitTaker {
        if (houseProfitEther > 0) {
            payable(profitTaker).transfer(uint256(houseProfitEther));
            houseProfitEther = 0;
        }
    }

    /**
        * @notice sends contract's excessive balance to owner
    */
    function withdraw() public onlyOwner {
        if (houseProfitEther > 0) {
            payable(owner()).transfer(address(this).balance - uint256(houseProfitEther));
            return;
        } 

        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}

    // Fallback function
    fallback() external {}
}