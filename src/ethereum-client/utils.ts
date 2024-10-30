import { hexlify, toUtf8Bytes } from 'ethers';
import { murmur3 } from 'murmurhash-js';

export const messageToBytes = (message: string): string =>
  hexlify(toUtf8Bytes(message));

export const createMessage = (
  transactionLogHash: string,
  murmur3Seed: number,
): string => murmur3(transactionLogHash, murmur3Seed).toString();

