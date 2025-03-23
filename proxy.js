const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');

// Cria um servidor proxy com configurações melhoradas
const proxy = httpProxy.createProxyServer({
  // Habilita o registro de eventos websocket
  ws: true,
  // Preserva o cabeçalho de origem
  changeOrigin: true,
  // Define um timeout para evitar travamentos
  proxyTimeout: 60000,
  // Define um timeout para o socket
  timeout: 60000,
  // Não segue redirecionamentos (deixa o cliente fazer isso)
  followRedirects: true,
  // Ignora erros SSL para testes
  secure: false
});

// Cria o servidor HTTP que utilizará o proxy
const server = http.createServer((req, res) => {
  // Extrai o caminho da URL (ignorando hostname, porta etc.)
  const parsedUrl = url.parse(req.url);
  const path = parsedUrl.pathname;
  
  console.log(`[${new Date().toISOString()}] Requisição recebida: ${req.method} ${req.url}`);
  console.log('Caminho extraído:', path);
  
  // Endpoint de verificação - agora verificando apenas o caminho
  if (path === '/proxy-status') {
    console.log('Respondendo ao endpoint de status do proxy');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'running', timestamp: new Date().toISOString() }));
    return;
  }

  // Log completo da requisição (cabeçalhos incluídos)
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Identifica requisições vindas do Playwright
  const isPlaywright = req.headers['user-agent'] && req.headers['user-agent'].includes('Playwright');
  if (isPlaywright) {
    console.log('Requisição do Playwright detectada!');
  }

  // Remove cabeçalhos problemáticos que podem interferir no proxy
  delete req.headers['host'];
  
  // Define valores padrão
  let target = 'https://jsonplaceholder.typicode.com';
  
  // Detecta se a requisição é para o Twitter
  if (req.url.includes('twitter.com') || path.includes('/i/flow/login') || path.startsWith('/home')) {
    console.log('Redirecionando diretamente para Twitter');
    
    // Define como target direto o Twitter
    target = 'https://twitter.com';
    
    // Adiciona cabeçalhos para evitar detecção
    req.headers['accept-language'] = 'en-US,en;q=0.9';
    req.headers['upgrade-insecure-requests'] = '1';
  }
  // Verifica se é uma requisição para OpenRouter
  else if (req.url.includes('openrouter.ai')) {
    console.log('Redirecionando para OpenRouter API');
    target = 'https://openrouter.ai';
    
    // Adiciona cabeçalhos específicos para OpenRouter
    req.headers['Content-Type'] = 'application/json';
    
    // Log da URL completa para debug
    console.log('URL completa do OpenRouter:', req.url);
  }
  // Tratamento para JSONPlaceholder
  else if (path.match(/^\/users(\/\d+)?$/) || 
           path.match(/^\/posts(\/\d+)?$/) || 
           path.match(/^\/comments(\/\d+)?$/)) {
    console.log('Redirecionando para JSONPlaceholder API');
    target = 'https://jsonplaceholder.typicode.com';
  }
  
  console.log(`Redirecionando para: ${target}`);
  
  // Encaminha a requisição com configurações específicas
  proxy.web(req, res, { 
    target: target,
    changeOrigin: true,
    followRedirects: true,
    secure: false
  });
});

// Suporte a conexões WebSocket (usado pelo Playwright)
server.on('upgrade', (req, socket, head) => {
  console.log(`[${new Date().toISOString()}] Requisição WebSocket: ${req.url}`);
  
  let wsTarget = 'wss://twitter.com';
  
  // Se a requisição for WebSocket para o Twitter
  if (req.url.includes('twitter.com')) {
    console.log('Encaminhando WebSocket para Twitter');
  }
  
  proxy.ws(req, socket, head, { 
    target: wsTarget,
    changeOrigin: true,
    secure: false
  });
});

// Inicia o servidor na porta 8000
server.listen(8000, () => {
  console.log('Proxy rodando na porta 8000');
  console.log('Configurado para interceptar tráfego do Playwright');
  console.log('Endpoint de verificação disponível em: http://localhost:8000/proxy-status');
});

// Tratamento de erros do proxy
proxy.on('error', (err, req, res) => {
  console.error('Erro no proxy:', err);
  
  try {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Erro de proxy: ${err.message || 'O serviço de destino pode estar indisponível'}`);
    }
  } catch (e) {
    console.error('Erro ao tentar enviar resposta de erro:', e);
  }
});

// Eventos adicionais do proxy para debug
proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`Proxy requisição para: ${proxyReq.method} ${proxyReq.path}`);
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`Resposta do proxy: ${proxyRes.statusCode} para ${req.url}`);
});