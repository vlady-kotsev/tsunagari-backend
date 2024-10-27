import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  address: string;

  @Column('varchar')
  name: string;

  @Column('varchar')
  symbol: string;

  @Column('varchar', { nullable: true })
  logoUrl: string;
}
