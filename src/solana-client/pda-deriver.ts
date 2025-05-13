import { PublicKey } from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import {
  BRIDGE_CONFIG_SEED,
  SPL_VAULT_SEED,
  TOKEN_DETAILS_SEED,
  USED_SIGNATURE_SEED,
} from './constants';

class PDADeriver {
  bridgeConfig(programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BRIDGE_CONFIG_SEED)],
      programId,
    )[0];
  }

  splVault(programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SPL_VAULT_SEED)],
      programId,
    )[0];
  }

  tokenDetails(tokenMint: PublicKey, programId: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(TOKEN_DETAILS_SEED), tokenMint.toBuffer()],
      programId,
    )[0];
  }

  usedSignature(signature: Buffer, programId: PublicKey): PublicKey {
    const signatureHash = keccak_256(signature);
    return PublicKey.findProgramAddressSync(
      [Buffer.from(USED_SIGNATURE_SEED), signatureHash],
      programId,
    )[0];
  }
}
export default new PDADeriver();
