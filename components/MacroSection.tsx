import React, { useState } from 'react';
import { Globe, Briefcase, BarChart2, Loader2, Percent } from 'lucide-react';
import IndexCard from './IndexCard';
import { GeminiService } from '../services/geminiService';
import { IndexInfo, LoadingStatus, Source } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const INDICES: IndexInfo[] = [
  { name: 'S&P 500', description: 'SPX', queryName: 'S&P 500 Index' },
  { name: 'Dow Jones', description: 'DJI', queryName: 'Dow Jones Industrial Average Index' },
  { name: 'Nasdaq', description: 'IXIC', queryName: 'Nasdaq Composite Index' },
];

const MacroSection: React.FC = () => {
  const { t, language } = useLanguage();
  const [viewStatus, setViewStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [marketView, setMarketView] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);

  const fetchView = async () => {
    if (viewStatus === LoadingStatus.LOADING) return;
    setViewStatus(LoadingStatus.LOADING);
    setMarketView('Analyzing...');
    
    try {
      const result = await GeminiService.fetchOverallMarketView(language);
      setMarketView(result.text);
      setSources(result.sources);
      setViewStatus(LoadingStatus.SUCCESS);
    } catch (e) {
      setMarketView('Error fetching macro analysis.');
      setViewStatus(LoadingStatus.ERROR);
    }
  };

  const formatMarketView = (text: string) => {
    // ... simplified usage for brevity, assuming similar markdown parsing needs ...
    return text.split('\n').map((line, i) => <p key={i} className="mb-2 text-sm text-slate-700">{line}</p>);
  };

  return (
    <section className="bg-sky-50 p-6 rounded-xl shadow-inner border border-sky-200">
      <h2 className="text-2xl font-bold text-sky-800 mb-4 flex items-center border-b pb-2 border-sky-300">
        <Globe className="w-5 h-5 mr-2" />
        {t('macro.title')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md border border-sky-100 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-teal-400 rounded-t-lg"></div>
          <h3 className="text-base font-semibold text-sky-700 mb-4 flex items-center">
            <Briefcase className="w-4 h-4 mr-1 text-teal-500" /> 
            AI Strategist View
          </h3>
          <div className="text-sm text-slate-700">
            {marketView ? formatMarketView(marketView) : <div className="py-8 text-center text-slate-400">Click Generate to analyze.</div>}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col justify-start space-y-4">
          <button
            onClick={fetchView}
            disabled={viewStatus === LoadingStatus.LOADING}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg w-full flex flex-col items-center disabled:opacity-75"
          >
            {viewStatus === LoadingStatus.LOADING ? <Loader2 className="w-8 h-8 mb-2 animate-spin" /> : <BarChart2 className="w-8 h-8 mb-2" />}
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {INDICES.map((idx) => <IndexCard key={idx.name} info={idx} />)}
      </div>
    </section>
  );
};

export default MacroSection;
