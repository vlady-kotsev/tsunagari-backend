import { hexlify, toUtf8Bytes } from 'ethers';
import { murmur3 } from 'murmurhash-js';

/**
 * Converts a string message to a hexadecimal string representation of its bytes.
 * @param message - The string message to convert
 * @returns A hexadecimal string representing the UTF-8 bytes of the message
 */
export const messageToBytes = (message: string): string =>
  hexlify(toUtf8Bytes(message));

/**
 * Creates a message hash using MurmurHash3 algorithm.
 * @param transactionLogHash - The transaction log hash to use as input
 * @param murmur3Seed - The seed value for the MurmurHash3 algorithm
 * @returns A string representation of the generated hash
 */
export const createMessage = (
  transactionLogHash: string,
  murmur3Seed: number,
): string => murmur3(transactionLogHash, murmur3Seed).toString();

