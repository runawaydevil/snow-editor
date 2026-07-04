import { expect, test } from '@playwright/test';

async function replaceEditorContent(page, text) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}

test.describe('local editor', () => {
  test('renders markdown preview while typing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Snow Editor' })).toBeVisible();

    await replaceEditorContent(page, '# E2E Title\n\nHello from Playwright.');

    const preview = page.locator('.preview-content');
    await expect(preview.getByRole('heading', { name: 'E2E Title' })).toBeVisible();
    await expect(preview.getByText('Hello from Playwright.')).toBeVisible();
  });

  test('switches to Org-mode and renders org preview', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Org-mode' }).click();
    await replaceEditorContent(page, '* Org Heading\nBody text here.');

    const preview = page.locator('.preview-content');
    await expect(preview.getByText('Org Heading')).toBeVisible();
  });

  test('drafts menu creates and switches drafts', async ({ page }) => {
    await page.goto('/');
    await replaceEditorContent(page, '# First draft');

    await page.getByRole('button', { name: 'Drafts' }).click();
    await page.getByRole('menuitem', { name: /New draft/ }).click();

    // New draft starts empty → preview shows the placeholder.
    await expect(page.locator('.preview-empty')).toBeVisible();

    await page.getByRole('button', { name: 'Drafts' }).click();
    await page.getByRole('menuitem', { name: /First draft/ }).click();
    await expect(
      page.locator('.preview-content').getByRole('heading', { name: 'First draft' }),
    ).toBeVisible();
  });
});

test.describe('share flow', () => {
  test('share → view → edit → save round-trip', async ({ page }) => {
    await page.goto('/');
    await replaceEditorContent(page, '# Shared doc\n\nOriginal body.');

    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Create links' }).click();

    // Links may be absolute (VITE_PUBLIC_ORIGIN); keep only the path so the
    // test always talks to the local dev server.
    const viewUrl = new URL(
      await dialog.locator('label', { hasText: 'View link' }).locator('input').inputValue(),
      'http://localhost:41737',
    ).pathname;
    const editUrl = new URL(
      await dialog.locator('label', { hasText: 'Edit link' }).locator('input').inputValue(),
      'http://localhost:41737',
    ).pathname;
    expect(viewUrl).toContain('/v/');
    expect(editUrl).toContain('/e/');

    // Read-only view.
    await page.goto(viewUrl);
    await expect(page.getByText('Read-only')).toBeVisible();
    await expect(
      page.locator('.preview-content').getByText('Original body.'),
    ).toBeVisible();

    // Edit with lock.
    await page.goto(editUrl);
    await expect(page.getByText('Editing')).toBeVisible();

    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type('\n\nAdded by e2e.');
    await page.getByRole('button', { name: 'Save to server' }).click();
    await expect(page.getByText('Saved')).toBeVisible();

    // The view link shows the updated content.
    await page.goto(viewUrl);
    await expect(
      page.locator('.preview-content').getByText('Added by e2e.'),
    ).toBeVisible();
  });
});
