import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Newspaper, TrendingUp, Server, ClipboardList, Layers, Loader2,
  Bell, BellRing, Star, Download, BrainCircuit, PenTool, Trash2, ChevronDown, ChevronUp, ExternalLink, Target, BarChartHorizontal,
  Info, Sparkles, Scale, XCircle, Search, ArrowRightLeft
} from 'lucide-react';
import { StockInfo, LoadingStatus, Source, PriceAlert, AlertType, PredictionData, TechIndicators, AnalystRating, NewsItem, CompanyMetrics } from '../types';
import { GeminiService } from '../services/geminiService';
import { parsePrice, parseMetric } from '../utils';
import { useSettings } from '../contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

interface StockCardProps {
  stock: StockInfo;
  onNotify: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  isWatched: boolean;
  onToggleWatch: (stock: StockInfo) => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const getSentimentConfig = (label: string) => {
  switch (label) {
    case 'positive': return { text: 'Positive', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', icon: TrendingUp };
    case 'negative': return { text: 'Negative', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800', bar: 'bg-rose-500', icon: (props: any) => <TrendingUp {...props} className={`${props.className} rotate-180`} /> };
    default: return { text: 'Neutral', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600', bar: 'bg-slate-400', icon: Activity };
  }
};

const StockCard: React.FC<StockCardProps> = ({ stock, onNotify, isWatched, onToggleWatch, isDraggable, onDragStart, onDragOver, onDrop }) => {
  const { t, settings } = useSettings();
  const language = settings.language;
  
  // Data States
  const [dataStatus, setDataStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [price, setPrice] = useState<string>('---');
  const [ma50, setMa50] = useState<string>('---');
  const [volume, setVolume] = useState<string>('---');
  const [techIndicators, setTechIndicators] = useState<TechIndicators>({ rsi: '---', macd: '---' });
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);

  // Logo State
  const [logo, setLogo] = useState<string>(`https://ui-avatars.com/api/?name=${encodeURIComponent(stock.name)}&background=random&color=fff&size=128`);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  // Compare State
  const [showCompareInput, setShowCompareInput] = useState(false);
  const [compQuery, setCompQuery] = useState('');
  const [compStock, setCompStock] = useState<StockInfo | null>(null);
  const [compPrice, setCompPrice] = useState<string>('---');
  const [compMetrics, setCompMetrics] = useState<CompanyMetrics | null>(null);
  const [compStatus, setCompStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [compChartData, setCompChartData] = useState<any[]>([]);
  const [compChartStatus, setCompChartStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);

  // Other States (Summary, View, Prediction, News)
  const [summaryStatus, setSummaryStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [summary, setSummary] = useState<string>('');
  const [sentiment, setSentiment] = useState<{label: string, score: number} | null>(null);
  const [summarySources, setSummarySources] = useState<Source[]>([]);
  
  const [viewStatus, setViewStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [viewHtml, setViewHtml] = useState<React.ReactNode>('');
  const [viewSources, setViewSources] = useState<Source[]>([]);
  const [analystRating, setAnalystRating] = useState<AnalystRating | null>(null);

  const [predictStatus, setPredictStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  
  const [showInfo, setShowInfo] = useState(false);

  // News expansion
  const [showNews, setShowNews] = useState(false);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsStatus, setNewsStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);

  // Alerts
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertConfig, setAlertConfig] = useState<PriceAlert | null>(null);
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [alertTargetValue, setAlertTargetValue] = useState('');
  
  const sentimentConfig = sentiment ? getSentimentConfig(sentiment.label) : null;
  const SentimentIcon = sentimentConfig?.icon;

  const handleQuotaError = (e: any) => {
    if (e.message === 'QUOTA_EXCEEDED') {
      onNotify('API Quota Exceeded', 'You have hit the daily/rate limit for the Gemini API. Please wait.', 'alert');
    }
  };

  // --- Auto-Fetch on Mount ---
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
        // Prevent re-fetching if we already have data
        if (price !== '---') return;

        try {
            // Fetch Price
            const pRes = await GeminiService.fetchPrice(stock.queryName, language);
            if (mounted) setPrice(pRes.text);
            
            // Fetch Metrics (optional but good for display)
            const mRes = await GeminiService.fetchCompanyMetrics(stock.queryName);
            if (mounted) setMetrics(mRes);
        } catch (e) {
            console.error("Init fetch failed", e);
            handleQuotaError(e);
        }
    };

    // Stagger fetch slightly to avoid burst if many cards load at once
    const timer = setTimeout(initData, Math.random() * 800);
    return () => { mounted = false; clearTimeout(timer); };
  }, [stock.queryName, language]);

  // --- Handlers ---

  const generateAiLogo = async () => {
    if (isGeneratingLogo) return;
    setIsGeneratingLogo(true);
    try {
        const base64 = await GeminiService.generateLogo(stock.name);
        if (base64) setLogo(base64);
    } catch (e) {
        onNotify('Error', 'Failed to generate logo', 'alert');
    } finally {
        setIsGeneratingLogo(false);
    }
  };

  const handleCompareSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!compQuery.trim()) return;
    setCompStatus(LoadingStatus.LOADING);
    setCompChartStatus(LoadingStatus.LOADING);
    try {
        const stockInfo = await GeminiService.resolveStockQuery(compQuery);
        if (stockInfo) {
            setCompStock(stockInfo);
            // Fetch data
             const [pRes, metricRes, chartRes] = await Promise.all([
                GeminiService.fetchPrice(stockInfo.queryName, language),
                GeminiService.fetchCompanyMetrics(stockInfo.queryName),
                GeminiService.fetchComparisonChart(stock.name, stockInfo.name)
            ]);
            setCompPrice(pRes.text);
            setCompMetrics(metricRes);
            setCompChartData(chartRes);

            setCompStatus(LoadingStatus.SUCCESS);
            setCompChartStatus(LoadingStatus.SUCCESS);
            setShowCompareInput(false);
        } else {
            onNotify('Not Found', 'Could not find stock', 'alert');
            setCompStatus(LoadingStatus.ERROR);
            setCompChartStatus(LoadingStatus.ERROR);
        }
    } catch (e) {
        setCompStatus(LoadingStatus.ERROR);
        setCompChartStatus(LoadingStatus.ERROR);
        handleQuotaError(e);
    }
  };

  const clearCompare = () => {
    setCompStock(null);
    setCompPrice('---');
    setCompMetrics(null);
    setCompChartData([]);
    setCompQuery('');
  };

  const fetchTechData = async () => {
    if (dataStatus === LoadingStatus.LOADING) return;
    setDataStatus(LoadingStatus.LOADING);
    setShowInfo(true);

    try {
      const [pRes, mRes, vRes, tRes, metricRes] = await Promise.all([
        GeminiService.fetchPrice(stock.queryName, language),
        GeminiService.fetchMA50(stock.queryName, language),
        GeminiService.fetchTradingVolume(stock.queryName, language),
        GeminiService.fetchTechnicalIndicators(stock.queryName),
        GeminiService.fetchCompanyMetrics(stock.queryName)
      ]);
      setPrice(pRes.text);
      setMa50(mRes.text);
      setVolume(vRes.text);
      setTechIndicators(tRes);
      setMetrics(metricRes);
      setDataStatus(LoadingStatus.SUCCESS);
    } catch (e) {
      setDataStatus(LoadingStatus.ERROR);
      handleQuotaError(e);
    }
  };

  const fetchSummary = async () => {
    if (summaryStatus === LoadingStatus.LOADING) return;
    setSummaryStatus(LoadingStatus.LOADING);
    setSentiment(null);
    try {
      const res = await GeminiService.fetchStockSummary(stock.queryName, language);
      setSummary(res.data.summary);
      setSentiment({ label: res.data.sentiment, score: res.data.score });
      setSummarySources(res.sources);
      setSummaryStatus(LoadingStatus.SUCCESS);
    } catch (e) { 
      setSummaryStatus(LoadingStatus.ERROR);
      handleQuotaError(e);
    }
  };

  const fetchView = async () => {
    if (viewStatus === LoadingStatus.LOADING) return;
    setViewStatus(LoadingStatus.LOADING);
    setAnalystRating(null);
    try {
      const [res, rating] = await Promise.all([
          GeminiService.fetchInvestmentView(stock.queryName, language),
          GeminiService.fetchAnalystRatings(stock.queryName)
      ]);
      setViewHtml(formatViewContent(res.text));
      setViewSources(res.sources);
      setAnalystRating(rating);
      setViewStatus(LoadingStatus.SUCCESS);
    } catch (e) { 
      setViewStatus(LoadingStatus.ERROR);
      handleQuotaError(e);
    }
  };

  const fetchPrediction = async () => {
      if (predictStatus === LoadingStatus.LOADING) return;
      setPredictStatus(LoadingStatus.LOADING);
      setPrediction(null);
      try {
          const res = await GeminiService.fetchPricePrediction(stock.queryName, language);
          setPrediction(res.data);
          setPredictStatus(LoadingStatus.SUCCESS);
      } catch (e) { 
        setPredictStatus(LoadingStatus.ERROR);
        handleQuotaError(e);
      }
  };

  const toggleNews = async () => {
      const next = !showNews;
      setShowNews(next);
      if (next && newsList.length === 0 && newsStatus !== LoadingStatus.LOADING) {
          setNewsStatus(LoadingStatus.LOADING);
          try {
              const res = await GeminiService.fetchCompanyNews(stock.queryName, language);
              setNewsList(res.news);
              setNewsStatus(LoadingStatus.SUCCESS);
          } catch (e) { 
            setNewsStatus(LoadingStatus.ERROR);
            handleQuotaError(e);
          }
      }
  };

  // --- Helpers ---
  const formatViewContent = (text: string) => {
      return text.split('\n').map((line, i) => <p key={i} className="mb-1 text-sm text-slate-700 dark:text-slate-300">{line}</p>);
  };

  const getPriceColor = (val: string) => val.includes('+') ? 'text-emerald-500 dark:text-emerald-400' : val.includes('-') ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200';

  const priceNum = parsePrice(price);
  const ma50Num = parsePrice(ma50);
  let maColor = 'text-slate-700 dark:text-slate-300';
  if (priceNum !== null && ma50Num !== null) {
      if (priceNum > ma50Num) maColor = 'text-emerald-600 dark:text-emerald-400 font-bold'; else if (priceNum < ma50Num) maColor = 'text-rose-600 dark:text-rose-400 font-bold';
  }

  // --- Render Components ---

  const renderComparisonRow = (label: string, val1: string, val2: string, type: 'price' | 'number' | 'text' = 'text') => {
      const v1Num = parseMetric(val1);
      const v2Num = parseMetric(val2);
      
      let v1Class = 'text-slate-700 dark:text-slate-300';
      let v2Class = 'text-indigo-600 dark:text-indigo-400';
      
      if (type === 'price') {
          v1Class = getPriceColor(val1);
          v2Class = getPriceColor(val2);
      } else if (v1Num !== null && v2Num !== null) {
          if (v1Num > v2Num) v1Class += ' font-bold bg-slate-100 dark:bg-slate-700/50 rounded px-1';
          if (v2Num > v1Num) v2Class += ' font-bold bg-indigo-50 dark:bg-indigo-900/30 rounded px-1';
      }

      return (
        <div className="grid grid-cols-3 items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-2 -mx-2 rounded">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
            <span className={`text-sm text-right ${v1Class}`}>{val1}</span>
            <span className={`text-sm text-right ${v2Class}`}>{val2}</span>
        </div>
      );
  };

  return (
    <div 
        className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg flex flex-col border-l-[5px] border-cyan-500 hover:shadow-xl transition-all duration-300 relative ${isDraggable ? 'cursor-move opacity-95' : ''}`}
        draggable={isDraggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
    >
      {/* Top Right Actions */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
          <button onClick={() => onToggleWatch(stock)} className={`p-2 rounded-full ${isWatched ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
            <Star className={`w-5 h-5 ${isWatched ? 'fill-current' : ''}`} />
          </button>
          <div className="relative">
              <button onClick={() => setShowAlertInput(!showAlertInput)} className={`p-2 rounded-full ${alertConfig?.active ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                 {alertConfig?.active ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </button>
              {showAlertInput && (
                  <div className="absolute right-0 top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-3 w-64 z-20">
                      <select value={alertType} onChange={(e) => setAlertType(e.target.value as AlertType)} className="w-full text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded mb-2">
                          <option value="above">Price Above</option>
                          <option value="below">Price Below</option>
                      </select>
                      <input type="number" value={alertTargetValue} onChange={(e) => setAlertTargetValue(e.target.value)} placeholder="Val" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded mb-2 text-sm px-2 py-1" />
                      <button onClick={() => { setAlertConfig({ targetValue: parseFloat(alertTargetValue), active: true, type: alertType }); setShowAlertInput(false); }} className="bg-sky-600 text-white text-xs w-full rounded py-1">Set</button>
                  </div>
              )}
          </div>
      </div>

      {/* Header with Logo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-3 border-slate-100 dark:border-slate-700 pr-24">
        <div className="mb-3 sm:mb-0 flex items-start gap-4">
          <div className="relative group shrink-0">
             <img src={logo} alt={stock.name} className="w-14 h-14 rounded-xl object-cover shadow-sm bg-slate-50 dark:bg-slate-700" />
             <button 
                onClick={generateAiLogo} 
                disabled={isGeneratingLogo}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl transition-opacity text-white backdrop-blur-sm"
                title="Generate AI Logo"
             >
                {isGeneratingLogo ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
             </button>
          </div>
          <div>
              <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stock.name}</p>
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400 block">{stock.description}</span>
          </div>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <ActionButton onClick={fetchTechData} loading={dataStatus === LoadingStatus.LOADING} icon={<Activity className="w-4 h-4 mr-1" />} label={t('btn.data')} colorClass="bg-sky-600 hover:bg-sky-700" />
          <ActionButton onClick={fetchSummary} loading={summaryStatus === LoadingStatus.LOADING} icon={<Newspaper className="w-4 h-4 mr-1" />} label={t('btn.summary')} colorClass="bg-teal-600 hover:bg-teal-700" />
          <ActionButton onClick={fetchView} loading={viewStatus === LoadingStatus.LOADING} icon={<TrendingUp className="w-4 h-4 mr-1" />} label={t('btn.view')} colorClass="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600" />
          <button 
             onClick={() => setShowCompareInput(!showCompareInput)} 
             className={`bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium py-2 px-3 rounded-lg shadow-sm flex items-center justify-center text-sm transition-colors ${compStock ? 'ring-2 ring-indigo-500' : ''}`}
             title="Compare with another stock"
          >
             <Scale className="w-4 h-4 mr-1" /> {compStock ? 'Comp' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Compare Input */}
      {showCompareInput && !compStock && (
          <form onSubmit={handleCompareSearch} className="mb-4 flex items-center gap-2 animate-fade-in-down">
              <div className="relative flex-grow">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    value={compQuery}
                    onChange={(e) => setCompQuery(e.target.value)}
                    placeholder="Enter symbol to compare (e.g. MSFT)..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                 />
              </div>
              <button 
                 type="submit" 
                 disabled={compStatus === LoadingStatus.LOADING}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                  {compStatus === LoadingStatus.LOADING ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Add'}
              </button>
          </form>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Real-time Data */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
          <div className="mb-2 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
             <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                {compStock ? <ArrowRightLeft className="w-4 h-4 mr-2 text-indigo-500" /> : <Server className="w-4 h-4 mr-1 text-sky-500" />} 
                {compStock ? 'Comparison' : t('label.price')}
             </h4>
          </div>
          
          <div className="text-sm space-y-2">
            {compStock ? (
                // Comparison View
                <div className="space-y-1">
                    <div className="grid grid-cols-3 text-xs font-bold text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 px-2">
                        <span>Metric</span>
                        <span className="text-right truncate pr-1">{stock.symbol}</span>
                        <span className="text-right text-indigo-500 truncate">{compStock.symbol}</span>
                    </div>
                    {renderComparisonRow(t('label.price'), price, compPrice, 'price')}
                    {renderComparisonRow(t('label.marketCap'), metrics?.marketCap || '-', compMetrics?.marketCap || '-', 'number')}
                    {renderComparisonRow(t('label.peRatio'), metrics?.peRatio || '-', compMetrics?.peRatio || '-', 'number')}
                    {renderComparisonRow(t('label.dividend'), metrics?.dividendYield || '-', compMetrics?.dividendYield || '-', 'number')}
                    
                    {/* Comparison Chart */}
                    {compChartData.length > 0 && (
                      <div className="h-40 mt-4 -mx-2 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/50 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={compChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{fontSize: 10}} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{borderRadius: '8px', fontSize: '12px'}}
                                formatter={(val: number) => [`${val > 0 ? '+' : ''}${val}%`, 'Change']}
                            />
                            <Legend wrapperStyle={{fontSize: '10px', paddingTop: '5px'}} iconType="circle" />
                            <Line type="monotone" dataKey="s1" name={stock.symbol} stroke="#64748b" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                            <Line type="monotone" dataKey="s2" name={compStock.symbol} stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <button 
                       onClick={clearCompare} 
                       className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-dashed border-rose-200 dark:border-rose-800"
                    >
                        <XCircle className="w-3 h-3" /> Clear Compare
                    </button>
                </div>
            ) : (
                // Standard View
                <>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('label.price')}:</span> <span className={`text-xl font-bold ${getPriceColor(price)}`}>{price}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('label.ma50')}:</span> <span className={`font-medium ${maColor}`}>{ma50}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('label.volume')}:</span> <span className="font-medium text-slate-700 dark:text-slate-300">{volume}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">RSI (14):</span> <span className="font-medium text-slate-700 dark:text-slate-300">{techIndicators.rsi}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">MACD:</span> <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate ml-2" title={techIndicators.macd}>{techIndicators.macd}</span></div>
                    
                    {metrics && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-center">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('label.marketCap')}</div>
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{metrics.marketCap}</div>
                            </div>
                            <div className="text-center border-l border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('label.peRatio')}</div>
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{metrics.peRatio}</div>
                            </div>
                            <div className="text-center border-l border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('label.dividend')}</div>
                                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.dividendYield}</div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!compStock && (
                <div className="mt-3">
                    <button onClick={fetchPrediction} disabled={predictStatus === LoadingStatus.LOADING} className="w-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs py-2 rounded font-bold hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors">
                        {predictStatus === LoadingStatus.LOADING ? 'Analyzing...' : 'AI Prediction (7D)'}
                    </button>
                    {prediction && (
                        <div className="mt-2 text-xs bg-white dark:bg-slate-900 p-2 rounded border dark:border-slate-700">
                            <div className="flex justify-between font-bold text-violet-700 dark:text-violet-300"><span>Target:</span><span>${prediction.predictedPrice}</span></div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 mt-1"><div className="bg-violet-500 h-1" style={{width: `${prediction.confidenceScore}%`}}></div></div>
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner md:col-span-2 flex flex-col">
            <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span className="flex items-center"><ClipboardList className="w-4 h-4 mr-1 text-teal-500" /> {t('btn.summary')}</span>
                {sentiment && <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentConfig?.color}`}>{sentimentConfig?.text} ({sentiment.score})</span>}
            </h4>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap flex-grow">{summary || "Click Summary to analyze."}</div>
            <div className="mt-auto pt-2 flex justify-between">
                <div className="text-xs text-slate-400 flex gap-2">
                    {summarySources.map((s,i) => <a key={i} href={s.uri} target="_blank" className="hover:underline">{s.title}</a>)}
                </div>
                <button onClick={toggleNews} className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center">{showNews ? 'Hide News' : 'News'} {showNews ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}</button>
            </div>
            {showNews && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    {newsStatus === LoadingStatus.LOADING ? <Loader2 className="w-4 h-4 animate-spin dark:text-slate-200"/> : newsList.map((n, i) => (
                        <a key={i} href={n.link} target="_blank" className="block p-1 hover:bg-white dark:hover:bg-slate-800 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                           <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{n.title}</div>
                           <div className="flex justify-between text-slate-400"><span>{n.source}</span><span>{n.date}</span></div>
                        </a>
                    ))}
                </div>
            )}
        </div>
        
        {/* Investment View */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner md:col-span-3">
             <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center">
                <Layers className="w-4 h-4 mr-1 text-slate-500" /> {t('btn.view')}
             </h4>
             <div className="text-sm text-slate-700 dark:text-slate-300">{viewHtml || "Click View to analyze."}</div>
             {analystRating && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center">
                            <BarChartHorizontal className="w-3 h-3 mr-1" /> Analyst Consensus
                        </span>
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                            {analystRating.consensus}
                        </span>
                    </div>
                    <div className="flex items-center gap-0.5 h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        {analystRating.buyCount > 0 && <div style={{flex: analystRating.buyCount}} className="bg-emerald-500 h-full" title={`Buy: ${analystRating.buyCount}`}></div>}
                        {analystRating.holdCount > 0 && <div style={{flex: analystRating.holdCount}} className="bg-slate-400 dark:bg-slate-500 h-full" title={`Hold: ${analystRating.holdCount}`}></div>}
                        {analystRating.sellCount > 0 && <div style={{flex: analystRating.sellCount}} className="bg-rose-500 h-full" title={`Sell: ${analystRating.sellCount}`}></div>}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-0.5">
                        <span>Buy: {analystRating.buyCount}</span>
                        <span>Hold: {analystRating.holdCount}</span>
                        <span>Sell: {analystRating.sellCount}</span>
                    </div>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ onClick, loading, icon, label, colorClass }: any) => (
  <button onClick={onClick} disabled={loading} className={`${colorClass} text-white font-medium py-2 px-3 rounded-lg shadow-md flex items-center justify-center text-sm disabled:opacity-75`}>
    {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : icon} {label}
  </button>
);

export default StockCard;