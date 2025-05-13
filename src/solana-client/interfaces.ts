import { web3 } from '@coral-xyz/anchor';

export interface ISolanaBurnedEvent {
  amount: BigInt;
  burnedTokenMint: web3.PublicKey;
  destinationChain: number;
  destinationAddress: string;
}

export interface ISolanaLockEvent {
  amount: BigInt;
  lockedTokenMint: web3.PublicKey;
  destinationChain: number;
  destinationAddress: string;
}
