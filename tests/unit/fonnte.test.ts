import { describe, it, expect } from 'vitest';

// Kita asumsikan fungsinya bernama parseFonnteWebhook
// Meskipun fungsinya belum ada (ini inti dari TDD: Test First)
import { parseFonnteWebhook } from '@/lib/fonnte';

describe('Fonnte: Webhook Parsing', () => {
  it('should correctly parse a normal incoming message', () => {
    const payload = {
      sender: '08123456789',
      message: 'Halo, saya tertarik',
      is_me: false,
      device: '62811111111'
    };
    
    const result = parseFonnteWebhook(payload);
    
    expect(result.sender).toBe('628123456789'); // Harus tersanitasi
    expect(result.message).toBe('Halo, saya tertarik');
    expect(result.isMe).toBe(false);
  });

  it('should identify outgoing messages (is_me)', () => {
    const payload = {
      sender: '62811111111',
      message: 'Ini pesan dari bot',
      is_me: true,
      device: '62811111111'
    };
    
    const result = parseFonnteWebhook(payload);
    expect(result.isMe).toBe(true);
  });

  it('should identify status updates as ignorable', () => {
    const payload = {
      status: 'connect',
      device: '62811111111'
    };
    
    const result = parseFonnteWebhook(payload);
    expect(result.isStatusUpdate).toBe(true);
  });
});
