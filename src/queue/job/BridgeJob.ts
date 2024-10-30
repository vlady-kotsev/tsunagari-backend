import JobTypes from './JobTypes';

export class BridgeJob {
  constructor(
    public readonly message: string,
    public readonly type: JobTypes,
    public readonly recipient: string,
    public readonly originTokenAddress: string,
    public readonly destinationTokenAddress: string,
    public readonly amount: string,
    public readonly destinationChainId: number,
    public readonly originChainId: number,
  ) {}
}
