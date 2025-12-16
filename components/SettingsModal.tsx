import React from 'react';
import { X, Moon, Sun, Globe, Bell, RotateCcw, Palette, BellRing, Monitor, ChevronRight, Check } from 'lucide-react';
import { useSettings } from '../contexts/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsSection = ({ icon: Icon, title, children }: { icon: any, title: string, children?: React.ReactNode }) => (
  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4 last:mb-0">
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/80">
      <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</span>
    </div>
    <div className="p-4 space-y-4">
      {children}
    </div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, toggleTheme, setLanguage, resetOnboarding, t } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform transition-all animate-fade-in-down max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
             {t('settings.title')}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Section: Appearance */}
          <SettingsSection icon={Palette} title="Appearance">
                {/* Theme */}
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${settings.theme === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-slate-700 text-slate-300'}`}>
                      {settings.theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{t('settings.theme')}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${settings.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/50"></div>

                {/* Language */}
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400">
                      <Globe className="w-5 h-5" />
                    </div>
                     <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{t('settings.lang')}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{settings.language === 'zh-Hant' ? '繁體中文' : 'English'}</div>
                    </div>
                  </div>
                  <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                      <button 
                          onClick={() => setLanguage('zh-Hant')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium flex items-center gap-1 ${settings.language === 'zh-Hant' ? 'bg-white dark:bg-slate-600 shadow-sm text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          繁中
                      </button>
                      <button 
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium flex items-center gap-1 ${settings.language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                      >
                          EN
                      </button>
                  </div>
                </div>
          </SettingsSection>

          {/* Section: Notifications */}
          <SettingsSection icon={BellRing} title="Notifications">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${settings.notificationsEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                       <div>
                          <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{t('settings.notif')}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{settings.notificationsEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
          </SettingsSection>

           {/* Section: System */}
          <SettingsSection icon={Monitor} title="System">
                <button 
                  onClick={() => { resetOnboarding(); onClose(); }}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-sky-300 dark:hover:border-sky-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 group-hover:bg-sky-50 dark:group-hover:bg-sky-900/20 rounded-lg text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          <RotateCcw className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{t('settings.onboard')}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Restart the welcome tour</div>
                      </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 transition-colors" />
                </button>
          </SettingsSection>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
             <p className="text-xs text-slate-400 dark:text-slate-500">
                Financial Dashboard v1.0 • Powered by Gemini
             </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;