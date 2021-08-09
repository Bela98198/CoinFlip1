require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy') ;                               
require("hardhat-deploy-ethers")               
// require("hardhat-gas-reporter");  
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");



const ALCHEMY_API_KEY = "Ktq-WPKp3TVLxxiWYbduonD68-oneUsS";         //https://eth-rinkeby.alchemyapi.io/v2/Ktq-WPKp3TVLxxiWYbduonD68-oneUsS + 
const PRIVATE_KEY = "436e8b6dcdc5fb75e836febfb4c3b44444fce31bf5e63d3f5a857cb00f552e5f";  // + 
const ETHERSCAN_APIKEY = "TNKCH6TS8GRY99RCHMGEC7BK5F5393NI44";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html


const {
  normalizeHardhatNetworkAccountsConfig
} = require("hardhat/internal/core/providers/util")

const {
  BN,
  bufferToHex,
  privateToAddress,
  toBuffer
} = require("ethereumjs-util")

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const networkConfig = hre.config.networks["hardhat"]


  const accounts = normalizeHardhatNetworkAccountsConfig(networkConfig.accounts)

  console.log("Accounts")
  console.log("========")

  for (const [index, account] of accounts.entries()) {
    const address = bufferToHex(privateToAddress(toBuffer(account.privateKey)))
    const privateKey = bufferToHex(toBuffer(account.privateKey))
    const balance = new BN(account.balance).div(new BN(10).pow(new BN(18))).toString(10)
    console.log(`Account #${index}: ${address} (${balance} ETH)
Private Key: ${privateKey}
`)
}

});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
      "3": "0x0A82f1A2dD36c0b2707D267730b769ca599Cb193",
     // "4": "0xBf5b01f15D7e61E60a8672d8AfCB24621eb7f1B5"
    },
    caller: {
      default: 1,
      // "3": "0x0A82f1A2dD36c0b2707D267730b769ca599Cb193",
     // "4": "0xBf5b01f15D7e61E60a8672d8AfCB24621eb7f1B5"
    }
  },
  etherscan: {
    apiKey: "XEC7CGKNWPH4PUVY7JD7G47GZVRWIW787P",  //? 
  },
  solidity: "0.8.6",
};
