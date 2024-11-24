import { BridgeJob } from './BridgeJob';
import JobTypes from './JobTypes';

describe('BridgeJob', () => {
  it('should create a BridgeJob instance with all properties', () => {
    const job = new BridgeJob(
      'Test message',
      JobTypes.HANDLE_BURN,
      '0x1234567890abcdef',
      '0xabc123',
      '0xdef456',
      '1000000000000000000',
      137,
      1
    );

    expect(job.message).toBe('Test message');
    expect(job.type).toBe(JobTypes.HANDLE_BURN);
    expect(job.recipient).toBe('0x1234567890abcdef');
    expect(job.originTokenAddress).toBe('0xabc123');
    expect(job.destinationTokenAddress).toBe('0xdef456');
    expect(job.amount).toBe('1000000000000000000');
    expect(job.destinationChainId).toBe(137);
    expect(job.originChainId).toBe(1);
  });
});
