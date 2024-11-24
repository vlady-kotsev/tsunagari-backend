import { ethers } from 'ethers';
import NativeTokenArtifact from './abis/NativeToken.json';

interface NativeTokenArtifact {
  NativeToken: any;
}

async function loadArtifacts(): Promise<NativeTokenArtifact> {
  return {
    NativeToken: NativeTokenArtifact,
  };
}

async function deployNativeToken(
  signer: ethers.Signer,
  tokenName: string,
  tokenSymbol: string,
): Promise<ethers.Contract> {
  const artifacts = await loadArtifacts();

  let nonce = await signer.getNonce();
  const gasPrice = await signer.provider!.getFeeData();
  const maxFeePerGas = (gasPrice.maxFeePerGas! * 120n) / 100n;
  const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas! * 120n) / 100n;

  const NativeTokenFactory = new ethers.ContractFactory(
    artifacts.NativeToken.abi,
    artifacts.NativeToken.bytecode,
    signer,
  );

  const nativeTokenContract = await NativeTokenFactory.deploy(
    tokenName,
    tokenSymbol,
    {
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: nonce++,
    },
  );

  await nativeTokenContract.waitForDeployment();

  const nativeToken = new ethers.Contract(
    await nativeTokenContract.getAddress(),
    artifacts.NativeToken.abi,
    signer,
  );

  console.log('Native Token deployed at:', await nativeToken.getAddress());
  return nativeToken;
}

export { deployNativeToken };
