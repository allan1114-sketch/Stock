import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useSettings } from '../contexts/LanguageContext';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const { t } = useSettings();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const isBatch = query.includes(',');

  return (
    <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto mb-10">
      <div className="relative flex items-center group">
        <div className="absolute left-5 text-slate-400 group-focus-within:text-sky-500 transition-colors">
          <Search className="w-6 h-6" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isBatch ? t('search.batch') : t('search.placeholder')}
          className="w-full px-5 py-4 pl-14 text-lg rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 outline-none transition-all shadow-sm group-hover:shadow-md dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          disabled={isLoading}
        />
        <div className="absolute right-3">
            <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md hover:shadow-lg active:scale-95"
            >
            {isLoading ? (
                <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('search.searching')}
                </>
            ) : (
                t('search.button')
            )}
            </button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;