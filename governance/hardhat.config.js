require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
const fs = require('fs');
const stateFilePath = 'state.json';

task('tx', "Get transaction content")
.addParam("txid", "Transaction hash")
.setAction(async ({ txid }) => {
  const tx = await waffle.provider.getTransaction(txid);
  console.log(tx);

  const receipt = await waffle.provider.getTransactionReceipt(txid);
  console.log(receipt);
});

task("klays", "Get KLAY balances", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    var klay = await waffle.provider.getBalance(account.address);
    console.log('Account', account.address, klay / 1e18, 'KLAY');
  }
});

task("powers", "Get token balances and voting powers", async () => {
  const token = await attachToken();
  const accounts = await ethers.getSigners();

  var total = await token.totalSupply();

  for (const account of accounts) {
    var addr = account.address;
    var balance = await token.balanceOf(addr);
    var balanceShare = (balance * 100 / total).toFixed(2);
    var power = await token.getCurrentVotes(addr);
    var powerShare = (power * 100 / total).toFixed(2);
    console.log('Account', account.address,
                'balance', balanceShare, '% =', balance / 1e18,
                'power', powerShare, '% =', power / 1e18)
  }
});

task("give", "Give token")
.addOptionalParam("idx", "Account index", "1")
.addOptionalParam("pct", "Percent", "1")
.setAction(async ({ idx, pct }) => {
  var tx = await giveToken(idx, pct);
  var receipt = await tx.wait();
  console.log('Transfer to', idx, 'status', receipt.status);
});

task("giveall", "Give token to everyone")
.setAction(async () => {
  const shares = testShares;
  var waits = [];
  for (var i=0; i<10; i++) {
    var tx = await giveToken(i, shares[i]);
    waits.push(tx.wait());
  }

  var receipts = await Promise.all(waits);
  for (var i=0; i<10; i++) {
    console.log('Transfer to', i, 'status', receipts[i].status);
  }
});

async function giveToken(idx, pct) {
  const token = await attachToken();
  const accounts = await ethers.getSigners();

  var dst = accounts[idx].address;
  var total = await token.totalSupply();
  var rawAmount = total.mul(pct).div(100);
  console.log('Transfer to', idx, dst, pct, '%');

  var tx = await token.transfer(dst, rawAmount);
  return tx;
}

task("delegate", "Delegate power")
.addOptionalParam("from", "Sender account index", "1")
.addOptionalParam("to", "Receiver account index", "1")
.setAction(async ({ from, to }) => {
  const token = await attachToken();
  const accounts = await ethers.getSigners();

  var sender = accounts[from];
  var receiver = accounts[to];
  var tx = await token.connect(sender).delegate(receiver.address);
  console.log('Delegate', from, '->', to);
  var receipt = await tx.wait();
  console.log('Delegate', from, '->', to, 'status', receipt.status);
});

task("propose", "Create new proposal")
.setAction(async () => {
  const token = await attachToken();
  const governor = await attachGovernor();
  const accounts = await ethers.getSigners();

  var admin = accounts[0];
  var proposer = accounts[2];

  //var targetTx = await token.populateTransaction
  //  .transferFrom(ethers.constants.AddressZero, proposer.address, 7e18);

  var targets = [ethers.constants.AddressZero];
  var values = [0];
  var signatures = ['0x56785678'];
  var calldatas = ['0x12341234'];
  var description = 'test proposal';

  var ret = await governor.connect(proposer).callStatic.propose(
    targets, values, signatures, calldatas, description);
  console.log("When successful, proposal ID will be", ret.toString());

  var tx = await governor.connect(proposer).propose(
    targets, values, signatures, calldatas, description);
  var receipt = await tx.wait();
  console.log('Propose by', proposer.address, 'status', receipt.status);
});

task("status", "Get proposal status")
.addOptionalParam("id", "Proposal id", "1")
.setAction(async ({ id }) => {
  const governor = await attachGovernor();
  const accounts = await ethers.getSigners();

  var p = await governor.proposals(id);
  console.log(p);

  var s = await governor.state(id)
  console.log('status', ['Pending', 'Active', 'Cancelled', 'Defeated',
                         'Succeeded', 'Queued', 'Expired', 'Executed'][s]);
  for (const account of accounts) {
    var r = await governor.getReceipt(id, account.address);
    console.log(account.address,
      'voted?', r.hasVoted, 'yesno', r.support, 'votes', r.votes.toString());
  }
});

