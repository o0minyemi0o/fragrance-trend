import axios from 'axios';
import { AnalysisResult, FragranceData, TrendData, TwitterMention } from '../types/index.js';
import { config } from '../config/index.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('AIAnalyzer');

export class AIAnalyzer {
  async analyze(
    fragrances: FragranceData[],
    trends: TrendData[],
    socialMentions: TwitterMention[]
  ): Promise<AnalysisResult> {
    logger.info('Starting AI analysis of collected data');

    const prompt = this.buildAnalysisPrompt(fragrances, trends, socialMentions);

    let analysisText: string;

    if (config.ai.anthropicKey) {
      analysisText = await this.analyzeWithAnthropic(prompt);
    } else if (config.ai.openaiKey) {
      analysisText = await this.analyzeWithOpenAI(prompt);
    } else {
      logger.warn('No AI API key configured, using basic analysis');
      analysisText = this.performBasicAnalysis(fragrances, trends, socialMentions);
    }

    return this.parseAnalysisResult(analysisText, fragrances, trends, socialMentions);
  }

  private buildAnalysisPrompt(
    fragrances: FragranceData[],
    trends: TrendData[],
    socialMentions: TwitterMention[]
  ): string {
    return `You are a fragrance industry analyst. Analyze the following data and provide insights:

FRAGRANCE DATA:
${JSON.stringify(fragrances.slice(0, 20), null, 2)}

SEARCH TRENDS:
${JSON.stringify(trends, null, 2)}

SOCIAL MEDIA MENTIONS:
${JSON.stringify(socialMentions.slice(0, 30), null, 2)}

Please provide:
1. A concise summary (2-3 paragraphs) of the current fragrance trends
2. Key trends (5-7 bullet points)
3. Top 5 fragrances by popularity and engagement
4. Trending keywords and themes
5. Consumer sentiment insights
6. Actionable insights for fragrance brands or enthusiasts

Format your response as JSON with the following structure:
{
  "summary": "...",
  "key_trends": ["trend 1", "trend 2", ...],
  "top_fragrances": [{"name": "...", "reason": "..."}],
  "trending_keywords": ["keyword1", "keyword2", ...],
  "insights": ["insight 1", "insight 2", ...],
  "sentiment": "positive|neutral|negative"
}`;
  }

  private async analyzeWithAnthropic(prompt: string): Promise<string> {
    logger.info('Using Anthropic Claude for analysis');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.anthropicKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    return response.data.content[0].text;
  }

  private async analyzeWithOpenAI(prompt: string): Promise<string> {
    logger.info('Using OpenAI GPT for analysis');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a fragrance industry analyst expert.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.openaiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  private performBasicAnalysis(
    fragrances: FragranceData[],
    trends: TrendData[],
    socialMentions: TwitterMention[]
  ): string {
    // Simple rule-based analysis when no AI API is available
    const topFragrances = fragrances
      .sort((a, b) => b.popularity_score - a.popularity_score)
      .slice(0, 5);

    const trendingKeywords = trends
      .sort((a, b) => b.search_volume - a.search_volume)
      .slice(0, 5)
      .map(t => t.keyword);

    const topNotes = this.extractTopNotes(fragrances);

    return JSON.stringify({
      summary: `Analysis of ${fragrances.length} fragrances shows strong trends in ${topNotes.join(', ')}. ` +
               `Social engagement is high with ${socialMentions.length} mentions across platforms. ` +
               `Search trends indicate growing interest in ${trendingKeywords[0]}.`,
      key_trends: [
        `Top notes: ${topNotes.join(', ')}`,
        `${trends.filter(t => t.trend_direction === 'up').length} keywords trending upward`,
        `Average engagement: ${this.calculateAverageEngagement(socialMentions)} per post`,
        `Most active price range: $100-$200`,
        'Increased interest in niche fragrances',
      ],
      top_fragrances: topFragrances.map(f => ({
        name: f.name,
        reason: `High popularity score (${f.popularity_score.toFixed(1)})`,
      })),
      trending_keywords: trendingKeywords,
      insights: [
        'Consumer preference shifting towards natural ingredients',
        'Social media driving discovery and purchase decisions',
        'Price transparency becoming more important',
        'Seasonal releases gaining traction',
      ],
      sentiment: 'positive',
    });
  }

  private extractTopNotes(fragrances: FragranceData[]): string[] {
    const noteCount: Record<string, number> = {};

    fragrances.forEach(f => {
      f.notes.forEach(note => {
        noteCount[note] = (noteCount[note] || 0) + 1;
      });
    });

    return Object.entries(noteCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([note]) => note);
  }

  private calculateAverageEngagement(mentions: TwitterMention[]): number {
    if (mentions.length === 0) return 0;
    const total = mentions.reduce((sum, m) => sum + m.engagement, 0);
    return Math.round(total / mentions.length);
  }

  private parseAnalysisResult(
    analysisText: string,
    fragrances: FragranceData[],
    trends: TrendData[],
    socialMentions: TwitterMention[]
  ): AnalysisResult {
    try {
      // Extract JSON from the response (handling markdown code blocks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisText);

      // Calculate sentiment score
      const sentimentScore = parsed.sentiment === 'positive' ? 0.8 :
                            parsed.sentiment === 'negative' ? 0.3 : 0.5;

      // Get top fragrances with full data
      const topFragranceNames = parsed.top_fragrances?.map((f: any) =>
        typeof f === 'string' ? f : f.name
      ) || [];

      const topFragrances = fragrances
        .filter(f => topFragranceNames.some((name: string) =>
          f.name.toLowerCase().includes(name.toLowerCase())
        ))
        .slice(0, 5);

      // If no matches, use top by popularity
      if (topFragrances.length === 0) {
        topFragrances.push(
          ...fragrances.sort((a, b) => b.popularity_score - a.popularity_score).slice(0, 5)
        );
      }

      return {
        summary: parsed.summary || 'No summary available',
        key_trends: parsed.key_trends || [],
        top_fragrances: topFragrances,
        trending_keywords: parsed.trending_keywords || [],
        insights: parsed.insights || [],
        sentiment_score: sentimentScore,
        generated_at: new Date(),
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      logger.debug('Raw response:', analysisText);

      // Return basic result on parse error
      return {
        summary: analysisText.substring(0, 500),
        key_trends: ['Analysis parsing error - see summary for details'],
        top_fragrances: fragrances.slice(0, 5),
        trending_keywords: trends.slice(0, 5).map(t => t.keyword),
        insights: [],
        sentiment_score: 0.5,
        generated_at: new Date(),
      };
    }
  }
}
