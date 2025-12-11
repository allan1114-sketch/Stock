import React from 'react';
import { X, Moon, Sun, Globe, Bell, RotateCcw, Palette, BellRing, Monitor, ChevronRight } from 'lucide-react';
import { useSettings } from '../contexts/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, toggleTheme, setLanguage, resetOnboarding, t } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform transition-all animate-fade-in-down">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{t('settings.title')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {/* Section: Appearance & Language */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <Palette className="w-3 h-3" />
                Appearance
             </div>
             
             <div className="space-y-4">
                {/* Theme */}
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      {settings.theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">{t('settings.theme')}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Separator */}
                <div className="border-b border-slate-100 dark:border-slate-800/50"></div>

                {/* Language */}
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-sky-50 dark:bg-sky-900/20 rounded-xl text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                      <Globe className="w-5 h-5" />
                    </div>
                     <div>
                        <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">{t('settings.lang')}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{settings.language === 'zh-Hant' ? 'Traditional Chinese' : 'English'}</div>
                    </div>
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <button 
                          onClick={() => setLanguage('zh-Hant')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${settings.language === 'zh-Hant' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          繁中
                      </button>
                      <button 
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${settings.language === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          EN
                      </button>
                  </div>
                </div>
             </div>
          </div>

          {/* Section: Alerts */}
          <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <BellRing className="w-3 h-3" />
                Notifications
             </div>

              <div className="space-y-4">
                  {/* Notifications */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                        <Bell className="w-5 h-5" />
                      </div>
                       <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">{t('settings.notif')}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Enable app-wide alerts</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
              </div>
          </div>

           {/* Section: System */}
          <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <Monitor className="w-3 h-3" />
                System
             </div>
             
             <div className="space-y-4">
                {/* Reset Onboarding */}
                <div>
                  <button 
                    onClick={() => { resetOnboarding(); onClose(); }}
                    className="w-full flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">{t('settings.onboard')}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Re-run the welcome tour</div>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                  </button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;