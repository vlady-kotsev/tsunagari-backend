import { ethers } from 'ethers';
import DiamondArtifact from './abis/Diamond.json';
import DiamondCutFacetArtifact from './abis/DiamondCutFacet.json';
import GovernanceFacetArtifact from './abis/GovernanceFacet.json';
import TokenManagerFacetArtifact from './abis/TokenManagerFacet.json';
import DiamondLoupeFacetArtifact from './abis/DiamondLoupeFacet.json';
import CalculatorFacetArtifact from './abis/CalculatorFacet.json';
import AddressesConfig from './addresses.json';

interface FacetAddresses {
  diamondCutFacetAddress: string;
  governanceFacetAddress: string;
  tokenManagerFacetAddress: string;
  diamondLoupeFacetAddress: string;
  calculatorFacetAddress: string;
}

interface Artifacts {
  Diamond: any;
  DiamondCutFacet: any;
  GovernanceFacet: any;
  TokenManagerFacet: any;
  DiamondLoupeFacet: any;
  CalculatorFacet: any;
}

async function loadArtifacts(): Promise<Artifacts> {
  return {
    Diamond: DiamondArtifact,
    DiamondCutFacet: DiamondCutFacetArtifact,
    GovernanceFacet: GovernanceFacetArtifact,
    TokenManagerFacet: TokenManagerFacetArtifact,
    DiamondLoupeFacet: DiamondLoupeFacetArtifact,
    CalculatorFacet: CalculatorFacetArtifact,
  };
}

function getDiamondCutFacetSelectors(artifacts: Artifacts): string[] {
  const iface = new ethers.Interface(artifacts.DiamondCutFacet.abi);
  return [iface.getFunction('diamondCut').selector];
}

function getGovernanceFacetSelectors(artifacts: Artifacts): string[] {
  const iface = new ethers.Interface(artifacts.GovernanceFacet.abi);
  return [
    iface.getFunction('getThreshold').selector,
    iface.getFunction('setThreshold').selector,
    iface.getFunction('addMember').selector,
    iface.getFunction('initGovernance').selector,
  ];
}

function getTokenManagerFacetSelectors(artifacts: Artifacts): string[] {
  const iface = new ethers.Interface(artifacts.TokenManagerFacet.abi);
  return [
    iface.getFunction('lockTokens').selector,
    iface.getFunction('unlockTokens').selector,
    iface.getFunction('mintWrappedTokens').selector,
    iface.getFunction('burnWrappedToken').selector,
    iface.getFunction('getMinimumBridgeableAmount').selector,
    iface.getFunction('setMinimumBridgeableAmount').selector,
    iface.getFunction('initTokenManager').selector,
    iface.getFunction('addNewSupportedToken').selector,
    iface.getFunction('withdrawTokenFunds').selector,
    iface.getFunction('isTokenSupported').selector,
    iface.getFunction('getTreasuryAddress').selector,
    iface.getFunction('setTreasuryAddress').selector,
  ];
}

function getDiamondLoupeFacetSelectors(artifacts: Artifacts): string[] {
  const iface = new ethers.Interface(artifacts.DiamondLoupeFacet.abi);
  return [
    iface.getFunction('facets').selector,
    iface.getFunction('facetAddresses').selector,
    iface.getFunction('facetAddress').selector,
    iface.getFunction('facetFunctionSelectors').selector,
  ];
}

function getCalculatorFacetSelectors(artifacts: Artifacts): string[] {
  const iface = new ethers.Interface(artifacts.CalculatorFacet.abi);
  return [
    iface.getFunction('getFeePercentage').selector,
    iface.getFunction('updateFeePercentage').selector,
    iface.getFunction('calculateFee').selector,
    iface.getFunction('initCalculator').selector,
  ];
}

