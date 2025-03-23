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

generateTweetText().then(console.log);