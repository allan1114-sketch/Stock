import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Check, LayoutGrid, Settings } from 'lucide-react';
import { useSettings } from '../contexts/LanguageContext';
import SettingsModal from './SettingsModal';

interface HeaderProps {
  isEditingLayout: boolean;
  onToggleEditLayout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isEditingLayout, onToggleEditLayout }) => {
  const { t, settings } = useSettings();
  const [currentDateTime, setCurrentDateTime] = useState<string>('...');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const locale = settings.language === 'zh-Hant' ? 'zh-TW' : 'en-US';
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
  }, [settings.language]);

  return (
    <>
    <header className="mb-8 border-b-4 border-sky-600 dark:border-sky-500 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
      <div className="flex items-center text-sky-700 dark:text-sky-400">
        <BarChart3 className="w-10 h-10 mr-4" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('app.title')}
          </h1>
          <p className="text-sm sm:text-lg text-sky-600 dark:text-sky-400 mt-1">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
        <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          {currentDateTime}
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={onToggleEditLayout}
                className={`flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isEditingLayout ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
                {isEditingLayout ? <Check className="w-3 h-3 mr-1"/> : <LayoutGrid className="w-3 h-3 mr-1"/>}
                {isEditingLayout ? t('layout.done') : t('layout.edit')}
            </button>

            <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                title={t('settings.title')}
            >
                <Settings className="w-4 h-4" />
            </button>
        </div>
      </div>
    </header>
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default Header;