const { chromium } = require('@playwright/test');
const axios = require('axios');
require('dotenv').config();

// Function to generate tweet text using Claude 3.5 via OpenRouter
async function generateTweetText() {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-5-sonnet',
        messages: [
          {
            role: 'user',
            content: 'Generate an attention-grabbing tweet in English for marketing purposes. Use emojis strategically. Must be under 200 characters and compelling. Make it stand out.'
          }
        ],
        max_tokens: 200
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
    
    // Ensure it's under 200 characters
    return generatedText.length > 200 ? generatedText.substring(0, 197) + '...' : generatedText;
  } catch (error) {
    console.error('Error generating tweet text:', error.message);
    return '🚀 Exciting news coming soon! Stay tuned for updates. #Innovation #ComingSoon 🔥';
  }
}

// Function to login to Twitter and post the tweet
async function postTweet(tweetText) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Twitter login page...');
    await page.goto('https://twitter.com/i/flow/login');
    await page.waitForLoadState('networkidle');

    // Login process
    console.log('Logging in to Twitter...');
    await page.fill('input[autocomplete="username"]', process.env.TWITTER_USERNAME);
    await page.click('div[role="button"]:has-text("Next")');
    
    // Wait for password field and enter password
    await page.waitForSelector('input[name="password"]');
    await page.fill('input[name="password"]', process.env.TWITTER_PASSWORD);
    await page.click('div[role="button"]:has-text("Log in")');
    
    // Wait for the home page to load
    await page.waitForURL('https://twitter.com/home');
    console.log('Successfully logged in!');

    // Click on the tweet compose button
    console.log('Composing new tweet...');
    await page.click('a[data-testid="SideNav_NewTweet_Button"]');
    
    // Wait for the tweet composer to appear and type the tweet
    await page.waitForSelector('div[data-testid="tweetTextarea_0"]');
    await page.fill('div[data-testid="tweetTextarea_0"]', tweetText);
    
    // Click the tweet button to post
    await page.click('div[data-testid="tweetButton"]');
    
    console.log('Tweet posted successfully!');
    console.log('Tweet content:', tweetText);
    
    // Wait a bit to ensure the tweet is posted
    await page.waitForTimeout(3000);
  } catch (error) {
    console.error('Error during Twitter automation:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
}

// Main function to run the automation
async function main() {
  console.log('Generating tweet text using Claude 3.5...');
  const tweetText = await generateTweetText();
  console.log('Generated tweet text:', tweetText);
  
  console.log('Starting Twitter automation...');
  await postTweet(tweetText);
}

// Run the main function
main().catch(console.error); 