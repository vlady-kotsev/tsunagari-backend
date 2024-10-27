import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  user: string;

  @IsNotEmpty()
  @IsString()
  tokenAddress: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  //   @IsNotEmpty()
  //   timestamp: Date = new Date();
}
