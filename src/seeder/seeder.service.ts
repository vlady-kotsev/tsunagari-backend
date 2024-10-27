import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Network } from 'src/network/network.entity';
import { Token } from 'src/token/token.entity';
import { Repository } from 'typeorm';
import networkSeeds from './seed-data/networks.json';
import tokenSeeds from './seed-data/tokens.json';

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(Network)
    private networkRepository: Repository<Network>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  parseNetworkSeeds(): Network[] {
    const networks: Network[] = [];
    for (const networkObject of networkSeeds.networks) {
      const network = new Network();
      network.name = networkObject.name;
      network.chainId = networkObject.chainId;
      networks.push(network);
    }
    return networks;
  }

  parseTokenSeeds(): Token[] {
    const tokens: Token[] = [];
    for (const tokenObject of tokenSeeds.tokens) {
      const token = new Token();
      token.name = tokenObject.name;
      token.symbol = tokenObject.symbol;
      token.address = tokenObject.address;
      tokens.push(token);
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
      console.log(`Seeded ${networks.length} networks`);

      const tokens = await this.tokenRepository.save(this.parseTokenSeeds());
      console.log(`Seeded ${tokens.length} tokens`);
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }
}
