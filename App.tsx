import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MacroSection from './components/MacroSection';
import StockSection from './components/StockSection';
import SearchBar from './components/SearchBar';
import StockCard from './components/StockCard';
import NotificationToast from './components/NotificationToast';
import { StockInfo, NotificationMsg } from './types';
import { GeminiService } from './services/geminiService';
import { SearchX, Star, Info, ListPlus } from 'lucide-react';

const App: React.FC = () => {
  const [searchResult, setSearchResult] = useState<StockInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  
  // Watchlist state initialized from localStorage
  const [watchlist, setWatchlist] = useState<StockInfo[]>(() => {
    try {
        const saved = localStorage.getItem('financial_dashboard_watchlist');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist watchlist changes
  useEffect(() => {
    localStorage.setItem('financial_dashboard_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addNotification = (title: string, message: string, type: 'success' | 'alert' | 'info' = 'info') => {
    const newNote: NotificationMsg = {
      id: Date.now(),
      title,
      message,
      type
    };
    setNotifications(prev => [...prev, newNote]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleWatchlist = (stock: StockInfo) => {
    const isWatched = watchlist.some(s => s.symbol === stock.symbol);
    
    if (isWatched) {
        addNotification('已移除', `${stock.name} 已從觀察名單移除`, 'info');
        setWatchlist(prev => prev.filter(s => s.symbol !== stock.symbol));
    } else {
        addNotification('已加入', `${stock.name} 已加入觀察名單`, 'success');
        setWatchlist(prev => [...prev, stock]);
    }
  };

  const isWatched = (symbol: string) => watchlist.some(s => s.symbol === symbol);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    // Batch Process Check
    if (query.includes(',')) {
        const symbols = query.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (symbols.length === 0) {
            setIsSearching(false);
            return;
        }

        addNotification('批量處理中', `正在解析 ${symbols.length} 個標的...`, 'info');
        
        let successCount = 0;
        const newStocks: StockInfo[] = [];

        // Execute in parallel (limited by API rate limits conceptually, but fine for demo)
        await Promise.all(symbols.map(async (sym) => {
             try {
                 const res = await GeminiService.resolveStockQuery(sym);
                 if (res) {
                     // Check if already in watchlist to avoid duplicates
                     if (!watchlist.some(w => w.symbol === res.symbol)) {
                         newStocks.push(res);
                     }
                     successCount++;
                 }
             } catch (e) { console.error(e); }
        }));

        if (newStocks.length > 0) {
            setWatchlist(prev => [...prev, ...newStocks]);
            addNotification('批量加入成功', `已將 ${newStocks.length} 個新標的加入觀察名單`, 'success');
        } else if (successCount > 0) {
            addNotification('重複項目', '所有搜尋到的標的已在觀察名單中', 'info');
        } else {
            setSearchError('無法識別輸入的任何代號');
        }

        setIsSearching(false);
        return;
    }

    // Single Search
    try {
      const result = await GeminiService.resolveStockQuery(query);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('找不到該公司或股票，請嘗試更精確的關鍵字 (例如: 代號)。');
      }
    } catch (error) {
      setSearchError('搜尋發生錯誤，請稍後再試。');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen relative">
      <NotificationToast notifications={notifications} onClose={removeNotification} />

      <div className="max-w-7xl mx-auto bg-white border border-slate-200 p-6 sm:p-10 rounded-xl shadow-2xl">
        <Header />
        
        {/* Search Section */}
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        
        {/* Search Results Area */}
        {searchError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-center animate-fade-in">
                <SearchX className="w-5 h-5 mr-2" />
                {searchError}
            </div>
        )}

        {searchResult && (
            <div className="mb-12 animate-fade-in">
                <div className="flex justify-between items-end mb-6 border-b-2 border-sky-300 pb-2">
                    <h2 className="text-2xl font-bold text-sky-800 flex items-center">
                        搜尋結果
                    </h2>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center hidden sm:flex">
                        <Info className="w-3 h-3 mr-1 text-sky-500" />
                        點擊卡片右上角星號可加入/移除觀察名單
                    </span>
                </div>
                <StockCard 
                  key={searchResult.symbol} 
                  stock={searchResult} 
                  onNotify={addNotification}
                  isWatched={isWatched(searchResult.symbol)}
                  onToggleWatch={toggleWatchlist} 
                />
            </div>
        )}

        {/* Watchlist Section */}
        {watchlist.length > 0 && (
            <section className="mb-12 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center pb-2 border-b-2 border-yellow-400">
                    <Star className="w-6 h-6 mr-2 text-yellow-500 fill-yellow-500" />
                    我的觀察名單
                    <span className="ml-2 text-sm font-normal text-slate-400">({watchlist.length})</span>
                </h2>
                <div className="space-y-12">
                    {watchlist.map(stock => (
                        <StockCard 
                            key={stock.symbol} 
                            stock={stock} 
                            onNotify={addNotification} 
                            isWatched={true}
                            onToggleWatch={toggleWatchlist}
                        />
                    ))}
                </div>
            </section>
        )}

        <main className="space-y-12">
          <MacroSection />
          <StockSection 
            onNotify={addNotification} 
            watchlist={watchlist}
            onToggleWatch={toggleWatchlist}
          />
        </main>
        
        <footer className="mt-12 pt-6 border-t-2 border-slate-200 bg-slate-50 text-center text-sm text-slate-400 rounded-b-lg pb-4">
          <p>數據報告生成於本應用程式，資料由 Google Search API 實時檢索並由 Gemini AI 處理，僅供參考，不構成投資建議。</p>
        </footer>
      </div>
    </div>
  );
};

export default App;