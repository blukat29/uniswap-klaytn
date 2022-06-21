# uniswap-klaytn

Copy of [Uniswap](https://github.com/Uniswap) governance [contracts](https://github.com/Uniswap/governance) and [webapp](https://github.com/Uniswap/interface).
Modified to support [Klaytn](https://github.com/klaytn/klaytn) network.

Unlike original source, this repository contains all libraries in this monorepo.

## Deploy governance

```
cd governance
yarn
npx hardhat deploy
npx hardhat giveall
npx hardhat powers
npx hardhat propose
```

## Run interface

```
cd interface
yarn
PORT=3001 yarn start
```

Now go to http://localhost:3001/#/vote. Do not access other menus.

## Initial setup for custom contracts
After running `npx hardhat deploy`, an address for each contract is shown.
Change `KLAYTN_RC`s in `interface/src/constants/addresses.ts` with those addresses:

```
export const UNI_ADDRESS: AddressMap = {
    // ...
  [SupportedChainId.KLAYTN_RC]: <FILL ME>,
}
export const MULTICALL_ADDRESS: AddressMap = {
    // ...
  [SupportedChainId.KLAYTN_RC]: <FILL ME>,
}
export const GOVERNANCE_ALPHA_V0_ADDRESSES: AddressMap = {
    // ...
  [SupportedChainId.KLAYTN_RC]: <FILL ME>,
}
```

If chainID needs to be set, change chainID in `interface/src/constants/chains.ts`:
```
  KLAYTN_RC = <FILL ME>,
```
