import { Client } from '@notionhq/client';
import { NotionReportData } from '../types/index.js';
import { config } from '../config/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('NotionClient');

export class NotionReportClient {
  private client: Client;
  private databaseId: string;

  constructor() {
    this.client = new Client({ auth: config.notion.apiKey });
    this.databaseId = config.notion.databaseId;
  }

  async createReport(reportData: NotionReportData): Promise<{ url: string; id: string }> {
    logger.info(`Creating Notion report: ${reportData.title}`);

    try {
      const page = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          'Title': {
            title: [
              {
                text: { content: reportData.title },
              },
            ],
          },
          'Generated At': {
            date: { start: reportData.analysis.generated_at.toISOString() },
          },
          'Sentiment Score': {
            number: reportData.analysis.sentiment_score,
          },
          'Status': {
            select: { name: 'Published' },
          },
        },
        children: this.buildPageContent(reportData),
      });

      logger.info(`Report created successfully: ${page.url}`);
      return { url: page.url, id: page.id };
    } catch (error) {
      logger.error('Failed to create Notion report:', error);
      throw error;
    }
  }

  async updateReport(pageId: string, reportData: NotionReportData): Promise<{ url: string }> {
    logger.info(`Updating Notion report: ${pageId}`);

    try {
      // Update properties
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          'Generated At': {
            date: { start: reportData.analysis.generated_at.toISOString() },
          },
          'Sentiment Score': {
            number: reportData.analysis.sentiment_score,
          },
        },
      });

      // Append new content
      await this.client.blocks.children.append({
        block_id: pageId,
        children: this.buildPageContent(reportData),
      });

      const page = await this.client.pages.retrieve({ page_id: pageId });
      return { url: (page as any).url };
    } catch (error) {
      logger.error('Failed to update Notion report:', error);
      throw error;
    }
  }

  private buildPageContent(reportData: NotionReportData): any[] {
    const { analysis, raw_data } = reportData;

    return [
      // Summary section
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: '📊 Executive Summary' } }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: analysis.summary } }],
        },
      },
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },

      // Key Trends
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🔥 Key Trends' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: analysis.key_trends.slice(0, 1).map(trend => ({
            type: 'text',
            text: { content: trend },
          })),
        },
      },
      ...analysis.key_trends.slice(1).map(trend => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: trend } }],
        },
      })),

      // Top Fragrances
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '⭐ Top Fragrances' } }],
        },
      },
      ...analysis.top_fragrances.map((fragrance, index) => ({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `${fragrance.name} by ${fragrance.brand} - Score: ${fragrance.popularity_score.toFixed(1)}`,
              },
              annotations: { bold: index === 0 },
            },
          ],
        },
      })),

      // Trending Keywords
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🔍 Trending Keywords' } }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: analysis.trending_keywords.join(' • ') },
              annotations: { code: true },
            },
          ],
        },
      },

      // Insights
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '💡 Insights' } }],
        },
      },
      ...analysis.insights.map(insight => ({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { emoji: '💡' },
          rich_text: [{ type: 'text', text: { content: insight } }],
        },
      })),

      // Data Summary
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: 'Data Summary' } }],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Fragrances analyzed: ${raw_data.fragrances.length}` },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Trend keywords tracked: ${raw_data.trends.length}` },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Social mentions: ${raw_data.social_mentions.length}` },
            },
          ],
        },
      },
    ];
  }

  async findExistingReport(title: string): Promise<string | null> {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Title',
          title: {
            equals: title,
          },
        },
      });

      if (response.results.length > 0) {
        return response.results[0].id;
      }

      return null;
    } catch (error) {
      logger.error('Error searching for existing report:', error);
      return null;
    }
  }
}
