import React, { useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { IndexInfo, LoadingStatus } from '../types';
import { GeminiService } from '../services/geminiService';
import { parsePrice } from '../utils';
import { useSettings } from '../contexts/LanguageContext';

interface IndexCardProps {
  info: IndexInfo;
}

const IndexCard: React.FC<IndexCardProps> = ({ info }) => {
  const { settings } = useSettings();
  const language = settings.language;
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [priceData, setPriceData] = useState<string>('---');
  const [ma50Data, setMa50Data] = useState<string>('---');

  const fetchData = async () => {
    if (status === LoadingStatus.LOADING) return;
    setStatus(LoadingStatus.LOADING);
    setPriceData(language === 'zh-Hant' ? '載入中...' : 'Loading...');
    setMa50Data(language === 'zh-Hant' ? '載入中...' : 'Loading...');

    try {
      const [priceRes, ma50Res] = await Promise.all([
        GeminiService.fetchPrice(info.queryName, language),
        GeminiService.fetchMA50(info.queryName, language)
      ]);

      setPriceData(priceRes.text);
      setMa50Data(ma50Res.text);
      setStatus(LoadingStatus.SUCCESS);
    } catch (e) {
      setPriceData(language === 'zh-Hant' ? 'API 錯誤' : 'API Error');
      setMa50Data(language === 'zh-Hant' ? 'API 錯誤' : 'API Error');
      setStatus(LoadingStatus.ERROR);
    }
  };

  const getPriceColor = (text: string) => {
    if (text.includes('+')) return 'text-emerald-500 dark:text-emerald-400';
    if (text.includes('-')) return 'text-red-500 dark:text-red-400';
    return 'text-slate-700 dark:text-slate-200';
  };

  // Determine MA50 color
  const priceNum = parsePrice(priceData);
  const ma50Num = parsePrice(ma50Data);
  let maColor = 'text-slate-700 dark:text-slate-300';
  if (priceNum !== null && ma50Num !== null) {
      if (priceNum > ma50Num) maColor = 'text-emerald-600 dark:text-emerald-400 font-bold';
      else if (priceNum < ma50Num) maColor = 'text-rose-600 dark:text-rose-400 font-bold';
  }

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="font-bold text-slate-800 dark:text-white text-lg flex justify-between items-center">
        {info.name}
        <button
          onClick={fetchData}
          disabled={status === LoadingStatus.LOADING}
          className={`bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-1 px-3 rounded-full transition duration-200 text-xs flex items-center ${status === LoadingStatus.LOADING ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {status === LoadingStatus.LOADING ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <TrendingUp className="w-3 h-3 mr-1" />
          )}
          {language === 'zh-Hant' ? '查詢' : 'Update'}
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{info.description}</p>
      <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 border-t pt-2 border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 dark:text-slate-400">{language === 'zh-Hant' ? '最新價位:' : 'Price:'}</span>
          <span className={`text-xl font-extrabold ${getPriceColor(priceData)}`}>
            {priceData}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-slate-500 dark:text-slate-400">{language === 'zh-Hant' ? '50 天線:' : 'MA50:'}</span>
          <span className={`text-base font-medium ${maColor}`}>
            {ma50Data}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IndexCard;