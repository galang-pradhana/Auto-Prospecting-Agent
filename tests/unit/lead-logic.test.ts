import { describe, it, expect } from 'vitest';
// Kita akan buat file baru lib/lead-logic.ts untuk menyimpan logika murni
import { prepareForgeUpdateData } from '@/lib/lead-logic';

describe('Lead Logic: Forge Transitions', () => {
  it('should set status to LIVE and reset followups for a new forge', () => {
    const existingLead = {
      status: 'ENRICHED',
      nextFollowupAt: null,
      followupCount: 0
    };
    
    const updateData = prepareForgeUpdateData(existingLead, 'new-html-code', 'new-slug');
    
    expect(updateData.status).toBe('LIVE');
    expect(updateData.followupCount).toBe(0);
    expect(updateData.nextFollowupAt).toBe(null);
  });

  it('should preserve followup data when re-forging an already LIVE lead', () => {
    const lastFollowupDate = new Date('2024-01-01');
    const existingLead = {
      status: 'LIVE',
      nextFollowupAt: lastFollowupDate,
      followupCount: 2,
      followupStage: 'followup1'
    };
    
    const updateData = prepareForgeUpdateData(existingLead, 'updated-html', 'existing-slug');
    
    expect(updateData.status).toBe('LIVE');
    expect(updateData.followupCount).toBe(2); // Harus tetap 2
    expect(updateData.nextFollowupAt).toBe(lastFollowupDate); // Harus tetap tanggal lama
  });
});
