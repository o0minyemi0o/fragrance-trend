#!/usr/bin/env node

import { FragranceTrendMCPServer } from './mcp/server.js';
import { ReportScheduler } from './scheduler/index.js';
import { FragranceTrendAgent } from './agent/FragranceTrendAgent.js';
import { config, validateConfig } from './config/index.js';
import { Logger } from './utils/logger.js';

const logger = new Logger('Main');

async function main() {
  logger.info('Starting Fragrance Trend MCP Agent');

  // Validate configuration
  if (!validateConfig()) {
    logger.error('Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }

  // Determine mode from command line arguments
  const mode = process.argv[2] || 'mcp';

  switch (mode) {
    case 'mcp':
      await startMCPServer();
      break;

    case 'scheduler':
      await startScheduler();
      break;

    case 'once':
      await runOnce();
      break;

    default:
      logger.error(`Unknown mode: ${mode}`);
      logger.info('Available modes: mcp, scheduler, once');
      process.exit(1);
  }
}

async function startMCPServer() {
  logger.info('Starting MCP Server mode');

  const server = new FragranceTrendMCPServer();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });

  await server.start();
}

async function startScheduler() {
  logger.info('Starting Scheduler mode');

  const agent = new FragranceTrendAgent();
  const scheduler = new ReportScheduler(agent);

  // Start the scheduler
  scheduler.start();

  // Run cleanup task every hour
  setInterval(() => {
    agent.getJobManager().cleanupOldJobs();
  }, 60 * 60 * 1000);

  logger.info('Scheduler is running. Press Ctrl+C to stop.');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    scheduler.stop();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

async function runOnce() {
  logger.info('Running one-time report generation');

  const agent = new FragranceTrendAgent();
  const scheduler = new ReportScheduler(agent);

  const jobId = await scheduler.runNow();
  logger.info(`Report generation started with job ID: ${jobId}`);

  // Monitor progress
  const checkInterval = setInterval(async () => {
    try {
      const status = await agent.getJobStatus(jobId);
      logger.info(`Progress: ${status.progress}% - ${status.stage}`);

      if (status.status === 'completed') {
        logger.info('Report generation completed successfully!');
        clearInterval(checkInterval);
        process.exit(0);
      } else if (status.status === 'failed') {
        logger.error(`Report generation failed: ${status.error}`);
        clearInterval(checkInterval);
        process.exit(1);
      }
    } catch (error) {
      logger.error('Error checking job status:', error);
      clearInterval(checkInterval);
      process.exit(1);
    }
  }, 2000);
}

// Start the application
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
