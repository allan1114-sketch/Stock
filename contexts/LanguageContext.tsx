import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Theme, AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  t: (key: string) => string;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  resetOnboarding: () => void;
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
    'settings.title': '設定',
    'settings.theme': '主題模式',
    'settings.lang': '語言',
    'settings.notif': '通知',
    'settings.onboard': '重置教學導覽',
    'tour.skip': '跳過',
    'tour.next': '下一步',
    'tour.finish': '完成',
    'tour.welcome.title': '歡迎使用',
    'tour.welcome.desc': '讓我們快速瀏覽一下如何使用這個 AI 金融儀表板。',
    'tour.search.title': 'AI 智能搜尋',
    'tour.search.desc': '輸入股票代號或公司名稱。支援批量搜尋 (例如: AAPL, MSFT)。',
    'tour.macro.title': '市場宏觀分析',
    'tour.macro.desc': '獲取 AI 生成的華爾街等級市場策略報告與主要指數數據。',
    'tour.watchlist.title': '智能監控',
    'tour.watchlist.desc': '追蹤您感興趣的資產，並設定價格預警。',
    'tour.portfolio.title': '資產模擬',
    'tour.portfolio.desc': '可視化您的投資組合配置。',
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
    'settings.title': 'Settings',
    'settings.theme': 'Theme Mode',
    'settings.lang': 'Language',
    'settings.notif': 'Notifications',
    'settings.onboard': 'Reset Onboarding Tour',
    'tour.skip': 'Skip',
    'tour.next': 'Next',
    'tour.finish': 'Finish',
    'tour.welcome.title': 'Welcome',
    'tour.welcome.desc': 'Let\'s take a quick tour of your new AI Financial Dashboard.',
    'tour.search.title': 'Smart AI Search',
    'tour.search.desc': 'Enter symbols or names. Supports batch search (e.g., AAPL, MSFT).',
    'tour.macro.title': 'Macro Analysis',
    'tour.macro.desc': 'Get AI-generated Wall Street-grade strategy reports and index data.',
    'tour.watchlist.title': 'Smart Watchlist',
    'tour.watchlist.desc': 'Track assets and set price alerts.',
    'tour.portfolio.title': 'Portfolio Sim',
    'tour.portfolio.desc': 'Visualize your asset allocation.',
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : {
      language: 'zh-Hant',
      theme: 'light',
      notificationsEnabled: true,
      hasSeenOnboarding: false
    };
  });

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    
    // Apply Theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const setLanguage = (lang: Language) => {
    updateSettings({ language: lang });
  };

  const resetOnboarding = () => {
    updateSettings({ hasSeenOnboarding: false });
  };

  const t = (key: string) => {
    return translations[settings.language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, t, toggleTheme, setLanguage, resetOnboarding }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a LanguageProvider/SettingsProvider');
  return context;
};

// Backward compatibility hook
export const useLanguage = () => {
  const { settings, setLanguage, t } = useSettings();
  return { language: settings.language, setLanguage, t };
};