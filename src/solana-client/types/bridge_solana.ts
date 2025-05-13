/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/bridge_solana.json`.
 */
export type BridgeSolana = {
  "address": "NfuWnZr8HR4mxULPG61Nh7zSbdinwGtNQGVoeuxM5Jf",
  "metadata": {
    "name": "bridgeSolana",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addSupportedToken",
      "discriminator": [
        109,
        142,
        133,
        205,
        240,
        28,
        197,
        245
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "splVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  112,
                  108,
                  118
                ]
              }
            ]
          }
        },
        {
          "name": "bridgeAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "splVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenDetails",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  111,
                  107,
                  68,
                  101,
                  116,
                  97,
                  105,
                  108,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "params.token_mint"
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addSupportedTokenParams"
            }
          }
        }
      ]
    },
    {
      "name": "burnWrapped",
      "discriminator": [
        108,
        204,
        222,
        174,
        207,
        5,
        73,
        194
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "tokenDetails",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  111,
                  107,
                  68,
                  101,
                  116,
                  97,
                  105,
                  108,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "params.wrapped_token_mint"
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "burnWrappedParams"
            }
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "lock",
      "discriminator": [
        21,
        19,
        208,
        43,
        237,
        62,
        255,
        87
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "tokenDetails",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  111,
                  107,
                  68,
                  101,
                  116,
                  97,
                  105,
                  108,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "params.token_mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "splVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  112,
                  108,
                  118
                ]
              }
            ]
          }
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "bridgeConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "lockParams"
            }
          }
        }
      ]
    },
    {
      "name": "mintWrapped",
      "discriminator": [
        130,
        90,
        18,
        116,
        188,
        64,
        204,
        199
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver"
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "receiverAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "splVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  112,
                  108,
                  118
                ]
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "mintWrappedParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeSupportedToken",
      "discriminator": [
        80,
        206,
        7,
        134,
        88,
        218,
        248,
        219
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenDetails",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  111,
                  107,
                  68,
                  101,
                  116,
                  97,
                  105,
                  108,
                  115
                ]
              },
              {
                "kind": "arg",
                "path": "params.token_mint"
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeSupportedTokenParams"
            }
          }
        }
      ]
    },
    {
      "name": "setFee",
      "discriminator": [
        18,
        154,
        24,
        18,
        237,
        214,
        19,
        80
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setFeeParams"
            }
          }
        }
      ]
    },
    {
      "name": "setMember",
      "discriminator": [
        134,
        189,
        214,
        255,
        71,
        20,
        54,
        147
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setMemberParams"
            }
          }
        }
      ]
    },
    {
      "name": "setThreshold",
      "discriminator": [
        155,
        53,
        245,
        104,
        116,
        169,
        239,
        167
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setThresholdParams"
            }
          }
        }
      ]
    },
    {
      "name": "unlock",
      "discriminator": [
        101,
        155,
        40,
        21,
        158,
        189,
        56,
        203
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "splVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  112,
                  108,
                  118
                ]
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  66,
                  114,
                  105,
                  100,
                  103,
                  101,
                  67,
                  111,
                  110,
                  102
                ]
              }
            ]
          }
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "unlockParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bridgeConfig",
      "discriminator": [
        40,
        206,
        51,
        233,
        246,
        40,
        178,
        85
      ]
    },
    {
      "name": "tokenDetails",
      "discriminator": [
        83,
        49,
        200,
        250,
        222,
        246,
        143,
        58
      ]
    }
  ],
  "events": [
    {
      "name": "tokensBurned",
      "discriminator": [
        230,
        255,
        34,
        113,
        226,
        53,
        227,
        9
      ]
    },
    {
      "name": "tokensLocked",
      "discriminator": [
        63,
        184,
        201,
        20,
        203,
        194,
        249,
        138
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidReceiver",
      "msg": "Invalid receiver"
    },
    {
      "code": 6001,
      "name": "invalidThreshold",
      "msg": "Invalid threshold"
    },
    {
      "code": 6002,
      "name": "invalidMembersCount",
      "msg": "Invalid members count"
    },
    {
      "code": 6003,
      "name": "alreadyInitialized",
      "msg": "Bridge already initialized"
    },
    {
      "code": 6004,
      "name": "maximumMembers",
      "msg": "Maximum members reached"
    },
    {
      "code": 6005,
      "name": "belowThreshold",
      "msg": "Members cannot be below threshold"
    },
    {
      "code": 6006,
      "name": "invalidMemberKey",
      "msg": "Invalid member key"
    },
    {
      "code": 6007,
      "name": "memberKeyAlreadyAdded",
      "msg": "Member key already added"
    },
    {
      "code": 6008,
      "name": "memberKeyNotFound",
      "msg": "Member key not found"
    },
    {
      "code": 6009,
      "name": "memberKeyRecoveryError",
      "msg": "Member key recovery error"
    },
    {
      "code": 6010,
      "name": "invalidSigner",
      "msg": "Invalid signer"
    },
    {
      "code": 6011,
      "name": "notEnoughSignatures",
      "msg": "Not enough signatures"
    },
    {
      "code": 6012,
      "name": "notUniqueSignatures",
      "msg": "Signatures not unique"
    },
    {
      "code": 6013,
      "name": "invalidTokenSymbolLength",
      "msg": "Invalid token symbol length"
    },
    {
      "code": 6014,
      "name": "invalidFee",
      "msg": "Invalid fee percentage"
    },
    {
      "code": 6015,
      "name": "invalidSignatureAccounts",
      "msg": "Invalid signature accounts"
    },
    {
      "code": 6016,
      "name": "signatureAlreadyUsed",
      "msg": "Signature already used"
    }
  ],
  "types": [
    {
      "name": "addSupportedTokenParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "minAmount",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "bridgeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "members",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  20
                ]
              }
            }
          },
          {
            "name": "threshold",
            "type": "u8"
          },
          {
            "name": "fee",
            "type": "u8"
          },
          {
            "name": "isInitialized",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "burnWrappedParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "wrappedTokenMint",
            "type": "pubkey"
          },
          {
            "name": "destinationChain",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "members",
            "type": {
              "vec": {
                "array": [
                  "u8",
                  20
                ]
              }
            }
          },
          {
            "name": "threshold",
            "type": "u8"
          },
          {
            "name": "fee",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "lockParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "destinationChain",
            "type": "u32"
          },
          {
            "name": "destinationAddress",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "mintWrappedParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "wrappedTokenAddress",
            "type": "pubkey"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "removeSupportedTokenParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "setFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fee",
            "type": "u8"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "setMemberParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "memberKey",
            "type": {
              "array": [
                "u8",
                20
              ]
            }
          },
          {
            "name": "action",
            "type": "bool"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "setThresholdParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "threshold",
            "type": "u8"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    },
    {
      "name": "tokenDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "minAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokensBurned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "burnedTokenMint",
            "type": "pubkey"
          },
          {
            "name": "destinationChain",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokensLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "lockedTokenMint",
            "type": "pubkey"
          },
          {
            "name": "destinationChain",
            "type": "u32"
          },
          {
            "name": "destinationAddress",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "unlockParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "bytes"
          },
          {
            "name": "signatures",
            "type": {
              "vec": "bytes"
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "maxMembers",
      "type": "u8",
      "value": "10"
    },
    {
      "name": "maxTokenSymbolLength",
      "type": "u8",
      "value": "10"
    },
    {
      "name": "splVaultSeed",
      "type": "bytes",
      "value": "[115, 112, 108, 118]"
    }
  ]
};
