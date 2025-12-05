import React, { useState } from 'react';
import { TrendingUp, Briefcase, BarChart2, Loader2, Globe, Percent } from 'lucide-react';
import IndexCard from './IndexCard';
import { GeminiService } from '../services/geminiService';
import { IndexInfo, LoadingStatus, Source } from '../types';

const INDICES: IndexInfo[] = [
  { name: 'S&P 500', description: '標普 500 指數', queryName: 'S&P 500 Index' },
  { name: 'Dow Jones', description: '道瓊斯指數', queryName: 'Dow Jones Industrial Average Index' },
  { name: 'Nasdaq', description: '納斯達克綜合指數', queryName: 'Nasdaq Composite Index' },
];

const MacroSection: React.FC = () => {
  const [viewStatus, setViewStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [marketView, setMarketView] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);

  const fetchView = async () => {
    if (viewStatus === LoadingStatus.LOADING) return;
    setViewStatus(LoadingStatus.LOADING);
    setMarketView('AI 正在綜合分析主要指數、美債殖利率、VIX 恐慌指數及通脹數據...');
    
    try {
      const result = await GeminiService.fetchOverallMarketView();
      setMarketView(result.text);
      setSources(result.sources);
      setViewStatus(LoadingStatus.SUCCESS);
    } catch (e) {
      setMarketView('宏觀分析 API 錯誤或網路問題。');
      setViewStatus(LoadingStatus.ERROR);
    }
  };

  const formatMarketView = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />; // Spacer for empty lines
        
        // Header detection: **Title**, 【Title】, or ### Title
        if ((trimmed.startsWith('**') && trimmed.endsWith('**')) || 
            (trimmed.startsWith('【') && trimmed.endsWith('】')) ||
            trimmed.startsWith('###')) {
            
            const content = trimmed
                .replace(/\*\*/g, '')
                .replace(/【|】/g, '')
                .replace(/^###\s*/, '');

            return (
                <h4 key={index} className="text-sky-800 font-bold mt-4 mb-2 text-base border-l-4 border-sky-400 pl-2">
                    {content}
                </h4>
            );
        }

        // Bold Key-Value detection: **Key**: Value
        if (trimmed.includes('**:')) {
             const parts = trimmed.split('**:');
             return (
                <div key={index} className="mb-2 pl-1">
                    <span className="font-bold text-slate-800">{parts[0].replace(/\*\*/g, '')}:</span>
                    <span className="text-slate-700 ml-1">{parts.slice(1).join('**:')}</span>
                </div>
             );
        }
        
        // List item detection
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || /^\d+\./.test(trimmed)) {
             const content = trimmed.replace(/^[-•\d+\.]\s*/, '');
             return (
                <div key={index} className="flex items-start mb-1.5 pl-3">
                    <span className="mr-2 text-sky-500 mt-1 flex-shrink-0">•</span>
                    <span className="text-slate-700 leading-relaxed text-sm">
                        {/* Handle bold text within list items */}
                        {content.split(/(\*\*.*?\*\*)/).map((part, i) => 
                            part.startsWith('**') && part.endsWith('**') ? 
                            <strong key={i} className="text-slate-900 font-semibold">{part.replace(/\*\*/g, '')}</strong> : 
                            part
                        )}
                    </span>
                </div>
             );
        }

        return <p key={index} className="text-slate-700 mb-2 leading-relaxed text-sm">{trimmed}</p>;
    });
  };

  return (
    <section className="bg-sky-50 p-6 rounded-xl shadow-inner border border-sky-200 animate-fade-in">
      <h2 className="text-2xl font-bold text-sky-800 mb-4 flex items-center border-b pb-2 border-sky-300">
        <Globe className="w-5 h-5 mr-2" />
        宏觀經濟與市場深度分析
      </h2>

      {/* Overall Market View Display and Button */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md border border-sky-100 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-teal-400 rounded-t-lg"></div>
          
          <h3 className="text-base font-semibold text-sky-700 mb-4 flex items-center">
            <Briefcase className="w-4 h-4 mr-1 text-teal-500" /> 
            AI 首席策略師觀點
            <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center">
                <Percent className="w-3 h-3 mr-1" />
                包含美債、VIX 與通脹數據
            </span>
          </h3>
          
          <div className="text-sm text-slate-700">
            {marketView ? (
                formatMarketView(marketView)
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <BarChart2 className="w-8 h-8 mb-2 opacity-50" />
                    <p>點擊右側按鈕以生成最新的深度宏觀報告</p>
                </div>
            )}
          </div>
          
          {sources.length > 0 && (
            <div className="mt-4 text-xs text-slate-500 pt-3 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-3 rounded-b-lg">
              <span className="font-semibold mr-2">資料來源:</span>
              {sources.map((s, i) => (
                <span key={i} className="mr-3 inline-block max-w-[200px] truncate align-bottom">
                  <a href={s.uri} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline flex items-center">
                    <Globe className="w-3 h-3 mr-1 inline" />
                    {s.title}
                  </a>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 flex flex-col justify-start space-y-4">
          <button
            onClick={fetchView}
            disabled={viewStatus === LoadingStatus.LOADING}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition duration-200 flex flex-col items-center justify-center w-full text-base disabled:opacity-75 disabled:cursor-not-allowed border-b-4 border-sky-800 active:border-b-0 active:translate-y-1"
          >
            {viewStatus === LoadingStatus.LOADING ? (
              <>
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                <span>深度分析中...</span>
                <span className="text-xs font-normal opacity-80 mt-1">整合 Fed、VIX 與公債</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-8 h-8 mb-2" />
                <span>生成宏觀報告</span>
                <span className="text-xs font-normal opacity-80 mt-1">AI 實時檢索分析</span>
              </>
            )}
          </button>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500">
              <h5 className="font-bold text-slate-700 mb-2">分析範圍涵蓋:</h5>
              <ul className="space-y-1.5 list-disc pl-4">
                  <li>CPI / PCE 通脹數據</li>
                  <li>Fed 利率 / FOMC 預期</li>
                  <li>10年期美債殖利率</li>
                  <li>VIX 恐慌指數 / 油價</li>
              </ul>
          </div>
        </div>
      </div>

      {/* Index List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {INDICES.map((idx) => (
          <IndexCard key={idx.name} info={idx} />
        ))}
      </div>
    </section>
  );
};

export default MacroSection;