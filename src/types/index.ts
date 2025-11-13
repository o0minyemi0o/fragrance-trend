/**
 * Core types for the Fragrance Trend MCP Agent
 */

export interface FragranceData {
  name: string;
  brand: string;
  notes: string[];
  popularity_score: number;
  release_date?: string;
  price_range?: string;
}

export interface TrendData {
  keyword: string;
  search_volume: number;
  trend_direction: 'up' | 'down' | 'stable';
  related_keywords: string[];
  timestamp: Date;
}

export interface TwitterMention {
  text: string;
  author: string;
  engagement: number;
  timestamp: Date;
  hashtags: string[];
}

export interface AnalysisResult {
  summary: string;
  key_trends: string[];
  top_fragrances: FragranceData[];
  trending_keywords: string[];
  insights: string[];
  sentiment_score: number;
  generated_at: Date;
}

export interface NotionReportData {
  title: string;
  analysis: AnalysisResult;
  raw_data: {
    fragrances: FragranceData[];
    trends: TrendData[];
    social_mentions: TwitterMention[];
  };
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stage: string;
  progress: number;
  error?: string;
  started_at: Date;
  completed_at?: Date;
}

export interface MCPMessage {
  type: 'request' | 'response' | 'notification';
  method: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}
