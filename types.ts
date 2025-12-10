
export interface Source {
  uri: string;
  title: string;
}

export interface GeminiResponse {
  text: string;
  sources: Source[];
}

export interface SentimentData {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // 0 to 100
}

export interface SummaryResponse {
  data: SentimentData;
  sources: Source[];
}

export interface PredictionData {
  predictedPrice: number;
  confidenceScore: number; // 0 to 100
  timeframe: string;
  reasoning: string;
}

export interface PredictionResponse {
  data: PredictionData;
  sources: Source[];
}

export interface ChartDataPoint {
  time: string;
  price: number; // Used for Area chart (usually close)
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface ChartAnnotation {
  id: string;
  type: 'line'; // Horizontal line (Support/Resistance)
  yAxisValue: number;
  label?: string;
  color?: string;
}

export interface ChartResponse {
  data: ChartDataPoint[];
  sources: Source[];
}

export enum LoadingStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface StockInfo {
  name: string;
  symbol: string;
  description: string;
  queryName: string;
}

export interface IndexInfo {
  name: string;
  description: string;
  queryName: string;
}

export type AlertType = 'above' | 'below' | 'change_pct' | 'ma200_cross';

export interface PriceAlert {
  type: AlertType;
  targetValue: number; // Price, Percentage, or 0 (for boolean crosses)
  active: boolean;
  message?: string;
}

export interface NotificationMsg {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'alert' | 'info';
}

export interface ExtendedQuote {
  price: number;
  changePercent: number;
  ma200: number;
}

export interface TechIndicators {
  rsi: number | string;
  macd: string;
}

export interface AnalystRating {
  consensus: 'Buy' | 'Overweight' | 'Hold' | 'Underweight' | 'Sell';
  buyCount: number;
  holdCount: number;
  sellCount: number;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  date: string;
}

export interface NewsResponse {
  news: NewsItem[];
}

export interface CompanyMetrics {
  marketCap: string;
  peRatio: string;
  dividendYield: string;
}

export type Language = 'zh-Hant' | 'en';

export interface AssetAllocation {
  id: string;
  name: string;
  value: number; // Percentage
  color: string;
}
