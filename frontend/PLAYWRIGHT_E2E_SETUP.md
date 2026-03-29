# Frontend E2E Tests Setup Guide (Playwright)

## Overview

This guide covers setting up **Playwright** for frontend E2E testing of your CRM dashboard and user workflows.

**Timeline:** Set this up after core backend tests are passing.

## Installation

```bash
cd frontend
npm install --save-dev @playwright/test @testing-library/react
npx playwright install
```

## Project Structure

```
frontend/
├── src/
│   └── __tests__/
│       ├── e2e/
│       │   ├── dashboard.spec.ts
│       │   ├── lead-management.spec.ts
│       │   ├── followup-flow.spec.ts
│       │   └── common.ts (helpers)
│       └── fixtures/
│           ├── leads.json
│           └── users.json
├── playwright.config.ts
└── package.json
```

## Configuration

Create `frontend/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ]
});
```

## Package.json Scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

## Test Examples

### 1. Common Helpers (`common.ts`)

```typescript
import { Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

export async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout"]');
}

export async function createLead(
  page: Page,
  {
    name,
    phone,
    email,
    course
  }: { name: string; phone: string; email: string; course: string }
) {
  await page.click('[data-testid="create-lead-btn"]');
  await page.fill('input[placeholder="Name"]', name);
  await page.fill('input[placeholder="Phone"]', phone);
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Course"]', course);
  await page.click('button:has-text("Create Lead")');
  await page.waitForNavigation();
}
```

### 2. Dashboard Tests (`dashboard.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { login, navigateToDashboard, logout } from './common';

test.describe('CRM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'counselor@crm.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should display dashboard with follow-ups', async ({ page }) => {
    await navigateToDashboard(page);

    // Check for follow-up sections
    const overdueSection = page.locator('text=Overdue');
    const todaySection = page.locator('text=Today');
    const upcomingSection = page.locator('text=Upcoming');

    await expect(overdueSection).toBeVisible();
    await expect(todaySection).toBeVisible();
    await expect(upcomingSection).toBeVisible();
  });

  test('should show follow-up count for today', async ({ page }) => {
    await navigateToDashboard(page);

    const todayCount = page.locator('[data-testid="today-count"]');
    const count = await todayCount.textContent();

    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should show lead count by stage', async ({ page }) => {
    await navigateToDashboard(page);

    const stages = ['LEAD', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'APPLIED', 'ENROLLED'];

    for (const stage of stages) {
      const stageCount = page.locator(`[data-testid="stage-${stage.toLowerCase()}"]`);
      expect(stageCount).toBeVisible();
    }
  });

  test('should filter leads by priority', async ({ page }) => {
    await navigateToDashboard(page);

    // Click priority filter
    await page.click('[data-testid="priority-filter"]');

    // Select HOT priority
    await page.click('text=HOT');

    // Verify filtered results
    const leads = page.locator('[data-testid="lead-item"]');
    const count = await leads.count();

    expect(count).toBeGreaterThan(0);
  });
});
```

### 3. Lead Management Tests (`lead-management.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { login, navigateToDashboard, createLead, logout } from './common';

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'counselor@crm.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should create new lead', async ({ page }) => {
    await navigateToDashboard(page);

    const randomPhone = `+91${Math.random().toString().slice(2, 11)}`;

    await createLead(page, {
      name: 'Test Lead',
      phone: randomPhone,
      email: 'test@example.com',
      course: 'B.Tech'
    });

    // Verify lead was created
    const leadName = page.locator('text=Test Lead');
    await expect(leadName).toBeVisible();
  });

  test('should prevent duplicate phone numbers', async ({ page }) => {
    await navigateToDashboard(page);

    const phone = '+919876543210';

    // Try to create lead with existing phone
    await page.click('[data-testid="create-lead-btn"]');
    await page.fill('input[placeholder="Phone"]', phone);
    await page.fill('input[placeholder="Name"]', 'Duplicate Test');

    // Trigger validation
    await page.click('input[placeholder="Email"]');

    const errorMessage = page.locator('text=This phone already exists');
    await expect(errorMessage).toBeVisible();
  });

  test('should assign lead to counselor', async ({ page }) => {
    await navigateToDashboard(page);

    // Click on a lead
    const firstLead = page.locator('[data-testid="lead-item"]').first();
    await firstLead.click();

    // Click assign button
    await page.click('[data-testid="assign-btn"]');

    // Select counselor
    await page.click('[data-testid="counselor-select"]');
    await page.click('text=Rajesh Kumar');

    // Verify assignment
    const assignmentConfirm = page.locator('text=Assigned to Rajesh Kumar');
    await expect(assignmentConfirm).toBeVisible();
  });

  test('should move lead through pipeline', async ({ page }) => {
    await navigateToDashboard(page);

    // Click on a lead
    const firstLead = page.locator('[data-testid="lead-item"]').first();
    await firstLead.click();

    // Move to CONTACTED
    await page.click('[data-testid="move-stage"]');
    await page.click('text=CONTACTED');

    const stagedBadge = page.locator('[data-testid="status-badge"]');
    await expect(stagedBadge).toContainText('CONTACTED');
  });
});
```

### 4. Follow-Up Flow Tests (`followup-flow.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { login, navigateToDashboard, logout } from './common';

