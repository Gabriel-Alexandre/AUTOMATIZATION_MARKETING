// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Reporter to use. */
  reporter: 'html',
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://twitter.com',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Run tests in headful mode (showing the browser) */
    headless: false,
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Record video of test execution */
    video: 'on-first-retry',
    
    /* Extended timeout para páginas carregarem */
    navigationTimeout: 120000,
    
    /* Tempo de espera para ações */
    actionTimeout: 30000,
    
    /* Retry on browser error */
    retry: 2,
    
    /* Configurações adicionais do navegador */
    launchOptions: {
      slowMo: 100, // Desacelera a execução para maior estabilidade
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-features=BlockInsecurePrivateNetworkRequests'
      ]
    },

    /* Configure proxy but bypass Twitter domains */
    /*proxy: {
      server: 'http://localhost:8000',
      // Não vamos mais fazer bypass de domínios
    },*/
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}); 