async function deployFacets(
  signer: ethers.Signer,
  artifacts: Artifacts,
  deployCalculatorFacet: boolean,
): Promise<FacetAddresses> {
  let nonce = await signer.getNonce();

  const gasPrice = await signer.provider!.getFeeData();
  const maxFeePerGas = (gasPrice.maxFeePerGas! * 120n) / 100n;
  const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas! * 120n) / 100n;

  // Deploy DiamondCutFacet
  const DiamondCutFactory = new ethers.ContractFactory(
    artifacts.DiamondCutFacet.abi,
    artifacts.DiamondCutFacet.bytecode,
    signer,
  );
  const diamondCutFacet = await DiamondCutFactory.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });
  await diamondCutFacet.waitForDeployment();

  const GovernanceFactory = new ethers.ContractFactory(
    artifacts.GovernanceFacet.abi,
    artifacts.GovernanceFacet.bytecode,
    signer,
  );
  const governanceFacet = await GovernanceFactory.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });
  await governanceFacet.waitForDeployment();

  const TokenManagerFactory = new ethers.ContractFactory(
    artifacts.TokenManagerFacet.abi,
    artifacts.TokenManagerFacet.bytecode,
    signer,
  );
  const tokenManagerFacet = await TokenManagerFactory.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });
  await tokenManagerFacet.waitForDeployment();

  const DiamondLoupeFactory = new ethers.ContractFactory(
    artifacts.DiamondLoupeFacet.abi,
    artifacts.DiamondLoupeFacet.bytecode,
    signer,
  );
  const diamondLoupeFacet = await DiamondLoupeFactory.deploy({
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });
  await diamondLoupeFacet.waitForDeployment();

  let calculatorFacetAddress = ethers.ZeroAddress;
  if (deployCalculatorFacet) {
    const CalculatorFactory = new ethers.ContractFactory(
      artifacts.CalculatorFacet.abi,
      artifacts.CalculatorFacet.bytecode,
      signer,
    );
    const calculatorFacet = await CalculatorFactory.deploy({
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: nonce++,
    });
    await calculatorFacet.waitForDeployment();
    calculatorFacetAddress = await calculatorFacet.getAddress();
  }

  return {
    diamondCutFacetAddress: await diamondCutFacet.getAddress(),
    governanceFacetAddress: await governanceFacet.getAddress(),
    tokenManagerFacetAddress: await tokenManagerFacet.getAddress(),
    diamondLoupeFacetAddress: await diamondLoupeFacet.getAddress(),
    calculatorFacetAddress,
  };
}

async function deployDiamond(
  signer: ethers.Signer,
  deployCalculatorFacet: boolean = true,
) {
  const artifacts = await loadArtifacts();
  const facetAddresses = await deployFacets(
    signer,
    artifacts,
    deployCalculatorFacet,
  );

  let nonce = await signer.getNonce();

  const gasPrice = await signer.provider!.getFeeData();
  const maxFeePerGas = (gasPrice.maxFeePerGas! * 120n) / 100n;
  const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas! * 120n) / 100n;

  const cuts = [];

  // Add DiamondCut facet
  cuts.push({
    facetAddress: facetAddresses.diamondCutFacetAddress,
    action: 0, // Add
    functionSelectors: getDiamondCutFacetSelectors(artifacts),
  });

  // Add Governance facet
  cuts.push({
    facetAddress: facetAddresses.governanceFacetAddress,
    action: 0,
    functionSelectors: getGovernanceFacetSelectors(artifacts),
  });

  // Add TokenManager facet
  cuts.push({
    facetAddress: facetAddresses.tokenManagerFacetAddress,
    action: 0,
    functionSelectors: getTokenManagerFacetSelectors(artifacts),
  });

  // Add DiamondLoupe facet
  cuts.push({
    facetAddress: facetAddresses.diamondLoupeFacetAddress,
    action: 0,
    functionSelectors: getDiamondLoupeFacetSelectors(artifacts),
  });

  if (deployCalculatorFacet) {
    cuts.push({
      facetAddress: facetAddresses.calculatorFacetAddress,
      action: 0,
      functionSelectors: getCalculatorFacetSelectors(artifacts),
    });
  }

  const DiamondFactory = new ethers.ContractFactory(
    artifacts.Diamond.abi,
    artifacts.Diamond.bytecode,
    signer,
  );
  const diamondContract = await DiamondFactory.deploy(cuts, {
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });
  await diamondContract.waitForDeployment();

  const combinedAbi = [
    ...artifacts.Diamond.abi,
    ...artifacts.DiamondCutFacet.abi,
    ...artifacts.DiamondLoupeFacet.abi,
    ...artifacts.CalculatorFacet.abi,
    ...artifacts.GovernanceFacet.abi,
    ...artifacts.TokenManagerFacet.abi,
  ];
  const diamond = new ethers.Contract(
    await diamondContract.getAddress(),
    combinedAbi,
    signer,
  );

  if (deployCalculatorFacet) {
    await diamond.initCalculator({
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: nonce++,
    });
  }

  const addresses = AddressesConfig.addresses;
  const threshold = 1n;
  await diamond.initGovernance(addresses, threshold, {
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });

  const minBridgeableAmount = ethers.parseEther('1');
  const treasuryAddress = ethers.getCreateAddress({
    from: await signer.getAddress(),
    nonce: nonce + 1,
  });

  await diamond.initTokenManager(minBridgeableAmount, treasuryAddress, {
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: nonce++,
  });

  console.log('Diamond deployed at:', await diamond.getAddress());
  return diamond;
}

export { deployDiamond };
