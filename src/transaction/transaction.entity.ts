import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  user: string;

  @Column('varchar')
  originTokenAddress: string;

  @Column('varchar')
  destinationTokenAddress: string;

  @Column('bigint')
  amount: number;

  @Column('int')
  originNetworkId: number;

  @Column('int')
  destinationNetworkId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
