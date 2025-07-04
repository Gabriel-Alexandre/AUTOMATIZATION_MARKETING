const { test, expect } = require('@playwright/test');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Caminho para o arquivo que armazenará as informações das últimas notícias
// Garantindo que o arquivo seja salvo na raiz do projeto AUTOMATIZATION_MARKETING
const lastNewsFilePath = path.join(process.cwd(), 'last-news.json');

// Log do caminho completo para depuração
console.log(`Caminho do arquivo de cache de notícias: ${lastNewsFilePath}`);

// Função para garantir que o diretório existe
function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname, { recursive: true });
  return true;
}

// Função para salvar dados das últimas notícias usadas
async function saveLastNewsData(article) {
  try {
    const newsData = {
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
      timestamp: new Date().toISOString()
    };
    
    // Garantir que o diretório exista
    ensureDirectoryExists(lastNewsFilePath);
    
    // Obter histórico existente ou criar um novo array vazio
    let newsHistory = [];
    if (fs.existsSync(lastNewsFilePath)) {
      try {
        const data = fs.readFileSync(lastNewsFilePath, 'utf8');
        newsHistory = JSON.parse(data);
        
        // Garantir que newsHistory é um array
        if (!Array.isArray(newsHistory)) {
          console.log('Arquivo de histórico existe mas não é um array, criando novo array');
          newsHistory = [];
        }
      } catch (parseError) {
        console.error(`Erro ao ler arquivo de histórico: ${parseError.message}`);
        newsHistory = [];
      }
    }
    
    // Adicionar a nova notícia no início do array
    newsHistory.unshift(newsData);
    
    // Manter apenas as últimas 14 notícias
    if (newsHistory.length > 14) {
      newsHistory = newsHistory.slice(0, 14);
    }
    
    // Usar fs.writeFileSync para escrita síncrona, facilitando debug
    console.log(`Tentando salvar histórico de notícias no arquivo: ${lastNewsFilePath}`);
    console.log(`Total de notícias no histórico: ${newsHistory.length}`);
    fs.writeFileSync(lastNewsFilePath, JSON.stringify(newsHistory, null, 2), 'utf8');
    console.log('Dados das notícias salvos com sucesso para referência futura');
    
    // Verificar se o arquivo foi realmente criado
    if (fs.existsSync(lastNewsFilePath)) {
      console.log(`Arquivo verificado e existe em: ${lastNewsFilePath}`);
    } else {
      console.error(`ERRO: Arquivo não foi criado em: ${lastNewsFilePath}`);
    }
  } catch (error) {
    console.error(`Erro ao salvar dados das últimas notícias: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
  }
}

// Função para obter dados das últimas notícias
async function getLastNewsData() {
  try {
    if (fs.existsSync(lastNewsFilePath)) {
      console.log(`Lendo arquivo de histórico de notícias: ${lastNewsFilePath}`);
      const data = fs.readFileSync(lastNewsFilePath, 'utf8');
      const newsHistory = JSON.parse(data);
      
      // Verificar se o histórico é um array e não está vazio
      if (Array.isArray(newsHistory) && newsHistory.length > 0) {
        console.log(`Histórico contém ${newsHistory.length} notícias anteriores`);
        return newsHistory;
      }
      console.log('Arquivo de histórico existe mas está vazio ou não é válido');
    } else {
      console.log(`Arquivo de notícias anterior não encontrado em: ${lastNewsFilePath}`);
    }
    return [];
  } catch (error) {
    console.error(`Erro ao ler dados das últimas notícias: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
    return [];
  }
}

// Function to fetch AI news from the web
async function fetchAINews() {
  try {
    console.log('Buscando notícias sobre IA na internet...');
    
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'artificial intelligence',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 5
      },
      headers: {
        'X-Api-Key': process.env.NEWS_API_KEY
      }
    });
    
    if (response.data && response.data.articles && response.data.articles.length > 0) {
      // Obter dados das últimas notícias usadas
      const lastNewsHistory = await getLastNewsData();
      
      // Lista de artigos
      const articles = response.data.articles;
      
      // Selecionar um artigo diferente do último usado
      let selectedArticle = articles[0]; // Padrão: primeiro artigo
      
      if (Array.isArray(lastNewsHistory) && lastNewsHistory.length > 0) {
        console.log('Verificando se a notícia é diferente das anteriores...');
        
        // Lista dos títulos usados anteriormente
        const previousTitles = lastNewsHistory.map(item => item.title);
        
        // Procurar um artigo com título que não está no histórico
        const differentArticle = articles.find(article => 
          !previousTitles.includes(article.title)
        );
        
        if (differentArticle) {
          console.log('Encontrada notícia diferente das anteriores');
          selectedArticle = differentArticle;
        } else {
          console.log('Não foi possível encontrar uma notícia diferente entre as 5 primeiras');
          // Se não encontrar uma diferente, tenta buscar mais notícias
          try {
            const moreResponse = await axios.get('https://newsapi.org/v2/everything', {
              params: {
                q: 'artificial intelligence',
                language: 'en',
                sortBy: 'publishedAt',
                pageSize: 10,
                page: 2  // Buscando segunda página de resultados
              },
              headers: {
                'X-Api-Key': process.env.NEWS_API_KEY
              }
            });
            
            if (moreResponse.data && moreResponse.data.articles && moreResponse.data.articles.length > 0) {
              // Procurar entre os artigos da segunda página
              const differentArticleFromPage2 = moreResponse.data.articles.find(article => 
                !previousTitles.includes(article.title)
              );
              
              if (differentArticleFromPage2) {
                selectedArticle = differentArticleFromPage2;
                console.log('Usando notícia diferente da segunda página de resultados');
              } else {
                console.log('Não foi possível encontrar notícia diferente mesmo na segunda página');
              }
            }
          } catch (error) {
            console.error('Erro ao buscar mais notícias:', error.message);
          }
        }
      }
      
      // Salvar dados do artigo selecionado para referência futura
      await saveLastNewsData(selectedArticle);
      
      // Format the content
      const content = `
${selectedArticle.title}

${selectedArticle.description}

${selectedArticle.content}

Source: ${selectedArticle.source.name}
URL: ${selectedArticle.url}
`;
      
      console.log('Notícia encontrada com sucesso');
      return content;
    } else {
      throw new Error('Nenhuma notícia encontrada');
    }
  } catch (error) {
    console.error('Erro ao buscar notícias de IA:', error.message);
    // Return fallback content if fetch fails
    return `
Artificial Intelligence continues to transform industries with breakthrough innovations.

Recent developments in AI models have shown significant improvements in language understanding,
vision processing, and decision-making capabilities.

Researchers are focusing on making AI systems more transparent, ethical, and aligned with human values.

This technology is expected to drive major changes across healthcare, education, transportation,
and many other sectors in the coming years.
`;
  }
}

