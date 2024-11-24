<div align="center">
  <img src="https://github.com/user-attachments/assets/8e4e3361-4930-45ef-addc-a0b576e8c56f" alt="logo" />
  <h1>Tsunagari/つながり - backend</h1>
  
</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Startup](#startup)
- [Configuration](#deployment)
- [Testing](#testing)
- [License](#license)

## Overview

**Tsunagari**(to connect) backend is a NestJS application for bridging tokens between **EVM** compatible chains.

## Features

- The system is designed to be modular and upgradeable, allowing for future enhancements and improvements.
- The system supports multiple backends(nodes), working together to provide a decentralized and secure bridge service.
- The system uses an gRPC client to interact with the Tsunagari API: https://github.com/vlady-kotsev/tsunagari-api.

## Startup

Starting a local setup of Tsunagari: https://github.com/vlady-kotsev/tsunagari-local

## Configuration

Place `config.json` in `<root>/config/default/`

Example config:

```json
{
  "app": {
    "murmur3Seed": 123,
    "grpcHost": "<grpc-host>",
    "grpcPort": "<grpc-port>",
    "grpcPassword": "<grpc_password>",
    "protoPath": "../proto/transactions.proto"
  },
  "websocket": {
    "reconnectInterval": 5000,
    "keepAliveCheckInterval": 10000,
    "expectedPongBack": 30000
  },
  "queue": {
    "name": "<queue-name>",
    "host": "<redis-host>",
    "port": "<redis-port>",
    "jobRetryDelay": 1000,
    "jobAddAttempts": 3
  },
  "redis": {
    "host": "<redis-host>",
    "port": "<redis-port>",
    "password": "<redis-password>",
    "retryDelay": 5000,
    "maxRetries": 10,
    "maxDelay": 30000
  },
  "wallet": {
    "privateKey": "<wallet-private-key>"
  },
  "networks": [
    {
      "name": "amoy",
      "bridgeAddress": "<bridge-address>",
      "rpcUrl": "<rpc-url>",
      "wsUrl": "<ws-url>",
      "chainId": "<chain-id>"
    },
    {
      "name": "taiko",
      "bridgeAddress": "<bridge-address>",
      "rpcUrl": "<rpc-url>",
      "wsUrl": "<ws-url>",
      "chainId": "<chain-id>"
    }
  ],
  "tokens": {
    "80002": {
      "0x43C3176222275dd9cb55CF167Ac322ec170a5BcB": {
        "name": "AmoyNativeToken",
        "symbol": "ANT",
        "wrapped": {
          "167009": "0xb892F6638bE64e70B053a9f988624BAf12bBE5D5"
        }
      },
      "0x20d131eA180bA673F365b7e04666e90B2eF7eb32": {
        "name": "WrappedTaikoNativeToken",
        "symbol": "WTNT",
        "native": {
          "167009": "0xDA79D9B7FAc84C3Bc49290Fd8Dfcae2eB2a0e1F6"
        }
      }
    },
    "167009": {
      "0xDA79D9B7FAc84C3Bc49290Fd8Dfcae2eB2a0e1F6": {
        "name": "TaikoNativeToken",
        "symbol": "TNT",
        "wrapped": {
          "80002": "0x20d131eA180bA673F365b7e04666e90B2eF7eb32"
        }
      },
      "0xb892F6638bE64e70B053a9f988624BAf12bBE5D5": {
        "name": "WrappedAmoyNativeToken",
        "symbol": "WANT",
        "native": {
          "80002": "0x43C3176222275dd9cb55CF167Ac322ec170a5BcB"
        }
      }
    }
  }
}
```

## Testing

Run unit test with coverage:

```bash
npm run test:cov
```

Run end-to-end tests:

Prerequisites:
- Anvil: https://book.getfoundry.sh/anvil/installation/
- Docker: https://www.docker.com/

```bash
npm run test:e2e
```

## License

This project is licensed under the MIT License:

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
