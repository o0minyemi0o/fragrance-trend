import { v4 as uuidv4 } from 'uuid';
import {
  FragranticaCollector,
  GoogleTrendsCollector,
  TwitterCollector,
} from '../data-collectors/index.js';
import { AIAnalyzer } from '../ai/analyzer.js';
import { NotionReportClient } from '../notion/client.js';
import { JobManager } from '../state/job-manager.js';
import {
  FragranceData,
  TrendData,
  TwitterMention,
  AnalysisResult,
  JobStatus,
} from '../types/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('FragranceTrendAgent');

interface CollectedData {
  id: string;
  fragrances: FragranceData[];
  trends: TrendData[];
  socialMentions: TwitterMention[];
  collected_at: Date;
}

interface AnalysisData {
  id: string;
  data_id: string;
  analysis: AnalysisResult;
  analyzed_at: Date;
}

export class FragranceTrendAgent {
  private fragranticaCollector: FragranticaCollector;
  private googleTrendsCollector: GoogleTrendsCollector;
  private twitterCollector: TwitterCollector;
  private aiAnalyzer: AIAnalyzer;
  private notionClient: NotionReportClient;
  private jobManager: JobManager;

  // In-memory storage (in production, use a database)
  private collectedDataStore: Map<string, CollectedData> = new Map();
  private analysisStore: Map<string, AnalysisData> = new Map();

  constructor() {
    this.fragranticaCollector = new FragranticaCollector();
    this.googleTrendsCollector = new GoogleTrendsCollector();
    this.twitterCollector = new TwitterCollector();
    this.aiAnalyzer = new AIAnalyzer();
    this.notionClient = new NotionReportClient();
    this.jobManager = new JobManager();
  }

  async collectData(
    sources: string[],
    keywords: string[] = ['perfume', 'fragrance', 'cologne']
  ): Promise<CollectedData> {
    logger.info(`Starting data collection for sources: ${sources.join(', ')}`);

    const dataId = uuidv4();
    const collectedData: CollectedData = {
      id: dataId,
      fragrances: [],
      trends: [],
      socialMentions: [],
      collected_at: new Date(),
    };

    const promises: Promise<void>[] = [];

    if (sources.includes('fragrantica')) {
      promises.push(
        this.fragranticaCollector.collect(keywords).then(data => {
          collectedData.fragrances = data;
        })
      );
    }

    if (sources.includes('google_trends')) {
      promises.push(
        this.googleTrendsCollector.collect(keywords).then(data => {
          collectedData.trends = data;
        })
      );
    }

    if (sources.includes('twitter')) {
      promises.push(
        this.twitterCollector.collect(keywords).then(data => {
          collectedData.socialMentions = data;
        })
      );
    }

    await Promise.all(promises);

    this.collectedDataStore.set(dataId, collectedData);
    logger.info(`Data collection completed. ID: ${dataId}`);

    return collectedData;
  }

  async analyzeTrends(dataId: string): Promise<AnalysisData> {
    logger.info(`Analyzing trends for data ID: ${dataId}`);

    const collectedData = this.collectedDataStore.get(dataId);
    if (!collectedData) {
      throw new Error(`Collected data not found: ${dataId}`);
    }

    const analysis = await this.aiAnalyzer.analyze(
      collectedData.fragrances,
      collectedData.trends,
      collectedData.socialMentions
    );

    const analysisId = uuidv4();
    const analysisData: AnalysisData = {
      id: analysisId,
      data_id: dataId,
      analysis,
      analyzed_at: new Date(),
    };

    this.analysisStore.set(analysisId, analysisData);
    logger.info(`Analysis completed. ID: ${analysisId}`);

    return analysisData;
  }

  async createNotionReport(
    analysisId: string,
    reportTitle: string
  ): Promise<{ url: string; id: string }> {
    logger.info(`Creating Notion report for analysis ID: ${analysisId}`);

    const analysisData = this.analysisStore.get(analysisId);
    if (!analysisData) {
      throw new Error(`Analysis data not found: ${analysisId}`);
    }

    const collectedData = this.collectedDataStore.get(analysisData.data_id);
    if (!collectedData) {
      throw new Error(`Collected data not found: ${analysisData.data_id}`);
    }

    const reportData = {
      title: reportTitle,
      analysis: analysisData.analysis,
      raw_data: {
        fragrances: collectedData.fragrances,
        trends: collectedData.trends,
        social_mentions: collectedData.socialMentions,
      },
    };

    // Check if report already exists
    const existingPageId = await this.notionClient.findExistingReport(reportTitle);

    if (existingPageId) {
      logger.info(`Updating existing report: ${existingPageId}`);
      return await this.notionClient.updateReport(existingPageId, reportData);
    } else {
      return await this.notionClient.createReport(reportData);
    }
  }

  async runFullPipeline(
    keywords: string[] = ['perfume', 'fragrance', 'cologne'],
    reportTitle: string = `Fragrance Trend Report - ${new Date().toLocaleDateString()}`
  ): Promise<string> {
    const jobId = uuidv4();
    this.jobManager.createJob(jobId, 'Initializing');

    // Run pipeline asynchronously
    this.executePipeline(jobId, keywords, reportTitle).catch(error => {
      logger.error('Pipeline execution failed:', error);
      this.jobManager.setJobError(jobId, error.message);
    });

    return jobId;
  }

  private async executePipeline(
    jobId: string,
    keywords: string[],
    reportTitle: string
  ): Promise<void> {
    try {
      // Step 1: Collect data
      this.jobManager.setJobStage(jobId, 'Collecting data from sources', 10);
      const collectedData = await this.collectData(
        ['fragrantica', 'google_trends', 'twitter'],
        keywords
      );

      // Step 2: Analyze trends
      this.jobManager.setJobStage(jobId, 'Analyzing trends with AI', 50);
      const analysisData = await this.analyzeTrends(collectedData.id);

      // Step 3: Create Notion report
      this.jobManager.setJobStage(jobId, 'Creating Notion report', 80);
      const report = await this.createNotionReport(analysisData.id, reportTitle);

      // Step 4: Complete
      this.jobManager.completeJob(jobId);
      logger.info(`Pipeline completed successfully. Report URL: ${report.url}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.jobManager.setJobError(jobId, errorMessage);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobManager.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }

  getJobManager(): JobManager {
    return this.jobManager;
  }
}
