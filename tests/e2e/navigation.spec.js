import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('switches between pages', async ({ page }) => {
    await page.goto('/');

    // Ask tab visible by default
    await expect(page.getByRole('heading', { level: 2, name: /ask local llm/i })).toBeVisible();

    // Mesh
    await page.getByRole('button', { name: 'Mesh' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /mesh network/i })).toBeVisible();

    // Inventory
    await page.getByRole('button', { name: 'Inventory' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /inventory/i })).toBeVisible();
  });
});
