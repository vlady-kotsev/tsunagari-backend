/**
 * Event signatures used for tracking Ethereum smart contract events.
 */
export enum EventSignatures {
  /** Event emitted when tokens are locked in the bridge contract */
  LOCK_EVENT_SIGNATURE = 'TokensLocked(address,address,uint256,uint256)',
  /** Event emitted when wrapped tokens are burned */
  BURN_EVENT_SIGNATURE = 'WrappedTokensBurned(address,address,uint256,uint256)',
}

/**
 * Smart contract method names used for interacting with the bridge contract.
 */
export enum SmartContractMethods {
  /** Method to mint wrapped tokens */
  MINT_WRAPPED_TOKENS = 'mintWrappedTokens',
  /** Method to unlock original tokens */
  UNLOCK_TOKENS = 'unlockTokens',
}
