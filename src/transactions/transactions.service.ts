import { Observable } from 'rxjs';
import { CreateTransactionDto, EmptyResponseDto } from './dto/transaction.dto';

/**
 * Service interface for managing transaction operations, used for gRPC communication.
 */
export interface TransactionsService {
  /**
   * Calls the backend-api to store a new transaction.
   * @param data - The transaction data to store
   * @returns An Observable that resolves to an empty response when the transaction is stored
   */
  StoreTransaction(data: CreateTransactionDto): Observable<EmptyResponseDto>;
}
