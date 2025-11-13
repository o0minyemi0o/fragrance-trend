import cron from 'node-cron';
import { FragranceTrendAgent } from '../agent/FragranceTrendAgent.js';
import { config } from '../config/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Scheduler');

export class ReportScheduler {
  private agent: FragranceTrendAgent;
  private task: cron.ScheduledTask | null = null;

  constructor(agent: FragranceTrendAgent) {
    this.agent = agent;
  }

  start(): void {
    const schedule = config.scheduler.cronSchedule;

    if (!cron.validate(schedule)) {
      logger.error(`Invalid cron schedule: ${schedule}`);
      return;
    }

    logger.info(`Starting scheduler with schedule: ${schedule}`);
    logger.info(`Timezone: ${config.scheduler.timezone}`);

    this.task = cron.schedule(
      schedule,
      async () => {
        await this.runScheduledReport();
      },
      {
        timezone: config.scheduler.timezone,
      }
    );

    logger.info('Scheduler started successfully');
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Scheduler stopped');
    }
  }

  async runScheduledReport(): Promise<void> {
    logger.info('Running scheduled fragrance trend report');

    try {
      const keywords = [
        'perfume',
        'fragrance',
        'cologne',
        'eau de parfum',
        'niche perfume',
      ];

      const reportTitle = `Weekly Fragrance Trend Report - ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;

      const jobId = await this.agent.runFullPipeline(keywords, reportTitle);
      logger.info(`Scheduled report started with job ID: ${jobId}`);

      // Monitor job status
      const checkInterval = setInterval(async () => {
        try {
          const status = await this.agent.getJobStatus(jobId);

          if (status.status === 'completed') {
            logger.info(`Scheduled report completed successfully`);
            clearInterval(checkInterval);
          } else if (status.status === 'failed') {
            logger.error(`Scheduled report failed: ${status.error}`);
            clearInterval(checkInterval);
          } else {
            logger.debug(`Job ${jobId} progress: ${status.progress}% - ${status.stage}`);
          }
        } catch (error) {
          logger.error('Error checking job status:', error);
          clearInterval(checkInterval);
        }
      }, 5000); // Check every 5 seconds

      // Set timeout to stop checking after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        logger.warn('Stopped monitoring job after timeout');
      }, 10 * 60 * 1000);

    } catch (error) {
      logger.error('Error running scheduled report:', error);
    }
  }

  async runNow(): Promise<string> {
    logger.info('Running immediate fragrance trend report');

    const keywords = [
      'perfume',
      'fragrance',
      'cologne',
      'eau de parfum',
      'niche perfume',
    ];

    const reportTitle = `Fragrance Trend Report - ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    return await this.agent.runFullPipeline(keywords, reportTitle);
  }

  getNextScheduledRun(): Date | null {
    // This is a simplified version - in production you'd use a proper cron parser
    logger.info('Next scheduled run can be calculated using a cron parser library');
    return null;
  }
}
