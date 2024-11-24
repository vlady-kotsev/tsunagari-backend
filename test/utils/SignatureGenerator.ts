import { ethers } from 'ethers';

export class SignatureGenerator {
  private signatures: string[];
  private message: string;
  privateKey1: string;
  private nonce: number;

  constructor() {
    this.nonce = 0;
    // anvil generated private key
    this.privateKey1 =
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    this.message = 'Hello, Ethereum!';
    this.signatures = [];
  }

  private getSignature(privateKey: string): string {
    const noncedMessage = this.getNoncedMessage();
    const wallet = new ethers.Wallet(privateKey);
    const signature = wallet.signMessageSync(noncedMessage);
    return signature;
  }

  public getNoncedMessage(): string {
    return this.message + this.nonce.toString();
  }

  public getUniqueSignature(): string {
    this.nonce++;

    this.signatures[0] = this.getSignature(this.privateKey1);
    return this.signatures[0];
  }
}
