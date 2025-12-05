import React from 'react';
import { DollarSign } from 'lucide-react';
import StockCard from './StockCard';
import { StockInfo } from '../types';

const STOCKS: StockInfo[] = [
  { 
    name: 'Apple (AAPL) 蘋果', 
    symbol: 'AAPL', 
    description: '硬體與服務巨頭', 
    queryName: 'Apple AAPL' 
  },
  { 
    name: 'Microsoft (MSFT) 微軟', 
    symbol: 'MSFT', 
    description: '雲端運算與軟體服務', 
    queryName: 'Microsoft MSFT' 
  },
  { 
    name: 'Alphabet (GOOGL) 谷歌', 
    symbol: 'GOOGL', 
    description: '搜尋、廣告與 AI 領航者', 
    queryName: 'Alphabet GOOGL' 
  },
  { 
    name: 'Amazon (AMZN) 亞馬遜', 
    symbol: 'AMZN', 
    description: '電子商務與 AWS 雲服務', 
    queryName: 'Amazon AMZN' 
  },
  { 
    name: 'Meta Platforms (META) 臉書', 
    symbol: 'META', 
    description: '社交媒體與元宇宙', 
    queryName: 'Meta Platforms META' 
  },
];

interface StockSectionProps {
  onNotify: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  watchlist: StockInfo[];
  onToggleWatch: (stock: StockInfo) => void;
}

const StockSection: React.FC<StockSectionProps> = ({ onNotify, watchlist, onToggleWatch }) => {
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center pb-2 border-b-2 border-slate-300">
        <DollarSign className="w-6 h-6 mr-2 text-sky-600" />
        重點科技個股專業分析
      </h2>
      <div className="space-y-12">
        {STOCKS.map(stock => (
          <StockCard 
            key={stock.symbol} 
            stock={stock} 
            onNotify={onNotify} 
            isWatched={watchlist.some(s => s.symbol === stock.symbol)}
            onToggleWatch={onToggleWatch}
          />
        ))}
      </div>
    </section>
  );
};

export default StockSection;