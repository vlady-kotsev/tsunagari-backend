import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateNetworkDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  chaindId: number;
}
