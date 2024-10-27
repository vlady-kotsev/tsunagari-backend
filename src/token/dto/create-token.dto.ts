import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTokenDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  symbol: string;

  @IsOptional()
  @IsString()
  logoUrl: string;
}
