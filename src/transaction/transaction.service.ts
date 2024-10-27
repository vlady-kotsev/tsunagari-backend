import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { Repository } from 'typeorm';
import {
  IPaginationOptions,
  Pagination,
  paginate,
} from 'nestjs-typeorm-paginate';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  getAllTransactions() {
    return this.transactionRepository.find();
  }

  addTransaction(createTransactionDto: CreateTransactionDto) {
    return this.transactionRepository.save(createTransactionDto);
  }

  getTransactionById(id: number) {
    return this.transactionRepository.findOneBy({ id });
  }

  async paginate(
    options: IPaginationOptions,
  ): Promise<Pagination<Transaction>> {
    const queryBuilder = this.transactionRepository.createQueryBuilder('s');
    queryBuilder.orderBy('s.timestamp', 'DESC');

    return paginate<Transaction>(queryBuilder, options);
  }
}
