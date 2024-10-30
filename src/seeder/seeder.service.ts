import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Network } from 'src/network/network.entity';
import { Token } from 'src/token/token.entity';
import { Repository } from 'typeorm';


@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private configService: ConfigService,
  ) {}

  parseNetworkSeeds(): Network[] {
    const networks: Network[] = [];
    const networksConfig = this.configService.get('networks');
    for (const networkObject of networksConfig) {
      const network = new Network();
      network.name = networkObject.name;
      network.chainId = networkObject.chainId;
      networks.push(network);
    }
    return networks;
  }

  parseTokenSeeds(): Token[] {
    const tokens: Token[] = [];
    const tokensConfig = this.configService.get('tokens');
    for (const [, tokenObject] of Object.entries(tokensConfig)) {
      for (const [tokenAddress, tokenInfo] of Object.entries(tokenObject)) {
        const token = new Token();
        token.name = tokenInfo.name;
        token.symbol = tokenInfo.symbol;
        token.address = tokenAddress;
        tokens.push(token);
      }
    }
    return tokens;
  }

  async seed() {
    try {
      await this.networkRepository.clear();
      await this.tokenRepository.clear();

      const networks = await this.networkRepository.save(
        this.parseNetworkSeeds(),
      );
      Logger.log(`Seeded ${networks.length} networks`);

      const tokens = await this.tokenRepository.save(this.parseTokenSeeds());
      Logger.log(`Seeded ${tokens.length} tokens`);
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }
}