test.describe('Follow-Up Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'counselor@crm.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should complete follow-up for today', async ({ page }) => {
    await navigateToDashboard(page);

    // Find today's follow-up
    const todayFollowUp = page.locator('[data-testid="today-followup"]').first();

    if ((await todayFollowUp.count()) > 0) {
      await todayFollowUp.click();

      // Log activity
      await page.click('[data-testid="log-call-btn"]');
      await page.fill('textarea[placeholder="Notes"]', 'Discussed course requirements');

      // Set next follow-up (tomorrow)
      await page.click('[data-testid="followup-date"]');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateString);

      // Save
      await page.click('button:has-text("Save")');

      // Verify completion
      const successMessage = page.locator('text=Follow-up completed');
      await expect(successMessage).toBeVisible();
    }
  });

  test('should set follow-up when logging activity', async ({ page }) => {
    await navigateToDashboard(page);

    const lead = page.locator('[data-testid="lead-item"]').first();
    await lead.click();

    // Click log activity
    await page.click('[data-testid="add-activity-btn"]');

    // Add note
    await page.fill('textarea[placeholder="Activity notes"]', 'Lead interested in program');

    // WITHOUT setting follow-up, button should be disabled
    const saveBtn = page.locator('button:has-text("Save Activity")');
    await expect(saveBtn).toBeDisabled();

    // Set follow-up
    await page.click('[data-testid="set-followup"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    // Now button should be enabled
    await expect(saveBtn).toBeEnabled();

    // Save
    await saveBtn.click();

    // Verify
    const activityLogged = page.locator('text=Activity logged');
    await expect(activityLogged).toBeVisible();
  });

  test('should show missed follow-ups alert', async ({ page }) => {
    await navigateToDashboard(page);

    // Look for overdue section
    const overdueSection = page.locator('[data-testid="overdue-followups"]');

    if ((await overdueSection.count()) > 0) {
      const overdueCount = await page.locator('[data-testid="overdue-count"]').textContent();
      expect(parseInt(overdueCount || '0')).toBeGreaterThan(0);

      // Click to view
      await overdueSection.click();

      // Verify list is shown with leads' timeline visible
      const leads = page.locator('[data-testid="overdue-lead"]');
      expect(await leads.count()).toBeGreaterThan(0);
    }
  });

  test('should update lead status on successful call', async ({ page }) => {
    await navigateToDashboard(page);

    const lead = page.locator('[data-testid="lead-item"]').first();
    await lead.click();

    const currentStatus = await page.locator('[data-testid="status-badge"]').textContent();

    // Log a call
    await page.click('[data-testid="log-call-btn"]');
    await page.fill('textarea[placeholder="Notes"]', 'Called and discussed');

    // Set follow-up
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    // Save
    await page.click('button:has-text("Save")');

    // If status was LEAD, should move to CONTACTED
    if (currentStatus?.includes('LEAD')) {
      const newStatus = await page.locator('[data-testid="status-badge"]').textContent();
      expect(newStatus).toContain('CONTACTED');
    }
  });
});
```

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- lead-management.spec.ts

# View HTML report
npm run test:e2e:report
```

## Best Practices

1. **Use data-testid attributes:**
   ```tsx
   <div data-testid="follow-up-item">...</div>
   ```

2. **Test user workflows, not implementation:**
   ```typescript
   // ✓ Good
   await page.click('text=Mark as Complete');
   
   // ✗ Bad
   await page.evaluate(() => document.querySelector('.complete-btn').click());
   ```

3. **Use fixtures for test data:**
   ```typescript
   test.use({ 
     testLead: { 
       name: 'Test Lead',
       phone: '+919876543210' 
     }
   });
   ```

4. **Handle timing issues:**
   ```typescript
   // Wait for element to be visible
   await page.waitForSelector('[data-testid="follow-up-saved"]');
   
   // Wait for navigation
   await page.waitForNavigation();
   
   // Wait for network
   await page.waitForLoadState('networkidle');
   ```

## CI/CD Integration

Add to GitHub Actions:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run dev &
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Important Test Scenarios

1. **Dashboard displays follow-ups correctly**
   - Today's count accurate
   - Overdue count accurate
   - Can filter by priority

2. **Follow-up completion workflow**
   - Cannot save without follow-up date
   - Successfully sets next follow-up
   - Moves to next stage

3. **Lead management**
   - Create new lead
   - Prevent duplicates
   - Assign to counselor
   - Move through pipeline

4. **Activity logging**
   - Log calls, emails, WhatsApp
   - Show timeline correctly
   - Update lead status

## Debugging

```bash
# Debug specific test
npx playwright test followup-flow.spec.ts --debug

# Generate trace for debugging
npm run test:e2e -- --trace on

# View videos on failure
npm run test:e2e -- --video on
```

---

**Status:** Ready to implement after backend core tests pass ✅

Start with backend tests first, then add these frontend tests!
