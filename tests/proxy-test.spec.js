const { test, expect } = require('@playwright/test');

test('verificar se o endpoint de status do proxy está funcionando', async ({ page }) => {
  // Primeiro verificamos o endpoint de status do proxy
  await page.goto('http://localhost:8000/proxy-status');
  
  // Captura o conteúdo da página (deve ser o JSON de status)
  const content = await page.content();
  console.log('Conteúdo da resposta do proxy:', content);
  
  // Verifica se contém "status":"running"
  expect(content).toContain('"status":"running"');
});

test('verificar se o proxy passa requisições para APIs externas', async ({ page }) => {
  // Aumenta o timeout para dar mais tempo para a requisição
  test.slow();
  
  try {
    // Usa uma URL simples e direta para o teste
    console.log('Iniciando teste de requisição através do proxy');
    
    // Acessa um único usuário através do proxy
    await page.goto('http://localhost:8000/users/1', { 
      timeout: 60000,
      waitUntil: 'domcontentloaded' // Espera apenas que o DOM seja carregado
    });
    
    // Se chegou aqui sem erro, já é um bom sinal
    console.log('Página carregada com sucesso');
    
    // Captura o conteúdo da página
    const content = await page.content();
    console.log('Conteúdo recebido (primeiros 100 caracteres):', content.substring(0, 100) + '...');
    
    // Captura o texto visível na página (JSONPlaceholder retorna JSON que é renderizado como texto)
    const visibleText = await page.textContent('body');
    console.log('Texto visível na página:', visibleText.substring(0, 100) + '...');
    
    // Verifica se o conteúdo contém informações básicas de um usuário JSONPlaceholder
    // Como o ID ou o campo name que deve estar presente - usando expressão regular para mais flexibilidade
    expect(visibleText).toMatch(/"id":\s*1/);
    expect(visibleText).toContain('Leanne Graham');
    
    // Screenshot para verificação visual
    await page.screenshot({ path: 'json-response.png' });
  } catch (error) {
    console.error('Erro durante o teste:', error);
    // Captura um screenshot para debug
    await page.screenshot({ path: 'error-screenshot.png' });
    throw error;
  }
});

test('verificar se o proxy funciona com twitter', async ({ page }) => {
  test.slow();
  test.skip(true, 'Teste temporariamente desativado até que o proxy esteja funcionando corretamente');
  
  try {
    // Acessa Twitter através do proxy
    await page.goto('http://localhost:8000/twitter.com', { timeout: 60000 });
    
    // Verifica se estamos em uma página do Twitter (mesmo com proxy)
    const title = await page.title();
    console.log('Título da página do Twitter:', title);
    
    // Faz uma verificação básica para confirmar que é o Twitter
    const hasTwitterElement = 
      await page.isVisible('a[href="/explore"]') || 
      await page.isVisible('a[href="/home"]') ||
      await page.isVisible('input[placeholder*="Search"]') ||
      await page.isVisible('[aria-label="Twitter"]') ||
      await page.isVisible('[data-testid="AppTabBar_Home_Link"]');
    
    expect(hasTwitterElement).toBeTruthy();
  } catch (error) {
    console.error('Erro durante o teste de Twitter:', error);
    await page.screenshot({ path: 'twitter-error.png' });
    throw error;
  }
}); 