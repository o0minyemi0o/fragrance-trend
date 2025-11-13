import dotenv from 'dotenv';

dotenv.config();

export const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || '',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  },
  dataSources: {
    fragranticaApiKey: process.env.FRAGRANTICA_API_KEY || '',
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    googleTrendsApiKey: process.env.GOOGLE_TRENDS_API_KEY || '',
  },
  scheduler: {
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * 1', // Default: Every Monday at 9 AM
    timezone: process.env.TIMEZONE || 'Asia/Seoul',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(): boolean {
  const required = [
    config.notion.apiKey,
    config.notion.databaseId,
  ];

  const missing = required.filter(value => !value);

  if (missing.length > 0) {
    console.error('Missing required configuration. Please check your .env file.');
    return false;
  }

  return true;
}
