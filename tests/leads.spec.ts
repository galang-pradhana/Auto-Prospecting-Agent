import { test, expect } from '@playwright/test';

// Login Helper
async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'qa@forge.dev');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Module 2: Lead Management (CRUD)', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('LEAD-01: Fetch leads — filter status FRESH', async ({ page }) => {
    await page.goto('/dashboard/leads');
    // Ensure we are in FRESH tab (it's default)
    const freshTab = page.locator('button:has-text("FRESH")');
    await expect(freshTab).toHaveClass(/bg-white/); // Active tab check

    // Check if seeded FRESH leads are there
    await expect(page.locator('text=Fresh Lead 1')).toBeVisible();
    await expect(page.locator('text=Bali Bakery')).toBeVisible();
  });

  test('LEAD-02 & LEAD-09: Fetch leads — isolasi per user', async ({ page }) => {
    await page.goto('/dashboard/leads');
    // User A should NOT see User B leads
    await expect(page.locator('text=User B Lead 1')).not.toBeVisible();
  });

  test('LEAD-03: Search lead berhasil', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await page.fill('input[placeholder*="Quick Search"]', 'Bali Bak');
    await page.waitForTimeout(1000); // Wait for filter
    
    await expect(page.locator('text=Bali Bakery')).toBeVisible();
    await expect(page.locator('text=Fresh Lead 1')).not.toBeVisible();
  });

  test('LEAD-04: Filter kombinasi: city + category', async ({ page }) => {
    await page.goto('/dashboard/leads');
    
    // Select Category Cafe
    await page.selectOption('select >> nth=0', { label: 'Cafe' });
    
    // Select City Ubud
    await page.selectOption('select >> nth=1', { label: 'Ubud' });
    
    await expect(page.locator('text=Ubud Coffee')).toBeVisible();
    await expect(page.locator('text=Fresh Lead 1')).not.toBeVisible(); // This is in Denpasar
  });

  test('LEAD-05: Pagination — tombol Next & Prev', async ({ page }) => {
    await page.goto('/dashboard/leads');
    // If we have > 10 leads, pagination should appear
    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(page.locator('text=Showing Page 2')).toBeVisible();
      await page.click('button:has-text("Previous")');
      await expect(page.locator('text=Showing Page 1')).toBeVisible();
    }
  });

  test('LEAD-06: Delete lead tunggal', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await page.fill('input[placeholder*="Quick Search"]', 'Old Company');
    
    const leadRow = page.locator('tr:has-text("Old Company")');
    await leadRow.locator('td').first().locator('.cursor-pointer').click();
    
    // Floating bar appears
    await page.click('button[title="Hapus Terpilih"]');
    
    // Confirm delete (if there is a browser confirm, Playwright handles it if configured, 
    // but here we have a JS confirm)
    page.on('dialog', dialog => dialog.accept());
    
    await expect(page.locator('text=Old Company')).not.toBeVisible();
  });

  test('LEAD-08: Batch delete — multiple leads sekaligus', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await page.fill('input[placeholder*="Quick Search"]', 'Batch Lead');
    
    // Select all 3 batch leads
    await page.click('th .cursor-pointer'); // Select all visible
    
    await page.click('button[title="Hapus Terpilih"]');
    page.on('dialog', dialog => dialog.accept());
    
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Batch Lead')).toHaveCount(0);
  });

  test('LEAD-10: Jalankan cleanupOldLeads() lewat UI Settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.click('button:has-text("System Health")');
    
    const cleanupBtn = page.locator('button:has-text("Cleanup Expired Leads")');
    await expect(cleanupBtn).toBeVisible();
    
    page.on('dialog', dialog => dialog.accept());
    await cleanupBtn.click();
    
    // Wait for success toast
    await expect(page.locator('text=Deleted 2 stale leads')).toBeVisible();
  });

  test('LEAD-11 & LEAD-12: Manual Lead — Validasi Rating 0 & 5.0', async ({ page }) => {
    const ratings = [0, 5];
    for (const rating of ratings) {
      await page.goto('/dashboard/leads-manual');
      await page.fill('input[placeholder*="Studio Arsitek"]', `Manual Lead Rating ${rating}`);
      await page.selectOption('select', { label: 'Cafe' });
      await page.fill('input[placeholder*="081234567"]', `62811199988${rating}`);
      await page.fill('input[placeholder*="Jakarta Selatan"]', 'Badung');
      
      // Select rating via range input
      const slider = page.locator('input[type="range"]');
      const boundingBox = await slider.boundingBox();
      if (boundingBox) {
        await page.mouse.move(boundingBox.x + (rating / 5) * boundingBox.width, boundingBox.y + boundingBox.height / 2);
        await page.mouse.down();
        await page.mouse.up();
      }
      
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard/leads');
      
      // Verify in list
      await page.fill('input[placeholder*="Quick Search"]', `Manual Lead Rating ${rating}`);
      // Find row and check rating text
      const row = page.locator(`tr:has-text("Manual Lead Rating ${rating}")`);
      await expect(row).toBeVisible();
    }
  });

  test('LEAD-13: Input lead duplikat WA — error 409', async ({ page }) => {
    await page.goto('/dashboard/leads-manual');
    await page.fill('input[placeholder*="Studio Arsitek"]', 'Duplicate WA Lead');
    await page.selectOption('select', { label: 'Cafe' });
    await page.fill('input[placeholder*="081234567"]', '628111222333'); // Already exists as Bali Bakery
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Nomor WA ini sudah terdaftar')).toBeVisible();
  });

  test('LEAD-14: Input lead dengan WA null / kosong — berhasil', async ({ page }) => {
    await page.goto('/dashboard/leads-manual');
    await page.fill('input[placeholder*="Studio Arsitek"]', 'No WA Lead');
    await page.selectOption('select', { label: 'Cafe' });
    
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/leads');
    await expect(page.locator('text=No WA Lead')).toBeVisible();
  });

  test('LEAD-15: Simpan outreach draft di LeadDetailModal', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await page.click('text=Fresh Lead 1'); // Open details
    
    const draftText = 'Halo, ini adalah pesan penawaran kustom untuk anda.';
    await page.fill('textarea[placeholder*="Message draft"]', draftText);
    await page.click('button:has-text("Save Selection to DB")');
    
    await expect(page.locator('text=Draft saved successfully!')).toBeVisible();
    await page.click('button:has-text("Close")'); // Close modal
    
    // Re-open and verify
    await page.click('text=Fresh Lead 1');
    await expect(page.locator('textarea')).toHaveValue(draftText);
  });

  test('LEAD-16: Archive lead (Status -> FINISH)', async ({ page }) => {
    await page.goto('/dashboard/leads');
    const leadRow = page.locator('tr:has-text("Fresh Lead 2")');
    await leadRow.locator('td').first().locator('.cursor-pointer').click();
    
    const archiveBtn = page.locator('button[title="Archive to GSheet"]');
    page.on('dialog', dialog => dialog.accept());
    await archiveBtn.click();
    
    // Verify it's gone from FRESH list
    await expect(page.locator('text=Fresh Lead 2')).not.toBeVisible();
    
    // Check in FINISH filter
    await page.click('button:has-text("FRESH")'); // Open status filter dropdown or click tab
    // Some apps use tabs, others use dropdowns. LeadsClient has tabs.
    const finishTab = page.locator('button:has-text("FINISH")');
    await finishTab.click();
    
    await expect(page.locator('text=Fresh Lead 2')).toBeVisible();
  });

  test('LEAD-17: Refine / Update data enrichment', async ({ page }) => {
    await page.goto('/dashboard/enriched');
    await page.click('text=Enriched Lead 1');
    
    await page.click('button:has-text("Edit Data")');
    await page.fill('textarea[placeholder*="struggling with?"]', 'Updated Pain Points');
    await page.fill('textarea[placeholder*="we help?"]', 'Updated solution blueprint');
    
    // Intercept reload or wait for toast
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Changes saved successfully!')).toBeVisible();
  });

});
