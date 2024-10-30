export enum EventSignatures {
  LOCK_EVENT_SIGNATURE = 'TokensLocked(address,address,uint256,uint256)',
  BURN_EVENT_SIGNATURE = 'WrappedTokensBurned(address,address,uint256,uint256)',
}

export enum SmartContractMethods {
  MINT_WRAPPED_TOKENS = 'mintWrappedTokens',
  UNLOCK_TOKENS = 'unlockTokens',
}
