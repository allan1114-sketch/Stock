import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Settings, Check, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  isEditingLayout: boolean;
  onToggleEditLayout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isEditingLayout, onToggleEditLayout }) => {
  const { t, language, setLanguage } = useLanguage();
  const [currentDateTime, setCurrentDateTime] = useState<string>('...');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const locale = language === 'zh-Hant' ? 'zh-TW' : 'en-US';
      const formatter = new Intl.DateTimeFormat(locale, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
      setCurrentDateTime(formatter.format(now));
    };
    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);
    return () => clearInterval(intervalId);
  }, [language]);

  return (
    <header className="mb-8 border-b-4 border-sky-600 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div className="flex items-center text-sky-700">
        <BarChart3 className="w-10 h-10 mr-4" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {t('app.title')}
          </h1>
          <p className="text-sm sm:text-lg text-sky-600 mt-1">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
        <div className="text-xs sm:text-sm font-medium text-slate-600 flex items-center">
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          {currentDateTime}
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={onToggleEditLayout}
                className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isEditingLayout ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                {isEditingLayout ? <Check className="w-3 h-3 mr-1"/> : <LayoutGrid className="w-3 h-3 mr-1"/>}
                {isEditingLayout ? t('layout.done') : t('layout.edit')}
            </button>

            <div className="flex bg-slate-100 rounded-md p-1">
                <button 
                    onClick={() => setLanguage('zh-Hant')}
                    className={`px-3 py-1 text-xs rounded-sm transition-all ${language === 'zh-Hant' ? 'bg-white shadow text-sky-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    繁中
                </button>
                <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-xs rounded-sm transition-all ${language === 'en' ? 'bg-white shadow text-sky-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    EN
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
