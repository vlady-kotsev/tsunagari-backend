import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('networks')
export class Network {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  name: string;

  @Column('int')
  chainId: number;
}
