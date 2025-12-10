import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Newspaper, TrendingUp, Server, ClipboardList, Layers, Loader2, LineChart as LineChartIcon,
  Bell, BellRing, Star, Download, BrainCircuit, PenTool, Trash2, ChevronDown, ChevronUp, ExternalLink, Target, BarChartHorizontal,
  Info
} from 'lucide-react';
import { StockInfo, LoadingStatus, Source, ChartDataPoint, PriceAlert, AlertType, PredictionData, ChartAnnotation, TechIndicators, AnalystRating, NewsItem, CompanyMetrics } from '../types';
import { GeminiService } from '../services/geminiService';
import StockChart from './StockChart';
import { parsePrice } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

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
    case 'positive': return { text: 'Positive', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', icon: TrendingUp };
    case 'negative': return { text: 'Negative', color: 'bg-rose-100 text-rose-700 border-rose-200', bar: 'bg-rose-500', icon: (props: any) => <TrendingUp {...props} className={`${props.className} rotate-180`} /> };
    default: return { text: 'Neutral', color: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-slate-400', icon: Activity };
  }
};

const StockCard: React.FC<StockCardProps> = ({ stock, onNotify, isWatched, onToggleWatch, isDraggable, onDragStart, onDragOver, onDrop }) => {
  const { t, language } = useLanguage();
  
  // Data States
  const [dataStatus, setDataStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [price, setPrice] = useState<string>('---');
  const [ma50, setMa50] = useState<string>('---');
  const [volume, setVolume] = useState<string>('---');
  const [techIndicators, setTechIndicators] = useState<TechIndicators>({ rsi: '---', macd: '---' });
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);

  // Other States (Summary, View, Prediction, Chart, News)
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
  
  const [chartStatus, setChartStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '3M'>('1M');
  const [showChart, setShowChart] = useState(false);
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
  
  // Annotations
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [newAnnotationPrice, setNewAnnotationPrice] = useState('');

  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentimentConfig = sentiment ? getSentimentConfig(sentiment.label) : null;
  const SentimentIcon = sentimentConfig?.icon;

  // --- Handlers ---

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
    } catch {
      setDataStatus(LoadingStatus.ERROR);
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
    } catch { setSummaryStatus(LoadingStatus.ERROR); }
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
    } catch { setViewStatus(LoadingStatus.ERROR); }
  };

  const fetchPrediction = async () => {
      if (predictStatus === LoadingStatus.LOADING) return;
      setPredictStatus(LoadingStatus.LOADING);
      setPrediction(null);
      try {
          const res = await GeminiService.fetchPricePrediction(stock.queryName, language);
          setPrediction(res.data);
          setPredictStatus(LoadingStatus.SUCCESS);
      } catch { setPredictStatus(LoadingStatus.ERROR); }
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
          } catch { setNewsStatus(LoadingStatus.ERROR); }
      }
  };

  const fetchChart = async (range: '1D' | '1W' | '1M' | '3M', isAutoUpdate = false) => {
    setChartRange(range);
    if (!isAutoUpdate) setChartStatus(LoadingStatus.LOADING);
    try {
      const res = await GeminiService.fetchStockHistory(stock.queryName, range);
      setChartData(res.data);
      setChartStatus(LoadingStatus.SUCCESS);
    } catch { if (!isAutoUpdate) setChartStatus(LoadingStatus.ERROR); }
  };

  const toggleChart = () => {
    if (!showChart) { setShowChart(true); fetchChart('1M'); } else { setShowChart(false); }
  };

  // --- Effects ---
  useEffect(() => {
    if (showChart) {
        chartIntervalRef.current = setInterval(() => fetchChart(chartRange, true), 60000);
    } else { if (chartIntervalRef.current) clearInterval(chartIntervalRef.current); }
    return () => { if (chartIntervalRef.current) clearInterval(chartIntervalRef.current); };
  }, [showChart, chartRange]);

  // --- Helpers ---
  const formatViewContent = (text: string) => {
      // Simplified formatter for brevity in update
      return text.split('\n').map((line, i) => <p key={i} className="mb-1 text-sm text-slate-700">{line}</p>);
  };

  const getPriceColor = (val: string) => val.includes('+') ? 'text-emerald-500' : val.includes('-') ? 'text-red-500' : 'text-slate-700';

  const priceNum = parsePrice(price);
  const ma50Num = parsePrice(ma50);
  let maColor = 'text-slate-700';
  if (priceNum !== null && ma50Num !== null) {
      if (priceNum > ma50Num) maColor = 'text-emerald-600 font-bold'; else if (priceNum < ma50Num) maColor = 'text-rose-600 font-bold';
  }

  return (
    <div 
        className={`bg-white p-5 rounded-xl shadow-lg flex flex-col border-l-[5px] border-cyan-500 hover:shadow-xl transition-all duration-300 relative ${isDraggable ? 'cursor-move opacity-95' : ''}`}
        draggable={isDraggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
    >
      {/* Top Right Actions */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
          <button onClick={() => onToggleWatch(stock)} className={`p-2 rounded-full ${isWatched ? 'bg-yellow-100 text-yellow-500' : 'bg-slate-100 text-slate-400'}`}>
            <Star className={`w-5 h-5 ${isWatched ? 'fill-current' : ''}`} />
          </button>
          <div className="relative">
              <button onClick={() => setShowAlertInput(!showAlertInput)} className={`p-2 rounded-full ${alertConfig?.active ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                 {alertConfig?.active ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </button>
              {showAlertInput && (
                  <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 z-20">
                      <select value={alertType} onChange={(e) => setAlertType(e.target.value as AlertType)} className="w-full text-xs border rounded mb-2">
                          <option value="above">Price Above</option>
                          <option value="below">Price Below</option>
                      </select>
                      <input type="number" value={alertTargetValue} onChange={(e) => setAlertTargetValue(e.target.value)} placeholder="Val" className="w-full border rounded mb-2 text-sm" />
                      <button onClick={() => { setAlertConfig({ targetValue: parseFloat(alertTargetValue), active: true, type: alertType }); setShowAlertInput(false); }} className="bg-sky-600 text-white text-xs w-full rounded py-1">Set</button>
                  </div>
              )}
          </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-3 border-slate-100 pr-24">
        <div className="mb-3 sm:mb-0">
          <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">{stock.name}</p>
          </div>
          <span className="text-sm text-slate-500">{stock.description}</span>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <ActionButton onClick={fetchTechData} loading={dataStatus === LoadingStatus.LOADING} icon={<Activity className="w-4 h-4 mr-1" />} label={t('btn.data')} colorClass="bg-sky-600 hover:bg-sky-700" />
          <ActionButton onClick={fetchSummary} loading={summaryStatus === LoadingStatus.LOADING} icon={<Newspaper className="w-4 h-4 mr-1" />} label={t('btn.summary')} colorClass="bg-teal-600 hover:bg-teal-700" />
          <ActionButton onClick={fetchView} loading={viewStatus === LoadingStatus.LOADING} icon={<TrendingUp className="w-4 h-4 mr-1" />} label={t('btn.view')} colorClass="bg-slate-600 hover:bg-slate-700" />
          <ActionButton onClick={toggleChart} loading={false} icon={<LineChartIcon className="w-4 h-4 mr-1" />} label={t('btn.chart')} colorClass="bg-indigo-600 hover:bg-indigo-700" />
        </div>
      </div>

      {/* Chart Section */}
      {showChart && (
        <div className="mb-6 h-64 border rounded p-2">
           {chartStatus === LoadingStatus.SUCCESS ? <StockChart data={chartData} annotations={annotations} /> : <div className="h-full flex items-center justify-center text-slate-400">Loading...</div>}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Real-time Data */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
          <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <Server className="w-4 h-4 mr-1 text-sky-500" /> {t('label.price')}
          </h4>
          <div className="text-sm text-slate-700 space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">{t('label.price')}:</span> <span className={`text-xl font-bold ${getPriceColor(price)}`}>{price}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('label.ma50')}:</span> <span className={`font-medium ${maColor}`}>{ma50}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('label.volume')}:</span> <span className="font-medium">{volume}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">RSI (14):</span> <span className="font-medium text-slate-700">{techIndicators.rsi}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">MACD:</span> <span className="font-medium text-slate-700 text-right truncate ml-2" title={techIndicators.macd}>{techIndicators.macd}</span></div>
            
            {/* Company Metrics Sub-Section */}
            {metrics && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('label.marketCap')}</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{metrics.marketCap}</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('label.peRatio')}</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{metrics.peRatio}</div>
                    </div>
                    <div className="text-center border-l border-slate-100">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('label.dividend')}</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5">{metrics.dividendYield}</div>
                    </div>
                </div>
            )}

            <div className="mt-3">
                 <button onClick={fetchPrediction} disabled={predictStatus === LoadingStatus.LOADING} className="w-full bg-violet-100 text-violet-700 text-xs py-2 rounded font-bold">
                    {predictStatus === LoadingStatus.LOADING ? 'Analyzing...' : 'AI Prediction (7D)'}
                 </button>
                 {prediction && (
                     <div className="mt-2 text-xs bg-white p-2 rounded border">
                         <div className="flex justify-between font-bold text-violet-700"><span>Target:</span><span>${prediction.predictedPrice}</span></div>
                         <div className="w-full bg-slate-100 h-1 mt-1"><div className="bg-violet-500 h-1" style={{width: `${prediction.confidenceScore}%`}}></div></div>
                     </div>
                 )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-2 flex flex-col">
            <h4 className="text-base font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span className="flex items-center"><ClipboardList className="w-4 h-4 mr-1 text-teal-500" /> {t('btn.summary')}</span>
                {sentiment && <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentConfig?.color}`}>{sentimentConfig?.text} ({sentiment.score})</span>}
            </h4>
            <div className="text-sm text-slate-700 whitespace-pre-wrap flex-grow">{summary || "Click Summary to analyze."}</div>
            <div className="mt-auto pt-2 flex justify-between">
                <div className="text-xs text-slate-400 flex gap-2">
                    {summarySources.map((s,i) => <a key={i} href={s.uri} target="_blank" className="hover:underline">{s.title}</a>)}
                </div>
                <button onClick={toggleNews} className="text-xs text-teal-600 font-bold flex items-center">{showNews ? 'Hide News' : 'News'} {showNews ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}</button>
            </div>
            {showNews && (
                <div className="mt-2 pt-2 border-t text-xs space-y-2">
                    {newsStatus === LoadingStatus.LOADING ? <Loader2 className="w-4 h-4 animate-spin"/> : newsList.map((n, i) => (
                        <a key={i} href={n.link} target="_blank" className="block p-1 hover:bg-white rounded border border-transparent hover:border-slate-200">
                           <div className="font-bold text-slate-700 truncate">{n.title}</div>
                           <div className="flex justify-between text-slate-400"><span>{n.source}</span><span>{n.date}</span></div>
                        </a>
                    ))}
                </div>
            )}
        </div>
        
        {/* Investment View */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-3">
             <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
                <Layers className="w-4 h-4 mr-1 text-slate-500" /> {t('btn.view')}
             </h4>
             <div className="text-sm text-slate-700">{viewHtml || "Click View to analyze."}</div>
             {analystRating && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-600 flex items-center">
                            <BarChartHorizontal className="w-3 h-3 mr-1" /> Analyst Consensus
                        </span>
                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {analystRating.consensus}
                        </span>
                    </div>
                    <div className="flex items-center gap-0.5 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        {analystRating.buyCount > 0 && <div style={{flex: analystRating.buyCount}} className="bg-emerald-500 h-full" title={`Buy: ${analystRating.buyCount}`}></div>}
                        {analystRating.holdCount > 0 && <div style={{flex: analystRating.holdCount}} className="bg-slate-400 h-full" title={`Hold: ${analystRating.holdCount}`}></div>}
                        {analystRating.sellCount > 0 && <div style={{flex: analystRating.sellCount}} className="bg-rose-500 h-full" title={`Sell: ${analystRating.sellCount}`}></div>}
                    </div>
                    <div className="flex justify-between text--[10px] text-slate-400 mt-1 px-0.5">
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