import { Injectable } from '@nestjs/common';
import { Token } from './token.entity';
import { Repository } from 'typeorm';
import { CreateTokenDto } from './dto/create-token.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  createToken(createTokenDto: CreateTokenDto) {
    return this.tokenRepository.save(createTokenDto);
  }

  getAllTokens() {
    return this.tokenRepository.find();
  }

  async paginate(
    options: IPaginationOptions,
  ): Promise<Pagination<Token>> {

    return paginate<Token>(this.tokenRepository, options);
  }
}
