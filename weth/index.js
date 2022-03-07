const _ = require('underscore');
const fs = require('fs')
const Caver = require('caver-js')
const cavers = {
  'cypress': new Caver('https://public-node-api.klaytnapi.com/v1/cypress'),
  'baobab':  new Caver('https://public-node-api.klaytnapi.com/v1/baobab'),
  'alpha':   new Caver('http://3.34.31.114:8551'),
};
const caver = cavers['alpha'];

function loadContract() {
  const combinedJson = require('./WETH9.json');
  contracts = _.map(combinedJson.contracts, (c) => {
    return {abi: c.abi, bin: c.bin};
  });
  return contracts[0];
}

async function main() {
  var chainId = await caver.klay.getChainId();
  var gasPrice = await caver.klay.gasPriceAt('latest')
  gasPrice = parseInt(gasPrice);
  console.log('Using network chainId', chainId);
  console.log('..gasPrice is', gasPrice);

  var wallet = caver.wallet.keyring.createFromPrivateKey(
    '0x00000000000000000000000000000000000000000000000000000000cafebabe');
  caver.wallet.add(wallet);
  console.log('Wallet address', wallet.address);

  var balance = await caver.rpc.klay.getBalance(wallet.address);
  var nonce = await caver.rpc.klay.getTransactionCount(wallet.address);
  nonce = parseInt(nonce);
  console.log('..has', balance / 1e18, 'KLAY');
  console.log('..nonce', nonce);

  var { abi, bin } = loadContract();
  if (typeof abi == 'string')
    abi = JSON.parse(abi);
  var Contract = new caver.contract(abi);
  var methods = _.filter(_.keys(Contract.methods), s => s.includes('('));
  console.log('Loaded contract with methods:');
  console.log(methods);

  var deployTx = await Contract.deploy({ data: bin }).sign({
    from: wallet.address,
    nonce: nonce,
    chainId: chainId,
    gasPrice: gasPrice,
    gas: 3000000,
  });
  var receipt = await caver.rpc.klay.sendRawTransaction(deployTx);
  console.log('Deployed by txhash', receipt.transactionHash);
  console.log('..at block', parseInt(receipt.blockNumber));
  console.log('..at addr', receipt.contractAddress);
  console.log('..using gas', (receipt.gasUsed * receipt.gasPrice / 1e18), 'KLAY');

  var contract = new caver.contract(abi, receipt.contractAddress);
}

main();

