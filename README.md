# uniswap-klaytn

Copy of [Uniswap](https://github.com/Uniswap) governance [contracts](https://github.com/Uniswap/governance) and [webapp](https://github.com/Uniswap/interface).
Modified to support [Klaytn](https://github.com/klaytn/klaytn) network.

Unlike original source, this repository contains all libraries in this monorepo.

## Run interface

```
cd interface
yarn
PORT=3001 yarn start
```

## Deploy governance

```
cd governance
yarn
npx hardhat deploy
npx hardhat giveall
npx hardhat powers
```

