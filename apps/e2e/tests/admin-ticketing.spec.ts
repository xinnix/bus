import { test, expect, type Page } from '@playwright/test';

/** Admin 登录（seed 账号 superadmin@example.com） */
async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /用户名/ }).fill('superadmin@example.com');
  await page.getByRole('textbox', { name: /密\s*码/ }).fill('password123');
  await page.keyboard.press('Enter');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe('Admin 票务管理主路径（P0）', () => {
  // 唯一化测试数据，用例内自行清理
  const lineName = `e2e线路-${Date.now()}`;

  test('登录 → 新建线路 → 列表可见 → 删除', async ({ page }) => {
    await login(page);

    // 线路列表
    await page.goto('/lines');
    await expect(page.getByRole('heading', { name: '线路管理' })).toBeVisible();

    // 新建（StandardListPage Modal 表单）
    await page.getByRole('button', { name: /新建/ }).click();
    await page.getByLabel('线路名称').fill(lineName);
    await page.getByLabel('出发地').fill('e2e起点');
    await page.getByLabel('到达地').fill('e2e终点');
    await page.getByRole('button', { name: /确\s*定/ }).click();
    await expect(page.getByRole('cell', { name: lineName }).first()).toBeVisible();

    // 删除（Popconfirm 确认）
    const row = page.getByRole('row', { name: lineName });
    await row.getByRole('button', { name: /删除/ }).click();
    await page
      .getByRole('button', { name: /确\s*定|OK/ })
      .first()
      .click();
    await expect(page.getByRole('cell', { name: lineName })).toHaveCount(0);
  });

  test('票务各页面可打开（站点/模板/班次/订单/核销记录/核销员）', async ({ page }) => {
    await login(page);

    await page.goto('/stations');
    await expect(page.getByRole('heading', { name: '上下车点' })).toBeVisible();

    await page.goto('/schedule-templates');
    await expect(page.getByRole('heading', { name: '班次模板' })).toBeVisible();

    await page.goto('/trips');
    await expect(page.getByRole('heading', { name: '班次管理' })).toBeVisible();

    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: '订单记录' })).toBeVisible();

    await page.goto('/checkins');
    await expect(page.getByRole('heading', { name: '核销记录' })).toBeVisible();

    await page.goto('/checkers');
    await expect(page.getByRole('heading', { name: '核销员管理' })).toBeVisible();
  });
});
