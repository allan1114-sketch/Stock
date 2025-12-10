import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MacroSection from './components/MacroSection';
import StockSection from './components/StockSection';
import SearchBar from './components/SearchBar';
import StockCard from './components/StockCard';
import PortfolioSimulator from './components/PortfolioSimulator';
import FadeInSection from './components/FadeInSection';
import NotificationToast from './components/NotificationToast';
import { StockInfo, NotificationMsg } from './types';
import { GeminiService } from './services/geminiService';
import { SearchX, Star, Info, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Inner component to use the context
const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [searchResult, setSearchResult] = useState<StockInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  
  // Layout Management
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(['macro', 'watchlist', 'portfolio', 'stock']);
  
  const [watchlist, setWatchlist] = useState<StockInfo[]>(() => {
    try {
        const saved = localStorage.getItem('financial_dashboard_watchlist');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('financial_dashboard_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addNotification = (title: string, message: string, type: 'success' | 'alert' | 'info' = 'info') => {
    setNotifications(prev => [...prev, { id: Date.now(), title, message, type }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleWatchlist = (stock: StockInfo) => {
    const isWatched = watchlist.some(s => s.symbol === stock.symbol);
    if (isWatched) {
        setWatchlist(prev => prev.filter(s => s.symbol !== stock.symbol));
        addNotification('Removed', `${stock.name} removed from watchlist`, 'info');
    } else {
        setWatchlist(prev => [...prev, stock]);
        addNotification('Added', `${stock.name} added to watchlist`, 'success');
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    // Batch Process Check
    if (query.includes(',')) {
        const symbols = query.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (symbols.length === 0) { setIsSearching(false); return; }
        
        let newStocks: StockInfo[] = [];
        await Promise.all(symbols.map(async (sym) => {
             try {
                 const res = await GeminiService.resolveStockQuery(sym);
                 if (res && !watchlist.some(w => w.symbol === res.symbol)) newStocks.push(res);
             } catch (e) { console.error(e); }
        }));

        if (newStocks.length > 0) {
            setWatchlist(prev => [...prev, ...newStocks]);
            addNotification('Success', `Added ${newStocks.length} stocks`, 'success');
        } else {
            setSearchError('No valid stocks found or all duplicates.');
        }
        setIsSearching(false);
        return;
    }

    try {
      const result = await GeminiService.resolveStockQuery(query);
      if (result) {
        setSearchResult(result);
      } else {
        setSearchError('Stock not found.');
      }
    } catch {
      setSearchError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  // Watchlist Drag and Drop
  const [draggedStockIndex, setDraggedStockIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
      setDraggedStockIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedStockIndex === null || draggedStockIndex === index) return;
      const newList = [...watchlist];
      const [draggedItem] = newList.splice(draggedStockIndex, 1);
      newList.splice(index, 0, draggedItem);
      setWatchlist(newList);
      setDraggedStockIndex(null);
  };

  // Section Reordering (Simple Swap)
  const moveSection = (index: number, direction: 'up' | 'down') => {
      const newOrder = [...sectionOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      setSectionOrder(newOrder);
  };

  const renderSection = (id: string, index: number) => {
      const moveControls = isEditingLayout ? (
          <div className="flex justify-end mb-2 gap-1 animate-pulse">
              <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
              <button onClick={() => moveSection(index, 'down')} disabled={index === sectionOrder.length - 1} className="p-1 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
          </div>
      ) : null;

      switch(id) {
          case 'macro':
              return (
                  <FadeInSection key="macro" delay={100} className="mb-12">
                      {moveControls}
                      <MacroSection />
                  </FadeInSection>
              );
          case 'watchlist':
              if (watchlist.length === 0) return null;
              return (
                <FadeInSection key="watchlist" delay={200} className="mb-12">
                    {moveControls}
                    <section>
                        <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center pb-2 border-b-2 border-yellow-400">
                            <Star className="w-6 h-6 mr-2 text-yellow-500 fill-yellow-500" />
                            {t('watchlist.title')}
                        </h2>
                        <div className="space-y-8">
                            {watchlist.map((stock, i) => (
                                <StockCard 
                                    key={stock.symbol} 
                                    stock={stock} 
                                    onNotify={addNotification} 
                                    isWatched={true}
                                    onToggleWatch={toggleWatchlist}
                                    isDraggable={isEditingLayout}
                                    onDragStart={(e) => onDragStart(e, i)}
                                    onDragOver={(e) => onDragOver(e, i)}
                                    onDrop={(e) => onDrop(e, i)}
                                />
                            ))}
                        </div>
                    </section>
                </FadeInSection>
              );
          case 'portfolio':
              return (
                  <FadeInSection key="portfolio" delay={300} className="mb-12">
                      {moveControls}
                      <PortfolioSimulator />
                  </FadeInSection>
              );
          case 'stock':
              return (
                  <FadeInSection key="stock" delay={400} className="mb-12">
                      {moveControls}
                      <StockSection onNotify={addNotification} watchlist={watchlist} onToggleWatch={toggleWatchlist} />
                  </FadeInSection>
              );
          default: return null;
      }
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen relative bg-slate-50">
      <NotificationToast notifications={notifications} onClose={removeNotification} />

      <div className="max-w-7xl mx-auto bg-white border border-slate-200 p-6 sm:p-10 rounded-xl shadow-2xl">
        <Header isEditingLayout={isEditingLayout} onToggleEditLayout={() => setIsEditingLayout(!isEditingLayout)} />
        
        <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        
        {searchError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-center">
                <SearchX className="w-5 h-5 mr-2" />
                {searchError}
            </div>
        )}

        {searchResult && (
            <div className="mb-12">
                <div className="flex justify-between items-end mb-6 border-b-2 border-sky-300 pb-2">
                    <h2 className="text-2xl font-bold text-sky-800">Search Result</h2>
                </div>
                <StockCard 
                  key={searchResult.symbol} 
                  stock={searchResult} 
                  onNotify={addNotification}
                  isWatched={watchlist.some(s => s.symbol === searchResult.symbol)}
                  onToggleWatch={toggleWatchlist} 
                />
            </div>
        )}

        <main className="space-y-1">
            {sectionOrder.map((id, index) => renderSection(id, index))}
        </main>
        
        <footer className="mt-12 pt-6 border-t-2 border-slate-200 bg-slate-50 text-center text-sm text-slate-400 rounded-b-lg pb-4">
          <p>Data powered by Google Search API & Gemini AI. For reference only.</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;
