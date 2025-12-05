export interface Source {
  uri: string;
  title: string;
}

export interface GeminiResponse {
  text: string;
  sources: Source[];
}

export interface ChartDataPoint {
  time: string;
  price: number;
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

export interface PriceAlert {
  targetPrice: number;
  active: boolean;
  type: 'above' | 'below'; // Notify when price goes above or below target
}

export interface NotificationMsg {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'alert' | 'info';
}