// Function to generate tweet text
async function generateTweetText() {
  try {
    console.log('Gerando texto do tweet...');
    
    // Fetch AI news to use as content
    const newsContent = await fetchAINews();
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.7-sonnet',
        messages: [
          {
            role: 'user',
            content: 'Generate an attention-grabbing tweet in English for marketing purposes. Use emojis strategically. Must be under 280 characters and compelling. Make it stand out. follow the content: ' + newsContent
          }
        ],
        max_tokens: 280
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the generated text
    const generatedText = response.data.choices[0].message.content.trim();
    console.log('Texto gerado com sucesso');
    
    // Ensure it's under 200 characters
    return generatedText.length > 200 ? generatedText.substring(0, 197) + '...' : generatedText;
  } catch (error) {
    console.error('Erro ao gerar texto do tweet:', error.message);
    return '🚀 Exciting news coming soon! Stay tuned for updates. #Innovation #ComingSoon 🔥';
  }
}

test('Post a tweet generated by Claude 3.7', async ({ page, context }) => {
  // Configurações adicionais para evitar detecção de automação
  await context.addInitScript(() => {
    // Esconder sinais de automação
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  try {
  // Generate tweet text
  const tweetText = await generateTweetText();
    console.log('Texto gerado para o tweet:', tweetText);

    // Acessa o Twitter
    console.log('Acessando o Twitter...');
    
    await page.goto('https://twitter.com/i/flow/login', {
      timeout: 60000,
      waitUntil: 'domcontentloaded'
    });
    
    console.log('Verificando se página de login carregou...');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('Timeout na espera de networkidle, continuando mesmo assim');
    });
    
    // Verificação adicional para garantir que estamos na página correta
    const pageTitle = await page.title();
    console.log(`Título da página atual: ${pageTitle}`);
    
    // Capturar screenshot para verificar estado da página
    await page.screenshot({ path: './img-twitter-execution/login-page.png' }).catch(e => console.error('Erro ao capturar screenshot:', e.message));
    console.log('Screenshot salvo em login-page.png');
    
    // Aguarda para garantir que a página está completamente carregada
    await page.waitForTimeout(5000);
    
    // Verifica se estamos realmente na página de login antes de continuar
    const isLoginForm = await page.isVisible('input[autocomplete="username"], input[type="text"]', { timeout: 10000 })
      .catch(() => false);
      
    if (!isLoginForm) {
      console.log('Página de login não detectada corretamente. Tentando acessar novamente...');
      // Tenta acessar a página de login diretamente novamente
      await page.goto('https://twitter.com/i/flow/login?redirect_after_login=%2F', {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'login-page-retry.png' });
    }
    
    // Preenche nome de usuário/email
    console.log('Preenchendo credenciais...');
    
    // Verifica novamente se o campo de usuário está visível
    const usernameVisible = await page.isVisible('input[autocomplete="username"], input[type="text"]', { timeout: 10000 })
      .catch(() => false);
      
    if (!usernameVisible) {
      console.error('Campo de usuário não encontrado mesmo após tentativas!');
      await page.screenshot({ path: './img-twitter-execution/login-form-not-found.png' });
      throw new Error('Não foi possível encontrar o formulário de login');
    }
    
    // Preenchimento com foco explícito no campo - Usamos o EMAIL primeiro, não o username
    console.log('Preenchendo EMAIL na primeira tela...');
    await page.focus('input[autocomplete="username"], input[type="text"]').catch(() => 
      console.log('Não foi possível focar no campo de usuário'));
    
    // Usar o EMAIL na primeira tela, não o username
    await page.fill('input[autocomplete="username"], input[type="text"]', process.env.TWITTER_EMAIL, { timeout: 20000 }).catch(async () => {
      console.log('Campo de email não encontrado com seletor padrão, tentando alternativa...');
      await page.fill('input[type="text"]', process.env.TWITTER_EMAIL, { timeout: 10000 });
    });

    // Aguarda um pouco antes de prosseguir
    await page.waitForTimeout(1000);

    // Clica no botão Next com método simplificado e mais seguro
    console.log('Clicando no botão Next na primeira tela...');
    await page.screenshot({ path: './img-twitter-execution/after-email-input.png' }).catch(() => {});
    
    // Verifica todos os botões disponíveis na página para debug
    try {
      const buttons = await page.$$('div[role="button"]');
      console.log(`Encontrados ${buttons.length} botões na página`);
      
      // Se encontrou algum botão, tenta clicar no primeiro (geralmente é o Next/Avançar)
      if (buttons.length > 0) {
        console.log('Clicando no primeiro botão encontrado');
        await buttons[0].click().catch(e => console.log('Erro ao clicar no primeiro botão:', e.message));
      } else {
        // Se não encontrou botões, tenta pressionar Enter
        console.log('Nenhum botão encontrado, tentando pressionar Enter');
        await page.keyboard.press('Enter').catch(e => console.log('Erro ao pressionar Enter:', e.message));
      }
    } catch (e) {
      console.log('Erro ao tentar interagir com botões:', e.message);
      // Continua mesmo com erro
    }
    
    // Aguarda para verificar se avançamos para a próxima tela
    await page.waitForTimeout(5000);
    await page.screenshot({ path: './img-twitter-execution/after-next-button.png' }).catch(() => {});
    
    // Verificações de segurança: checamos se a página ainda está ativa de forma correta
    let isPageClosed = false;
    try {
      isPageClosed = page.isClosed();
    } catch (e) {
      console.log('Erro ao verificar se página está fechada:', e.message);
      isPageClosed = true;
    }
    
    if (isPageClosed) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }

    // Verifica se estamos na tela de "atividade incomum"
    const isUnusualActivityScreen = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return pageText.includes('unusual login') || pageText.includes('unusual activity') || 
             pageText.includes('Enter your phone number') || pageText.includes('Enter your phone number or username');
    }).catch(() => false); // Em caso de erro, assume que não estamos na tela
    
    if (isUnusualActivityScreen) {
      console.log('Detectada tela de atividade incomum!');
      
      // Verifica se a página ainda está disponível
      try {
        isPageClosed = page.isClosed();
      } catch (e) {
        console.log('Erro ao verificar se página está fechada:', e.message);
        isPageClosed = true;
      }
      
      if (isPageClosed) {
        console.error('A página foi fechada durante o processo. Abortando.');
        return;
      }
      
      // Preenche com o username nessa tela
      await page.fill('input[type="text"]', process.env.TWITTER_USERNAME, { timeout: 10000 }).catch(async (e) => {
        console.log('Erro ao preencher username:', e.message);
        console.log('Tentando outros seletores para o campo de username...');
        await page.fill('input', process.env.TWITTER_USERNAME, { timeout: 10000 }).catch(e => 
          console.log('Erro ao preencher com seletor alternativo:', e.message));
      });
      
      // Verifica novamente se a página ainda está disponível
      try {
        isPageClosed = page.isClosed();
      } catch (e) {
        console.log('Erro ao verificar se página está fechada:', e.message);
        isPageClosed = true;
      }
      
      if (isPageClosed) {
        console.error('A página foi fechada durante o processo. Abortando.');
        return;
      }
      
      // Clica no botão Next nessa tela usando a mesma abordagem robusta
      console.log('Clicando em Next na tela de verificação...');
      try {
        const buttons = await page.$$('div[role="button"]');
        if (buttons.length > 0) {
          console.log('Clicando no primeiro botão encontrado');
          await buttons[0].click().catch(e => console.log('Erro ao clicar no botão:', e.message));
        } else {
          console.log('Nenhum botão encontrado, tentando pressionar Enter');
          await page.keyboard.press('Enter').catch(e => console.log('Erro ao pressionar Enter:', e.message));
        }
      } catch (e) {
        console.log('Erro ao tentar interagir com botões:', e.message);
      }
      
      // Aguarda para a próxima tela
      await page.waitForTimeout(5000);
      await page.screenshot({ path: './img-twitter-execution/after-unusual-activity.png' }).catch(() => {});
    } else {
      console.log('Não detectada tela de atividade incomum, continuando com fluxo padrão...');
    }
    
    // Verifica se a página ainda está disponível antes de continuar
    if (page.isClosed()) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }
    
    // Agora verifica se estamos na tela para inserir o USERNAME
    const usernameScreen = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return pageText.includes('Enter your username') || pageText.includes('Enter your phone or username');
    }).catch(() => false);
    
    if (usernameScreen) {
      console.log('Detectada tela de inserção de username!');
      
      // Verifica se a página ainda está disponível
      if (page.isClosed()) {
        console.error('A página foi fechada durante o processo. Abortando.');
        return;
      }
      
      // Preenche com o username nessa tela
      await page.fill('input[type="text"]', process.env.TWITTER_USERNAME, { timeout: 10000 }).catch(async (e) => {
        console.log('Erro ao preencher username:', e.message);
        console.log('Tentando outros seletores para o campo de username...');
        await page.fill('input', process.env.TWITTER_USERNAME, { timeout: 10000 }).catch(e => 
          console.log('Erro ao preencher com seletor alternativo:', e.message));
      });
      
      // Verifica novamente se a página ainda está disponível
      if (page.isClosed()) {
        console.error('A página foi fechada durante o processo. Abortando.');
        return;
      }
      
      // Clica no botão Next nessa tela usando a mesma abordagem robusta
      console.log('Clicando em Next na tela de username...');
      try {
        const buttons = await page.$$('div[role="button"]');
        if (buttons.length > 0) {
          console.log('Clicando no primeiro botão encontrado');
          await buttons[0].click().catch(e => console.log('Erro ao clicar no botão:', e.message));
        } else {
          console.log('Nenhum botão encontrado, tentando pressionar Enter');
          await page.keyboard.press('Enter').catch(e => console.log('Erro ao pressionar Enter:', e.message));
        }
      } catch (e) {
        console.log('Erro ao tentar interagir com botões:', e.message);
      }
      
      // Aguarda para a próxima tela
      await page.waitForTimeout(5000);
      await page.screenshot({ path: './img-twitter-execution/after-username-screen.png' }).catch(() => {});
    }
    
    // Verifica se a página ainda está disponível antes de continuar
    if (page.isClosed()) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }
    
    // Agora espera pela tela de senha
    console.log('Esperando pela tela de senha...');
  await page.waitForTimeout(3000);
  
    // Verifica se a página ainda está disponível
    if (page.isClosed()) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }
    
    // Espera pelo campo de senha
    console.log('Preenchendo senha...');
    
    // Tira screenshot para ver em qual tela estamos
    await page.screenshot({ path: './img-twitter-execution/before-password.png' }).catch(() => {});
    
    // Tenta preencher o campo de senha com tratamento de erro robusto
    await page.fill('input[name="password"]', process.env.TWITTER_PASSWORD, { timeout: 20000 }).catch(async (e) => {
      console.log('Erro ao preencher senha:', e.message);
      console.log('Campo de senha não encontrado com seletor padrão, tentando alternativa...');
      await page.fill('input[type="password"]', process.env.TWITTER_PASSWORD, { timeout: 10000 }).catch(e => 
        console.log('Erro ao preencher senha com seletor alternativo:', e.message));
    });

    // Verifica se a página ainda está disponível
    if (page.isClosed()) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }
    
    // Tenta clicar no botão de login com a mesma abordagem robusta
    console.log('Clicando no botão de login...');
    
    // Captura screenshot antes de prosseguir
    await page.screenshot({ path: './img-twitter-execution/before-login-button-click.png' }).catch(e => console.log('Erro ao capturar screenshot:', e.message));
    
    // Usa nossa abordagem robusta para clicar no botão
    try {
      const buttons = await page.$$('div[role="button"]');
      if (buttons.length > 0) {
        console.log('Clicando no primeiro botão encontrado');
        await buttons[0].click().catch(e => console.log('Erro ao clicar no botão:', e.message));
      } else {
        console.log('Nenhum botão encontrado, tentando pressionar Enter');
        await page.keyboard.press('Enter').catch(e => console.log('Erro ao pressionar Enter:', e.message));
      }
    } catch (e) {
      console.log('Erro ao tentar interagir com botões:', e.message);
    }
    
    // Espere um pouco antes de continuar
    await page.waitForTimeout(5000);

    // Verifica se a página ainda está disponível
    if (page.isClosed()) {
      console.error('A página foi fechada durante o processo. Abortando.');
      return;
    }

    // Aguarda redirecionamento para a página inicial
    console.log('Aguardando redirecionamento para a página inicial...');
    await page.waitForURL('**/home', { timeout: 60000 }).catch(() => {
      console.log('Timeout ao aguardar redirecionamento, verificando URL manualmente...');
    });

    // Verifica se estamos na home page
    const currentUrl = await page.url();
    if (!currentUrl.includes('/home')) {
      console.log('Não redirecionou automaticamente para a home. URL atual:', currentUrl);
      await page.goto('https://twitter.com/home', { timeout: 30000 });
    }

    // Compõe um novo tweet
    console.log('Compondo novo tweet...');
    
    // Tenta clicar no botão de compor tweet com diversos seletores
    // Captura screenshot antes de prosseguir
    await page.screenshot({ path: './img-twitter-execution/home-page.png' }).catch(e => console.log('Erro ao capturar screenshot:', e.message));
    
    try {
      await page.click('a[data-testid="SideNav_NewTweet_Button"]', { timeout: 5000 }).catch(async () => {
        console.log('Tentando seletor alternativo 1...');
        await page.click('a[aria-label="Tweet"]', { timeout: 5000 }).catch(async () => {
          console.log('Tentando seletor alternativo 2...');
          await page.click('a:has-text("Tweet")', { timeout: 5000 }).catch(async () => {
            console.log('Tentando seletor alternativo 3...');
            await page.click('div[aria-label="Tweet"]', { timeout: 5000 }).catch(e => {
              console.log('Nenhum botão de tweet encontrado:', e.message);
              throw new Error('Não foi possível encontrar o botão de compor tweet');
            });
          });
        });
      });
    } catch (tweetButtonError) {
      console.error('Erro ao tentar clicar no botão de compor tweet:', tweetButtonError.message);
      throw tweetButtonError; // Esse erro é crítico, não podemos continuar sem compor o tweet
    }

    // Digita o texto do tweet
    await page.fill('div[data-testid="tweetTextarea_0"]', tweetText, { timeout: 20000 });

    // Clica no botão de enviar tweet
    console.log('Enviando tweet...');
    try {
      // Tenta várias estratégias para clicar no botão Post
      await page.click('div[data-testid="tweetButton"]', { timeout: 5000 }).catch(async () => {
        console.log('Tentando seletor alternativo 1 para botão Post...');
        await page.click('button[data-testid="tweetButton"]', { timeout: 5000 }).catch(async () => {
          console.log('Tentando seletor alternativo 2 para botão Post...');
          await page.click('div[role="button"]:has-text("Post")', { timeout: 5000 }).catch(async () => {
            console.log('Tentando seletor alternativo 3 para botão Post...');
            await page.click('button:has-text("Post")', { timeout: 5000 }).catch(async () => {
              console.log('Tentando estratégia por índice...');
              const postButtons = await page.$$('div[role="button"], button');
              console.log(`Encontrados ${postButtons.length} botões potenciais na tela`);
              
              // Se encontrou botões, tenta clicar nos possíveis candidatos
              if (postButtons.length > 0) {
                // Tenta um dos últimos botões da página, geralmente é o Post
                const buttonToClick = postButtons[postButtons.length - 1];
                console.log('Clicando no último botão encontrado');
                await buttonToClick.click().catch(e => console.log('Erro ao clicar no botão por índice:', e.message));
              } else {
                throw new Error('Não foi possível encontrar o botão de enviar tweet');
              }
            });
          });
        });
      });
    } catch (tweetSubmitError) {
      console.error('Erro ao tentar clicar no botão de Post:', tweetSubmitError.message);
      await page.screenshot({ path: './img-twitter-execution/post-button-error.png' });
      throw tweetSubmitError;
    }

    // Espera um pouco para o tweet ser enviado
    await page.waitForTimeout(5000);

    // Verifica se o tweet foi enviado
    const tweetPosted = await page.url().includes('/status/');
    if (tweetPosted) {
      console.log('Tweet enviado com sucesso!');
    } else {
      console.log('Não pudemos confirmar se o tweet foi enviado.');
    }

    // Captura screenshot final
    await page.screenshot({ path: './img-twitter-execution/tweet-posted.png' }).catch(e => console.error('Erro ao capturar screenshot final:', e.message));
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
    
    try {
      await page.screenshot({ path: './img-twitter-execution/error-screenshot.png' }).catch(() => {
        console.log('Não foi possível capturar screenshot de erro');
      });
    } catch (e) {
      // Ignora erros do screenshot
    }
    
    throw error;
  }
}); 