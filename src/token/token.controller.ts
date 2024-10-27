import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { CreateTokenDto } from './dto/create-token.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { Token } from './token.entity';

@Controller('token')
export class TokenController {
  constructor(private tokenService: TokenService) {}

  @Post()
  createToken(@Body() createTokenDto: CreateTokenDto) {
    try {
      return this.tokenService.createToken(createTokenDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  getAllTokens(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<Pagination<Token>> {
    try {
      return this.tokenService.paginate({ page, limit });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
