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
        "grpcHost": "api",
        "grpcPort": "5000",
        "grpcPassword": "grpcpass",
        "protoPath": "../proto/transactions.proto"
    },
    "websocket": {
        "reconnectInterval": 5000,
        "keepAliveCheckInterval": 60000
    },
    "queue": {
        "name": "bridge-queue",
        "host": "redis",
        "port": 6379,
        "jobRetryDelay": 1000,
        "jobAddAttempts": 3
    },
    "redis": {
        "host": "redis",
        "port": 6379,
        "password": "password",
        "retryDelay": 5000,
        "maxRetries": 10,
        "maxDelay": 30000
    },
    "evm": {
        "wallet": {
            "privateKey": "<evm_private_key>"
        },
        "networks": [
            {
                "name": "taiko",
                "bridgeAddress": "0xC1025CbAc0C44EE3d1990BFb0581367433cC4901",
                "rpcUrl": "<evm_rpc>",
                "wsUrl": "<evm_ws_rpc>",
                "chainId": 167009
            },
            {
                "name": "base",
                "bridgeAddress": "0xC6D23FD19Ea36B9c75e9Aa5A09f33f39df78d344",
                "rpcUrl": "<evm_rpc>",
                "wsUrl": "<evm_ws_rpc>",
                "chainId": 84532
            }
        ],
        "tokens": {
            "167009": {
                "0xFE928174dD13f86199898b8Cb26a88311D27E9a1": {
                    "name": "TaikoNativeToken",
                    "symbol": "TNT",
                    "wrapped": {
                        "84532": "0x64aB6E6b1E2243B39D0d483ef58F86C775119159",
                        "0": "EFqwiLvu7oeGi4y9L6N5wYscX5GHs1LfQFFbBEQ6CCxu"
                    }
                },
                "0xc3001071c3f7E2084B2Bf79CD4f085d51F6226d8": {
                    "name": "WrappedBaseNativeToken",
                    "symbol": "WANT",
                    "native": {
                        "84532": "0x8A5C9D7AF6C168FC986bb94874fACDb8445199f7"
                    }
                },
                "0x9C7da31D569c6Ad0B2F8f2EFA9D91B0fa1e77184": {
                    "name": "WrappedSolanaNativeToken",
                    "symbol": "WSNT",
                    "native": {
                        "0": "Eny4Cdvbxos72WVY2RP4oNxELbF361EXgdCk6mDRarSK"
                    }
                }
            },
            "84532": {
                "0x8A5C9D7AF6C168FC986bb94874fACDb8445199f7": {
                    "name": "BaseNativeToken",
                    "symbol": "BNT",
                    "wrapped": {
                        "167009": "0xc3001071c3f7E2084B2Bf79CD4f085d51F6226d8",
                        "0": "D2Zq2bo7aELGtWpAbw3ZHSrUosRAKept9iiQ1obkCzZB"
                    }
                },
                "0x64aB6E6b1E2243B39D0d483ef58F86C775119159": {
                    "name": "WrappedTaikoNativeToken",
                    "symbol": "WTNT",
                    "native": {
                        "167009": "0xFE928174dD13f86199898b8Cb26a88311D27E9a1"
                    }
                },
                "0x475F383441E5998c7EdFa9c6E4B54784904a3ae3": {
                    "name": "WrappedSolanaNativeToken",
                    "symbol": "WSNT",
                    "native": {
                        "0": "Eny4Cdvbxos72WVY2RP4oNxELbF361EXgdCk6mDRarSK"
                    }
                }
            }
        }
    },
    "solana": {
        "wallet": {
            "privateKey": "<solana_secret_key>"
        },
        "network": {
            "bridgeAddress": "NfuWnZr8HR4mxULPG61Nh7zSbdinwGtNQGVoeuxM5Jf",
            "rpcUrl": "<solana_rpc>",
            "wsUrl": "<solana_ws_rpc>"
        },
        "tokens": {
            "Eny4Cdvbxos72WVY2RP4oNxELbF361EXgdCk6mDRarSK": {
                "name": "SolanaNativeToken",
                "symbol": "SNT",
                "wrapped": {
                    "84532": "0x475F383441E5998c7EdFa9c6E4B54784904a3ae3",
                    "167009": "0x9C7da31D569c6Ad0B2F8f2EFA9D91B0fa1e77184"
                }
            },
            "D2Zq2bo7aELGtWpAbw3ZHSrUosRAKept9iiQ1obkCzZB": {
                "name": "WrappedBaseNativeToken",
                "symbol": "WBNT",
                "native": {
                    "84532": "0x8A5C9D7AF6C168FC986bb94874fACDb8445199f7"
                }
            },
            "EFqwiLvu7oeGi4y9L6N5wYscX5GHs1LfQFFbBEQ6CCxu": {
                "name": "WrappedTaikoNativeToken",
                "symbol": "WTNT",
                "native": {
                    "167009": "0xFE928174dD13f86199898b8Cb26a88311D27E9a1"
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
