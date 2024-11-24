import { ethers } from 'ethers';
import WrappedTokenArtifact from './abis/WrappedToken.json';

interface WrappedTokenArtifact {
  WrappedToken: any;
}

async function loadArtifacts(): Promise<WrappedTokenArtifact> {
  return {
    WrappedToken: WrappedTokenArtifact,
  };
}

async function deployWrappedToken(
  signer: ethers.Signer,
  bridgeAddress: string,
  tokenName: string,
  tokenSymbol: string,
): Promise<ethers.Contract> {
  const artifacts = await loadArtifacts();

  let nonce = await signer.getNonce();
  const gasPrice = await signer.provider!.getFeeData();
  const maxFeePerGas = (gasPrice.maxFeePerGas! * 120n) / 100n;
  const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas! * 120n) / 100n;

  const WrappedTokenFactory = new ethers.ContractFactory(
    artifacts.WrappedToken.abi,
    artifacts.WrappedToken.bytecode,
    signer,
  );

  const wrappedTokenContract = await WrappedTokenFactory.deploy(
    bridgeAddress,
    tokenName,
    tokenSymbol,
    {
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: nonce++,
    },
  );

  await wrappedTokenContract.waitForDeployment();

  const wrappedToken = new ethers.Contract(
    await wrappedTokenContract.getAddress(),
    artifacts.WrappedToken.abi,
    signer,
  );

  console.log('Wrapped Token deployed at:', await wrappedToken.getAddress());
  return wrappedToken;
}

export { deployWrappedToken };
