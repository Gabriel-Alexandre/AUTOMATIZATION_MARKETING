# Twitter Automation Bot with Claude 3.5

Este projeto automatiza a postagem de conteúdo no Twitter utilizando o Playwright para a automação web e o Claude 3.5 (via OpenRouter) para gerar textos chamativos com emojis.

## Funcionalidades

- Gera textos criativos e chamativos (máximo 200 caracteres) usando Claude 3.5
- Automatiza o login no Twitter
- Realiza a postagem automática do texto gerado
- Utiliza emojis estrategicamente para aumentar o engajamento

## Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no Twitter
- Chave de API do OpenRouter

## Instalação

1. Clone o repositório:
   ```
   git clone [URL_DO_REPOSITÓRIO]
   cd AUTOMATIZATION_MARKETING
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure suas credenciais:
   - Renomeie o arquivo `.env.example` para `.env`
   - Preencha com suas credenciais:
     ```
     TWITTER_USERNAME=seu_usuario_twitter
     TWITTER_PASSWORD=sua_senha_twitter
     OPENROUTER_API_KEY=sua_chave_api_openrouter
     ```

## Uso

### Execução do bot diretamente

```
npm start
```

### Execução como teste Playwright

```
npm test
```

### Modo debug (com interface visual do Playwright)

```
npm run debug
```

### Visualização de relatórios

```
npm run report
```

## Estrutura do Projeto

- `twitter-post-bot.js` - Script principal para execução direta
- `tests/twitter-post.spec.js` - Teste Playwright para a automação
- `playwright.config.js` - Configuração do Playwright
- `.env` - Arquivo de variáveis de ambiente (credenciais)

## Personalização

Para modificar o prompt usado para gerar o texto do tweet, edite a função `generateTweetText()` nos arquivos `twitter-post-bot.js` e `tests/twitter-post.spec.js`.

## Notas Importantes

- Este bot é para fins educacionais e de automação pessoal.
- Respeite os Termos de Serviço do Twitter ao utilizar esta automação.
- O uso excessivo de automação pode levar à suspensão da sua conta no Twitter.
- Recomenda-se executar em modo não-headless (navegador visível) para monitorar o processo.

## Licença

ISC 