const axios = require('axios');
require('dotenv').config();

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
      // Select the first article
      const article = response.data.articles[0];
      
      // Format the content
      const content = `
${article.title}

${article.description}

${article.content}

Source: ${article.source.name}
URL: ${article.url}
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