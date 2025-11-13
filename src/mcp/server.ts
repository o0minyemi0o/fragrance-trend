import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { FragranceTrendAgent } from '../agent/FragranceTrendAgent.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('MCPServer');

export class FragranceTrendMCPServer {
  private server: Server;
  private agent: FragranceTrendAgent;

  constructor() {
    this.server = new Server(
      {
        name: 'fragrance-trend-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.agent = new FragranceTrendAgent();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'collect_fragrance_data',
            description: 'Collect fragrance data from various sources (Fragrantica, Google Trends, Twitter)',
            inputSchema: {
              type: 'object',
              properties: {
                sources: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Data sources to collect from: fragrantica, google_trends, twitter',
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Keywords to search for',
                },
              },
              required: ['sources'],
            },
          },
          {
            name: 'analyze_trends',
            description: 'Analyze collected data and generate insights using AI',
            inputSchema: {
              type: 'object',
              properties: {
                data_id: {
                  type: 'string',
                  description: 'ID of the collected data to analyze',
                },
              },
              required: ['data_id'],
            },
          },
          {
            name: 'create_notion_report',
            description: 'Create or update a report in Notion with the analysis results',
            inputSchema: {
              type: 'object',
              properties: {
                analysis_id: {
                  type: 'string',
                  description: 'ID of the analysis result',
                },
                report_title: {
                  type: 'string',
                  description: 'Title for the Notion report',
                },
              },
              required: ['analysis_id', 'report_title'],
            },
          },
          {
            name: 'run_full_pipeline',
            description: 'Execute the complete pipeline: collect data -> analyze -> create report',
            inputSchema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Keywords to search for',
                },
                report_title: {
                  type: 'string',
                  description: 'Title for the Notion report',
                },
              },
              required: ['report_title'],
            },
          },
          {
            name: 'get_job_status',
            description: 'Get the status of a running or completed job',
            inputSchema: {
              type: 'object',
              properties: {
                job_id: {
                  type: 'string',
                  description: 'Job ID to check status for',
                },
              },
              required: ['job_id'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Tool called: ${name}`, args);

      try {
        switch (name) {
          case 'collect_fragrance_data':
            return await this.handleCollectData(args);

          case 'analyze_trends':
            return await this.handleAnalyzeTrends(args);

          case 'create_notion_report':
            return await this.handleCreateNotionReport(args);

          case 'run_full_pipeline':
            return await this.handleFullPipeline(args);

          case 'get_job_status':
            return await this.handleGetJobStatus(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleCollectData(args: any) {
    const result = await this.agent.collectData(args.sources, args.keywords);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data_id: result.id,
            message: 'Data collection completed',
            summary: {
              fragrances_collected: result.fragrances.length,
              trends_collected: result.trends.length,
              social_mentions: result.socialMentions.length,
            },
          }, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeTrends(args: any) {
    const result = await this.agent.analyzeTrends(args.data_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysis_id: result.id,
            summary: result.analysis.summary,
            key_trends: result.analysis.key_trends,
            top_fragrances: result.analysis.top_fragrances.slice(0, 5),
          }, null, 2),
        },
      ],
    };
  }

  private async handleCreateNotionReport(args: any) {
    const result = await this.agent.createNotionReport(args.analysis_id, args.report_title);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            notion_page_url: result.url,
            message: 'Report created successfully in Notion',
          }, null, 2),
        },
      ],
    };
  }

  private async handleFullPipeline(args: any) {
    const jobId = await this.agent.runFullPipeline(args.keywords, args.report_title);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            job_id: jobId,
            message: 'Full pipeline started. Use get_job_status to track progress.',
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetJobStatus(args: any) {
    const status = await this.agent.getJobStatus(args.job_id);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Fragrance Trend MCP Server started');
  }
}
