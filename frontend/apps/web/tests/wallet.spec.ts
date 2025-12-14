import { test, expect } from '@playwright/test';

test('Create Wallet Flow', async ({ page }) => {
    // 1. Visit page
    console.log('Navigating to /cross-chain...');
    await page.goto('/cross-chain');

    // 2. Wait for Engine Init
    // The input is disabled until isRailgunReady is true
    console.log('Waiting for Engine Initialization...');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeEnabled({ timeout: 120000 }); // Init might be slow

    // 3. Fill Password
    await passwordInput.fill('TestPassword123');

    // 4. Handle Dialogs (Alerts)
    // We expect "✅ 錢包創建成功！" alert
    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.accept();
    });

    // 5. Click Create Button
    console.log('Clicking Create Wallet...');
    const createBtn = page.getByRole('button', { name: 'Create' });
    await createBtn.click();

    // 6. Verify success (0zk address appears)
    console.log('Waiting for 0zk address...');
    await expect(page.locator('text=0zk:')).toBeVisible({ timeout: 60000 }); // Creation & Scaning takes time
});
