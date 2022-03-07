#!/bin/sh

[ -f WETH9.json ] || solc --combined-json bin,bin-runtime,abi --optimize - < ./WETH9.sol > WETH9.json

node index.js

