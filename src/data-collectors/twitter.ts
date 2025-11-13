import axios from 'axios';
import { BaseCollector } from './base.js';
import { TwitterMention } from '../types/index.js';
import { config } from '../config/index.js';

/**
 * Collector for Twitter/X mentions
 * Uses Twitter API v2
 */
export class TwitterCollector extends BaseCollector<TwitterMention> {
  private readonly baseUrl = 'https://api.twitter.com/2';

  constructor() {
    super('TwitterCollector');
  }

  async collect(keywords: string[]): Promise<TwitterMention[]> {
    this.logger.info(`Collecting Twitter mentions for keywords: ${keywords.join(', ')}`);

    const results: TwitterMention[] = [];

    for (const keyword of keywords) {
      try {
        const data = await this.retryWithBackoff(() => this.fetchTwitterMentions(keyword));
        results.push(...data);
      } catch (error) {
        this.logger.error(`Failed to collect Twitter data for keyword "${keyword}":`, error);
      }
    }

    this.logger.info(`Collected ${results.length} Twitter mentions`);
    return results;
  }

  private async fetchTwitterMentions(keyword: string): Promise<TwitterMention[]> {
    if (!config.dataSources.twitterBearerToken) {
      this.logger.warn('Twitter API token not configured, using mock data');
      return this.getMockData(keyword);
    }

    try {
      const query = `${keyword} (perfume OR fragrance) -is:retweet lang:en`;
      const response = await axios.get(`${this.baseUrl}/tweets/search/recent`, {
        params: {
          query,
          max_results: 50,
          'tweet.fields': 'created_at,public_metrics,entities',
          'user.fields': 'username',
          expansions: 'author_id',
        },
        headers: {
          'Authorization': `Bearer ${config.dataSources.twitterBearerToken}`,
        },
      });

      return this.parseTwitterResponse(response.data);
    } catch (error) {
      this.logger.error('Twitter API error:', error);
      return this.getMockData(keyword);
    }
  }

  private parseTwitterResponse(data: any): TwitterMention[] {
    const tweets = data.data || [];
    const users = data.includes?.users || [];

    return tweets.map((tweet: any) => {
      const author = users.find((u: any) => u.id === tweet.author_id);
      const hashtags = tweet.entities?.hashtags?.map((h: any) => h.tag) || [];

      return {
        text: tweet.text,
        author: author?.username || 'unknown',
        engagement: (tweet.public_metrics?.like_count || 0) +
                   (tweet.public_metrics?.retweet_count || 0) +
                   (tweet.public_metrics?.reply_count || 0),
        timestamp: new Date(tweet.created_at),
        hashtags,
      };
    });
  }

  private getMockData(keyword: string): TwitterMention[] {
    return [
      {
        text: `Just tried the new ${keyword} fragrance and it's amazing! #perfume #fragrance`,
        author: 'perfume_lover',
        engagement: 45,
        timestamp: new Date(),
        hashtags: ['perfume', 'fragrance'],
      },
      {
        text: `${keyword} is the scent of the season 🌸 #FragranceOfTheDay`,
        author: 'scent_enthusiast',
        engagement: 78,
        timestamp: new Date(),
        hashtags: ['FragranceOfTheDay'],
      },
    ];
  }

  async getHashtagTrends(): Promise<string[]> {
    // Get trending fragrance-related hashtags
    return ['#perfume', '#fragrance', '#FOTD', '#scentoftheday', '#nicheperfume'];
  }
}
