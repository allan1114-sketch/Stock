import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  'zh-Hant': {
    'app.title': '金融市場研究報告',
    'app.subtitle': '美國科技巨頭與宏觀指數深度追蹤',
    'search.placeholder': '輸入股票代號或公司名稱 (例如: NVDA, Tesla)...',
    'search.batch': '多個代號搜尋: AAPL, MSFT, TSLA',
    'search.button': '搜尋',
    'search.searching': '搜尋中',
    'macro.title': '宏觀經濟與市場深度分析',
    'stock.title': '重點科技個股專業分析',
    'watchlist.title': '我的觀察名單',
    'portfolio.title': '資產配置模擬',
    'layout.edit': '編輯版面',
    'layout.done': '完成編輯',
    'btn.data': '數據',
    'btn.summary': '摘要',
    'btn.view': '觀點',
    'btn.chart': '圖表',
    'btn.info': '公司資訊',
    'label.price': '最新價位',
    'label.ma50': '50 天線 (MA50)',
    'label.volume': '交易量',
    'label.marketCap': '市值',
    'label.peRatio': '本益比 (P/E)',
    'label.dividend': '殖利率',
    'sort.name': '名稱',
    'sort.symbol': '代號',
    'sort.none': '排序',
  },
  'en': {
    'app.title': 'Financial Market Report',
    'app.subtitle': 'Deep Dive into US Tech Giants & Macro Indices',
    'search.placeholder': 'Enter stock symbol or name (e.g. NVDA, Tesla)...',
    'search.batch': 'Batch search: AAPL, MSFT, TSLA',
    'search.button': 'Search',
    'search.searching': 'Searching',
    'macro.title': 'Macroeconomic & Market Analysis',
    'stock.title': 'Key Tech Stock Analysis',
    'watchlist.title': 'My Watchlist',
    'portfolio.title': 'Portfolio Allocation Simulator',
    'layout.edit': 'Edit Layout',
    'layout.done': 'Done Editing',
    'btn.data': 'Data',
    'btn.summary': 'Summary',
    'btn.view': 'View',
    'btn.chart': 'Chart',
    'btn.info': 'Info',
    'label.price': 'Price',
    'label.ma50': 'MA50',
    'label.volume': 'Volume',
    'label.marketCap': 'Mkt Cap',
    'label.peRatio': 'P/E Ratio',
    'label.dividend': 'Div Yield',
    'sort.name': 'Name',
    'sort.symbol': 'Symbol',
    'sort.none': 'Sort By',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'zh-Hant';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