task("vote", "Vote for a proposal")
.addOptionalParam("id", "Proposal id", "1")
.addOptionalParam("idx", "Account index", "1")
.addOptionalParam("yesno", "yes/no (true/false)", "yes")
.setAction(async ({ id, idx, yesno }) => {
  const token = await attachToken();
  const governor = await attachGovernor();
  const accounts = await ethers.getSigners();

  var addr = accounts[idx].address;

  var prop = await governor.proposals(id);
  var power = await token.getPriorVotes(addr, prop.startBlock);
  console.log(addr, 'has', power.toString()/1e18, 'votes');

  var support = (yesno == 'yes' || yesno == 'true');
  var ret =  await governor.connect(accounts[idx]).callStatic.castVote(id, support);
  var tx = await governor.connect(accounts[idx]).castVote(id, support);
  var receipt = await tx.wait();
  console.log('Voted for proposal', prop.id.toString(), 'status', receipt.status);
})

task("deploy", "Deploy all contracts")
.addOptionalParam("target", "A contract name or 'all'", "all")
.setAction(async ({ target }) => {
  const accounts = await ethers.getSigners();
  const adminAddr = accounts[0].address;
  console.log('Deploying from account', adminAddr);

  const unitPrice = await waffle.provider.getGasPrice();
  const options = {};
  console.log('..using gasPrice', unitPrice / 1e9, 'ston');

  var state = readState();

  if (target == 'all' || target == 'token') {
    const mintAfter = Date.now()+10*1000;
    const Token = await hre.ethers.getContractFactory("Uni");
    const token = await Token.deploy(adminAddr, adminAddr, mintAfter, options);
    await token.deployed();
    console.log('Token deployed at', token.address);
    state['token'] = { address: token.address };
  }

  if (target == 'all' || target == 'timelock') {
    const timelockDelay = 30*1000;
    const Timelock = await hre.ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(adminAddr, timelockDelay, options);
    await timelock.deployed();
    console.log('Timelock deployed at', timelock.address);
    state['timelock'] = { address: timelock.address };
  }

  if (target == 'all' || target == 'governor') {
    const Governor = await hre.ethers.getContractFactory("GovernorAlpha");
    const governor = await Governor.deploy(
      state.timelock.address, state.token.address, options);
    await governor.deployed();
    console.log('Governor deployed at', governor.address);
    state['governor'] = { address: governor.address };
  }

  writeState(state);
});

async function attachToken() {
  const state = readState();
  if (!state.token) {
    console.log('Need to deploy first');
    return;
  }
  const Token = await hre.ethers.getContractFactory("Uni");
  const token = await Token.attach(state.token.address);
  return token;
}

async function attachGovernor() {
  const state = readState();
  if (!state.governor) {
    console.log('Need to deploy first');
    return;
  }
  const Governor = await hre.ethers.getContractFactory("GovernorAlpha");
  const governor = await Governor.attach(state.governor.address);
  return governor;
}

function readState() {
  if (fs.existsSync(stateFilePath)) {
    var json = fs.readFileSync(stateFilePath);
    var state = JSON.parse(json);
    return state[hre.network.name];
  } else {
    return {};
  }
}

function writeState(delta) {
  var state = {};
  if (fs.existsSync(stateFilePath)) {
    var json = fs.readFileSync(stateFilePath);
    state = JSON.parse(json);
  }

  var old = state[hre.network.name] || {};
  state[hre.network.name] = Object.assign(old, delta);

  var json = JSON.stringify(state, null, 2);
  fs.writeFileSync(stateFilePath, json + '\n');
}

const testPrivateKeys = [
  '0x00000000000000000000000000000000000000000000000000000000cafebabe',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee01',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee02',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee03',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee04',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee05',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee06',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee07',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee08',
  '0x00000000000000000000000000000000000000000000000000000000c0ffee09',
];

const testShares = [
  10, 10, 10, 10, 10,
  10, 10, 10, 10, 10,
];

const hardhatAccounts = testPrivateKeys.map(priv => {
  return {privateKey: priv, balance: (100*1e18).toString()}
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'precypress',
  networks: {
    precypress: {
      url: 'http://3.34.31.114:8551',
      chainId: 10000,
      gas: 10000000,
      gasPrice: 25000000000,
      accounts: testPrivateKeys,
    },
    baobab: {
      url: 'https://public-node-api.klaytnapi.com/v1/baobab',
      chainId: 1001,
      accounts: testPrivateKeys,
    },
    hardhat: {
      accounts: hardhatAccounts,
    },
  },
  solidity: {
    version: '0.5.16',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
};
