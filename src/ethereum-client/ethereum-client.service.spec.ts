import { Test, TestingModule } from '@nestjs/testing';
import { EthereumClientService } from './ethereum-client.service';

describe('EthereumClientService', () => {
  let service: EthereumClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EthereumClientService],
    }).compile();

    service = module.get<EthereumClientService>(EthereumClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
