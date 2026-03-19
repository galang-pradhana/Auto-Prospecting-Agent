import { test, expect } from '@playwright/test';

/**
 * Automated Test: Style Refinement & DNA Evolution
 * 
 * Verifies that the "Refine" button correctly triggers the 
 * Searchable Style Dropdown and allows for blueprint evolution.
 */

test.describe('Lead Style Refinement UI', () => {
    test.beforeEach(async ({ page }) => {
        // Navigasi ke halaman Enriched (status ENRICHED)
        await page.goto('http://localhost:3000/enriched');
    });

    test('should open Style Refiner with 20+ models', async ({ page }) => {
        // 1. Locate the first "Refine" button in an ENRICHED lead card
        const refineButton = page.locator('button:has-text("Refine")').first();
        await expect(refineButton).toBeVisible();
        await refineButton.click();

        // 2. Verify Modal Header
        await expect(page.locator('h2:has-text("Style Refiner")')).toBeVisible();
        
        // 3. Verify the Searchable Dropdown
        const dropdown = page.locator('button:has-text("Choose a style...")');
        await expect(dropdown).toBeVisible();
        await dropdown.click();

        // 4. Verify Search Input & Model List
        const searchInput = page.locator('input[placeholder="Search 20+ models..."]');
        await expect(searchInput).toBeVisible();

        // 5. Check if at least one standard model is visible
        await expect(page.locator('text=Clean Minimal')).toBeVisible();
        await expect(page.locator('text=Cyberpunk Night')).toBeVisible();

        // 6. Test Filtering
        await searchInput.fill('Minimal');
        await expect(page.locator('text=Cyberpunk Night')).not.toBeVisible();
        await expect(page.locator('text=Clean Minimal')).toBeVisible();

        // 7. Select a style and evolve
        await page.locator('text=Clean Minimal').click();
        
        const evolveButton = page.locator('button:has-text("Evolve Master Blueprint")');
        await expect(evolveButton).toBeEnabled();
        
        // Note: We don't click Evolve in a typical CI run to prevent credit usage, 
        // but it verifies the UI state is correct.
    });
});
