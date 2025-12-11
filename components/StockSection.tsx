import React, { useState, useMemo } from 'react';
import { DollarSign, ArrowUpDown } from 'lucide-react';
import StockCard from './StockCard';
import { StockInfo } from '../types';
import { useSettings } from '../contexts/LanguageContext';

const STOCKS: StockInfo[] = [
  { name: 'Apple (AAPL)', symbol: 'AAPL', description: 'Consumer Electronics', queryName: 'Apple AAPL' },
  { name: 'Microsoft (MSFT)', symbol: 'MSFT', description: 'Software Infrastructure', queryName: 'Microsoft MSFT' },
  { name: 'Alphabet (GOOGL)', symbol: 'GOOGL', description: 'Internet Content & Info', queryName: 'Alphabet GOOGL' },
  { name: 'Amazon (AMZN)', symbol: 'AMZN', description: 'Internet Retail', queryName: 'Amazon AMZN' },
  { name: 'Meta (META)', symbol: 'META', description: 'Internet Content', queryName: 'Meta Platforms META' },
  { name: 'NVIDIA (NVDA)', symbol: 'NVDA', description: 'Semiconductors', queryName: 'NVIDIA NVDA' },
];

interface StockSectionProps {
  onNotify: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  watchlist: StockInfo[];
  onToggleWatch: (stock: StockInfo) => void;
}

const StockSection: React.FC<StockSectionProps> = ({ onNotify, watchlist, onToggleWatch }) => {
  const { t } = useSettings();
  const [sortBy, setSortBy] = useState<'none' | 'name' | 'symbol'>('none');

  const sortedStocks = useMemo(() => {
    let list = [...STOCKS];
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'symbol') {
      list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    return list;
  }, [sortBy]);

  return (
    <section>
      <div className="flex justify-between items-center mb-6 pb-2 border-b-2 border-slate-300 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-sky-600 dark:text-sky-400" />
            {t('stock.title')}
          </h2>
          <div className="flex items-center gap-2">
             <ArrowUpDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
             <select 
               className="text-sm border-none bg-transparent font-medium text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer dark:bg-slate-900"
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
             >
                 <option value="none">{t('sort.none')}</option>
                 <option value="name">{t('sort.name')}</option>
                 <option value="symbol">{t('sort.symbol')}</option>
             </select>
          </div>
      </div>
      <div className="space-y-8">
        {sortedStocks.map(stock => (
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