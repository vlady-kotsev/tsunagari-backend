import { web3 } from '@coral-xyz/anchor';

export interface ITokensLocked {
  amount: BigInt;
  lockedTokenMint: web3.PublicKey;
  destinationChain: number;
  destinationAddress: string;
}
