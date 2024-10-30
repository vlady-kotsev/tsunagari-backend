import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class CreateTransactionDto {
  constructor(
    user: string,
    originTokenAddress: string,
    destinationTokenAddress: string,
    amount: number,
    originNetworkId: number,
    destinationNetworkId: number,
  ) {
    this.user = user;
    this.originTokenAddress = originTokenAddress;
    this.destinationTokenAddress = destinationTokenAddress;
    this.amount = amount;
    this.originNetworkId = originNetworkId;
    this.destinationNetworkId = destinationNetworkId;
  }

  @IsNotEmpty()
  @IsString()
  user: string;

  @IsNotEmpty()
  @IsString()
  originTokenAddress: string;

  @IsNotEmpty()
  @IsString()
  destinationTokenAddress: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  originNetworkId: number;

  @IsNotEmpty()
  @IsNumber()
  destinationNetworkId: number;
}
