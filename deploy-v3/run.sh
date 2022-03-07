#!/bin/bash

#npx @uniswap/deploy-v3 \
#    -pk 0x00000000000000000000000000000000000000000000000000000000cafebabe \
#    -w9 0x97557699c3cb0d08a07923c713333e785d3b9a66 \
#    -j https://public-node-api.klaytnapi.com/v1/baobab \
#    -ncl KLAY \
#    -o 0xaB36568200B0f2B262107e4E74C68d6E8729Da39 \
#    -g 750 \
#    -c 1

npx @uniswap/deploy-v3 \
    -pk 0x00000000000000000000000000000000000000000000000000000000cafebabe \
    -w9 0x61db0986a1bc501b20adcf5b57029b96d6ea7ffb \
    -j http://3.34.31.114:8551 \
    -ncl KLAY \
    -o 0xaB36568200B0f2B262107e4E74C68d6E8729Da39 \
    -g 25 \
    -c 1

