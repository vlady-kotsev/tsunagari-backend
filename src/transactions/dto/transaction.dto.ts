/**
 * Data Transfer Object for creating a new transaction record.
 * Contains all necessary information for tracking a cross-chain token transfer.
 */
export class CreateTransactionDto {
  /**
   * The address of the user initiating the transaction.
   */
  user: string;

  /**
   * The token contract address on the origin chain.
   */
  originTokenAddress: string;

  /**
   * The token contract address on the destination chain.
   */
  destinationTokenAddress: string;

  /**
   * The amount of tokens being transferred, as a string to handle large numbers.
   */
  amount: string;

  /**
   * The chain ID of the origin network.
   */
  originChainId: number;

  /**
   * The chain ID of the destination network.
   */
  destinationChainId: number;
}

/**
 * Data Transfer Object for empty responses.
 * Used when an API endpoint needs to return a 200 OK with no data.
 */
export class EmptyResponseDto {}