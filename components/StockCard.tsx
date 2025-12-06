import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Newspaper, 
  TrendingUp, 
  Server, 
  ClipboardList, 
  Layers,
  Loader2,
  LineChart as LineChartIcon,
  Bell,
  BellRing,
  Star,
  Download,
  BrainCircuit,
  PenTool,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  BarChartHorizontal
} from 'lucide-react';
import { StockInfo, LoadingStatus, Source, ChartDataPoint, PriceAlert, AlertType, PredictionData, ChartAnnotation, TechIndicators, AnalystRating, NewsItem } from '../types';
import { GeminiService } from '../services/geminiService';
import StockChart from './StockChart';
import { parsePrice } from '../utils';

interface StockCardProps {
  stock: StockInfo;
  onNotify: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  isWatched: boolean;
  onToggleWatch: (stock: StockInfo) => void;
}

// Helper to get localized sentiment config
const getSentimentConfig = (label: string) => {
  switch (label) {
    case 'positive':
      return { 
        text: '正面', 
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
        bar: 'bg-emerald-500', 
        icon: TrendingUp 
      };
    case 'negative':
      return { 
        text: '負面', 
        color: 'bg-rose-100 text-rose-700 border-rose-200', 
        bar: 'bg-rose-500', 
        icon: (props: any) => <TrendingUp {...props} className={`${props.className} rotate-180`} /> 
      };
    default:
      return { 
        text: '中性', 
        color: 'bg-slate-100 text-slate-700 border-slate-200', 
        bar: 'bg-slate-400', 
        icon: Activity 
      };
  }
};

const StockCard: React.FC<StockCardProps> = ({ stock, onNotify, isWatched, onToggleWatch }) => {
  // States for Price/MA
  const [dataStatus, setDataStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [price, setPrice] = useState<string>('點擊查詢');
  const [ma50, setMa50] = useState<string>('點擊查詢');
  const [volume, setVolume] = useState<string>('---');
  const [techIndicators, setTechIndicators] = useState<TechIndicators>({ rsi: '---', macd: '---' });
  
  // States for Summary & Sentiment
  const [summaryStatus, setSummaryStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [summary, setSummary] = useState<string>('點擊「新聞摘要」按鈕進行分析。');
  const [sentiment, setSentiment] = useState<{label: string, score: number} | null>(null);
  const [summarySources, setSummarySources] = useState<Source[]>([]);
  // New States for Expandable News
  const [showNews, setShowNews] = useState(false);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsStatus, setNewsStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);

  // States for Investment View
  const [viewStatus, setViewStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [viewHtml, setViewHtml] = useState<React.ReactNode>('點擊「投資觀點」按鈕進行分析。');
  const [viewSources, setViewSources] = useState<Source[]>([]);
  const [analystRating, setAnalystRating] = useState<AnalystRating | null>(null);

  // States for Prediction
  const [predictStatus, setPredictStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictSources, setPredictSources] = useState<Source[]>([]);

  // States for Chart
  const [chartStatus, setChartStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartSources, setChartSources] = useState<Source[]>([]);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '3M'>('1M');
  const [showChart, setShowChart] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [newAnnotationPrice, setNewAnnotationPrice] = useState('');

  // States for Alerts
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertConfig, setAlertConfig] = useState<PriceAlert | null>(null);
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [alertTargetValue, setAlertTargetValue] = useState('');

  // Interval Ref for polling
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sentimentConfig = sentiment ? getSentimentConfig(sentiment.label) : null;
  const SentimentIcon = sentimentConfig?.icon;

  // --- Handlers ---

  const checkAlerts = async (currentPriceText: string) => {
    if (!alertConfig || !alertConfig.active) return;

    const currentPrice = parsePrice(currentPriceText);
    if (currentPrice === null) return;

    let triggered = false;
    let message = '';

    if (alertConfig.type === 'above' && currentPrice >= alertConfig.targetValue) {
      triggered = true;
      message = `${stock.symbol} 股價已達到 $${alertConfig.targetValue}`;
    } else if (alertConfig.type === 'below' && currentPrice <= alertConfig.targetValue) {
      triggered = true;
      message = `${stock.symbol} 股價已跌至 $${alertConfig.targetValue}`;
    } else if (alertConfig.type === 'change_pct' || alertConfig.type === 'ma200_cross') {
        // Need advanced data for these, trigger logic inside fetchTechData
        return; 
    }

    if (triggered) {
      onNotify('警報觸發', message, 'alert');
      setAlertConfig({ ...alertConfig, active: false });
    }
  };

  const fetchTechData = async () => {
    if (dataStatus === LoadingStatus.LOADING) return;
    setDataStatus(LoadingStatus.LOADING);
    setPrice('載入中...');
    setMa50('載入中...');
    setVolume('載入中...');
    setTechIndicators({ rsi: '---', macd: '---' });

    try {
      const [pRes, mRes, vRes, tRes] = await Promise.all([
        GeminiService.fetchPrice(stock.queryName),
        GeminiService.fetchMA50(stock.queryName),
        GeminiService.fetchTradingVolume(stock.queryName),
        GeminiService.fetchTechnicalIndicators(stock.queryName)
      ]);
      setPrice(pRes.text);
      setMa50(mRes.text);
      setVolume(vRes.text);
      setTechIndicators(tRes);
      setDataStatus(LoadingStatus.SUCCESS);
      
      // Basic Alerts
      checkAlerts(pRes.text);

      // Advanced Alerts Check (only if configured)
      if (alertConfig?.active && (alertConfig.type === 'change_pct' || alertConfig.type === 'ma200_cross')) {
          try {
             const extData = await GeminiService.fetchExtendedQuote(stock.queryName);
             let triggered = false;
             let msg = '';
             
             if (alertConfig.type === 'change_pct' && Math.abs(extData.changePercent) >= alertConfig.targetValue) {
                 triggered = true;
                 msg = `${stock.symbol} 日漲跌幅達 ${extData.changePercent}% (設定值: ${alertConfig.targetValue}%)`;
             }
             if (alertConfig.type === 'ma200_cross') {
                 // Simple logic: if price is very close to MA200 (within 1%)
                 const diff = Math.abs(extData.price - extData.ma200) / extData.ma200;
                 if (diff < 0.01) {
                     triggered = true;
                     msg = `${stock.symbol} 價格 (${extData.price}) 正在穿越 200 日均線 (${extData.ma200})`;
                 }
             }

             if (triggered) {
                 onNotify('進階警報觸發', msg, 'alert');
                 setAlertConfig({ ...alertConfig, active: false });
             }
          } catch(e) {
              console.error("Advanced alert check failed");
          }
      }

    } catch {
      setPrice('API 錯誤');
      setMa50('API 錯誤');
      setVolume('API 錯誤');
      setDataStatus(LoadingStatus.ERROR);
    }
  };

  const fetchSummary = async () => {
    if (summaryStatus === LoadingStatus.LOADING) return;
    setSummaryStatus(LoadingStatus.LOADING);
    setSummary('AI 正在生成摘要與情緒分析...');
    setSummarySources([]);
    setSentiment(null);

    try {
      const res = await GeminiService.fetchStockSummary(stock.queryName);
      setSummary(res.data.summary);
      setSentiment({ label: res.data.sentiment, score: res.data.score });
      setSummarySources(res.sources);
      setSummaryStatus(LoadingStatus.SUCCESS);
    } catch {
      setSummary('摘要 API 錯誤或網路問題。');
      setSummaryStatus(LoadingStatus.ERROR);
    }
  };

  const toggleNews = async () => {
      const newShowNews = !showNews;
      setShowNews(newShowNews);
      
      if (newShowNews && newsList.length === 0 && newsStatus !== LoadingStatus.LOADING) {
          setNewsStatus(LoadingStatus.LOADING);
          try {
              const res = await GeminiService.fetchCompanyNews(stock.queryName);
              setNewsList(res.news);
              setNewsStatus(LoadingStatus.SUCCESS);
          } catch (e) {
              setNewsStatus(LoadingStatus.ERROR);
          }
      }
  };

  const fetchPrediction = async () => {
      if (predictStatus === LoadingStatus.LOADING) return;
      setPredictStatus(LoadingStatus.LOADING);
      setPrediction(null);
      setPredictSources([]);

      try {
          const res = await GeminiService.fetchPricePrediction(stock.queryName);
          setPrediction(res.data);
          setPredictSources(res.sources);
          setPredictStatus(LoadingStatus.SUCCESS);
      } catch {
          setPredictStatus(LoadingStatus.ERROR);
      }
  };

  const fetchView = async () => {
    if (viewStatus === LoadingStatus.LOADING) return;
    setViewStatus(LoadingStatus.LOADING);
    setViewHtml('AI 正在生成觀點...'); 
    setViewSources([]);
    setAnalystRating(null);

    try {
      const [res, rating] = await Promise.all([
          GeminiService.fetchInvestmentView(stock.queryName),
          GeminiService.fetchAnalystRatings(stock.queryName)
      ]);
      
      const formattedView = formatViewContent(res.text);
      setViewHtml(formattedView);
      setViewSources(res.sources);
      setAnalystRating(rating);
      setViewStatus(LoadingStatus.SUCCESS);
    } catch {
      setViewHtml('觀點 API 錯誤或網路問題。');
      setViewStatus(LoadingStatus.ERROR);
    }
  };

  const fetchChart = async (range: '1D' | '1W' | '1M' | '3M', isAutoUpdate = false) => {
    setChartRange(range);
    if (!isAutoUpdate) {
        setChartStatus(LoadingStatus.LOADING);
    }
    
    try {
      const res = await GeminiService.fetchStockHistory(stock.queryName, range);
      setChartData(res.data);
      setChartSources(res.sources);
      setChartStatus(LoadingStatus.SUCCESS);
      
      if (res.data.length > 0) {
          const lastPoint = res.data[res.data.length - 1];
          checkAlerts(lastPoint.price.toString());
      }
    } catch {
        if (!isAutoUpdate) {
            setChartStatus(LoadingStatus.ERROR);
        }
    }
  };

  const toggleChart = () => {
    if (!showChart) {
      setShowChart(true);
      fetchChart('1M'); 
    } else {
      setShowChart(false);
    }
  };

  const handleExportCSV = () => {
    if (chartData.length === 0) return;
    const headers = ['Date/Time', 'Price'];
    const rows = chartData.map(pt => `"${pt.time}",${pt.price}`);
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stock.symbol}_price_history_${chartRange}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('匯出成功', `已下載 ${stock.symbol} 的歷史價格數據`, 'success');
  };

  const addAnnotation = () => {
      const val = parseFloat(newAnnotationPrice);
      if (!isNaN(val)) {
          setAnnotations([...annotations, {
              id: Date.now().toString(),
              type: 'line',
              yAxisValue: val,
              label: `Level: ${val}`,
              color: '#3b82f6'
          }]);
          setNewAnnotationPrice('');
          setShowAnnotationInput(false);
      }
  };

  const clearAnnotations = () => setAnnotations([]);

  // --- Effects ---

  useEffect(() => {
    if (showChart) {
        chartIntervalRef.current = setInterval(() => {
            fetchChart(chartRange, true);
        }, 60000);
    } else {
        if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
    }
    return () => {
        if (chartIntervalRef.current) clearInterval(chartIntervalRef.current);
    };
  }, [showChart, chartRange]);

  // --- Alert Logic ---
  
  const handleSaveAlert = () => {
      const target = parseFloat(alertTargetValue);
      // For boolean checks like MA Cross, target might be 0/ignored
      if (alertType !== 'ma200_cross' && isNaN(target)) {
          onNotify('輸入錯誤', '請輸入有效的數字', 'info');
          return;
      }

      setAlertConfig({
          targetValue: target,
          active: true,
          type: alertType
      });
      setShowAlertInput(false);
      onNotify('警報已設定', `警報類型: ${alertType} 設定成功`, 'success');
  };

  const clearAlert = () => {
      setAlertConfig(null);
      setAlertTargetValue('');
      onNotify('警報已移除', '該股票的價格警報已取消', 'info');
  };

  // --- Render Helpers ---

  const formatViewContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let inList = false;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        if (inList && listItems.length > 0) {
          elements.push(<ul key={`list-${idx}`} className="list-none pl-0 mt-2 space-y-1">{listItems}</ul>);
          listItems = [];
          inList = false;
        }
        const content = trimmed.replace(/\*\*/g, '');
        let colorClass = 'text-slate-700';
        if (content.includes('正面')) colorClass = 'text-emerald-600';
        else if (content.includes('負面')) colorClass = 'text-rose-600';
        elements.push(<strong key={`header-${idx}`} className={`${colorClass} block mt-3 mb-1 text-sm`}>{content}</strong>);
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
         inList = true;
         listItems.push(<li key={`li-${idx}`} className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-teal-500 before:font-bold">{trimmed.substring(1).trim()}</li>);
      } else {
        if (inList && listItems.length > 0) {
           elements.push(<ul key={`list-${idx}`} className="list-none pl-0 mt-2 space-y-1">{listItems}</ul>);
           listItems = [];
           inList = false;
        }
        elements.push(<p key={`p-${idx}`} className="mt-1">{trimmed}</p>);
      }
    });
    if (inList && listItems.length > 0) elements.push(<ul key={`list-end`} className="list-none pl-0 mt-2 space-y-1">{listItems}</ul>);
    return <div>{elements}</div>;
  };

  const getPriceColor = (val: string) => {
    if (val.includes('+')) return 'text-emerald-500';
    if (val.includes('-')) return 'text-red-500';
    return 'text-slate-700';
  };

  const renderSources = (sources: Source[]) => {
    if (sources.length === 0) return null;
    return (
      <div className="mt-2 text-xs text-slate-500 border-t border-slate-200 pt-1">
        來源: {sources.map((s, i) => (
          <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline mr-2">{s.title}</a>
        ))}
      </div>
    );
  };

  // Determine MA50 color
  const priceNum = parsePrice(price);
  const ma50Num = parsePrice(ma50);
  let maColor = 'text-slate-700';
  if (priceNum !== null && ma50Num !== null) {
      if (priceNum > ma50Num) maColor = 'text-emerald-600 font-bold';
      else if (priceNum < ma50Num) maColor = 'text-rose-600 font-bold';
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col border-l-[5px] border-cyan-500 hover:shadow-xl hover:scale-[1.002] transition-all duration-300 relative">
      
      {/* Top Right Actions */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
          <button
            onClick={() => onToggleWatch(stock)}
            className={`p-2 rounded-full transition-colors ${isWatched ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-yellow-500'}`}
            title={isWatched ? "從觀察名單移除" : "加入觀察名單"}
          >
            <Star className={`w-5 h-5 ${isWatched ? 'fill-current' : ''}`} />
          </button>

          <div className="relative">
              <button 
                 onClick={() => setShowAlertInput(!showAlertInput)}
                 className={`p-2 rounded-full transition-colors ${alertConfig?.active ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-sky-600'}`}
                 title="設定價格警報"
              >
                 {alertConfig?.active ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </button>
              
              {/* Advanced Alert Popover */}
              {showAlertInput && (
                  <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-72 z-20 animate-fade-in-down">
                      <h5 className="text-sm font-bold text-slate-700 mb-2">設定進階警報</h5>
                      
                      <div className="mb-2">
                          <label className="text-xs text-slate-500 block mb-1">條件類型</label>
                          <select 
                            value={alertType} 
                            onChange={(e) => setAlertType(e.target.value as AlertType)}
                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-sky-500"
                          >
                              <option value="above">價格高於 (Target Price)</option>
                              <option value="below">價格低於 (Target Price)</option>
                              <option value="change_pct">日漲跌幅 &gt; X%</option>
                              <option value="ma200_cross">穿越 200 日均線</option>
                          </select>
                      </div>

                      {alertType !== 'ma200_cross' && (
                          <div className="flex items-center mb-2">
                              <span className="text-slate-500 mr-2 text-xs">{alertType === 'change_pct' ? '%' : '$'}</span>
                              <input 
                                type="number" 
                                value={alertTargetValue}
                                onChange={(e) => setAlertTargetValue(e.target.value)}
                                placeholder="數值"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 outline-none"
                              />
                          </div>
                      )}

                      <div className="flex space-x-2">
                          <button onClick={handleSaveAlert} className="bg-sky-600 text-white text-xs py-1 px-3 rounded hover:bg-sky-700 flex-1">儲存</button>
                          {alertConfig && <button onClick={clearAlert} className="bg-red-50 text-red-600 text-xs py-1 px-3 rounded hover:bg-red-100">移除</button>}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Row 1: Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-3 border-slate-100 pr-24">
        <div className="mb-3 sm:mb-0">
          <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">{stock.name}</p>
              {isWatched && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">已追蹤</span>}
          </div>
          <span className="text-sm text-slate-500">{stock.description}</span>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <ActionButton onClick={fetchTechData} loading={dataStatus === LoadingStatus.LOADING} icon={<Activity className="w-4 h-4 mr-1" />} label="數據" colorClass="bg-sky-600 hover:bg-sky-700" />
          <ActionButton onClick={fetchSummary} loading={summaryStatus === LoadingStatus.LOADING} icon={<Newspaper className="w-4 h-4 mr-1" />} label="摘要" colorClass="bg-teal-600 hover:bg-teal-700" />
          <ActionButton onClick={fetchView} loading={viewStatus === LoadingStatus.LOADING} icon={<TrendingUp className="w-4 h-4 mr-1" />} label="觀點" colorClass="bg-slate-600 hover:bg-slate-700" />
          <ActionButton onClick={toggleChart} loading={false} icon={<LineChartIcon className="w-4 h-4 mr-1" />} label={showChart ? "隱藏" : "圖表"} colorClass="bg-indigo-600 hover:bg-indigo-700" />
        </div>
      </div>

      {/* Optional Row: Chart */}
      {showChart && (
        <div className="mb-6 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm animate-fade-in relative">
           <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h4 className="text-base font-semibold text-indigo-800 flex items-center">
                 <LineChartIcon className="w-5 h-5 mr-2" /> 價格走勢 
              </h4>
              <div className="flex items-center gap-2">
                <div className="relative">
                    <button onClick={() => setShowAnnotationInput(!showAnnotationInput)} className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded" title="新增支撐/壓力線">
                        <PenTool className="w-4 h-4" />
                    </button>
                     {showAnnotationInput && (
                        <div className="absolute top-8 right-0 bg-white border shadow-md p-2 rounded z-20 flex gap-1 w-48">
                            <input type="number" value={newAnnotationPrice} onChange={e => setNewAnnotationPrice(e.target.value)} placeholder="價格" className="w-20 border rounded px-1 text-xs"/>
                            <button onClick={addAnnotation} className="bg-indigo-600 text-white text-xs px-2 rounded">Add</button>
                        </div>
                    )}
                </div>
                {annotations.length > 0 && (
                    <button onClick={clearAnnotations} className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded" title="清除標記">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                <button onClick={handleExportCSV} className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded" title="匯出 CSV">
                   <Download className="w-4 h-4" />
                </button>
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
                    {(['1D', '1W', '1M', '3M'] as const).map((r) => (
                    <button key={r} onClick={() => fetchChart(r)} className={`px-2 py-1 text-xs font-medium rounded ${chartRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>
                        {r}
                    </button>
                    ))}
                </div>
              </div>
           </div>
           
           {chartStatus === LoadingStatus.LOADING && chartData.length === 0 ? (
             <div className="h-64 flex items-center justify-center text-indigo-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
           ) : chartStatus === LoadingStatus.ERROR ? (
             <div className="h-64 flex items-center justify-center text-red-400">無法載入圖表數據</div>
           ) : (
             <StockChart data={chartData} annotations={annotations} />
           )}
           {renderSources(chartSources)}
        </div>
      )}

      {/* Row 2: Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Data Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
          <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <Server className="w-4 h-4 mr-1 text-sky-500" /> 即時數據
          </h4>
          <div className="text-sm text-slate-700 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600">最新價位:</span>
              <span className={`text-xl font-extrabold ${getPriceColor(price)}`}>{price}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-500">50 天線 (MA50):</span>
              <span className={`text-base ${maColor}`}>{ma50}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-500">交易量:</span>
              <span className="text-base font-medium text-slate-700">{volume}</span>
            </div>
            
            {/* New Indicators */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-500">RSI (14):</span>
              <span className="text-base font-medium text-slate-700">{techIndicators.rsi}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-500">MACD:</span>
              <span className="text-xs font-medium text-slate-700 max-w-[50%] text-right">{techIndicators.macd}</span>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-slate-200">
                <button 
                  onClick={fetchPrediction} 
                  disabled={predictStatus === LoadingStatus.LOADING}
                  className="w-full bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs py-2 rounded flex items-center justify-center font-bold transition-colors mb-2"
                >
                    {predictStatus === LoadingStatus.LOADING ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <BrainCircuit className="w-3 h-3 mr-1"/>}
                    AI 價格預測 (7日)
                </button>
                {prediction && (
                    <div className="bg-white p-3 rounded border border-violet-100 text-xs shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center text-violet-800 font-bold">
                                <Target className="w-4 h-4 mr-1" />
                                目標價: ${prediction.predictedPrice}
                            </div>
                        </div>
                        
                        <div className="mb-2">
                            <div className="flex justify-between mb-1">
                                <span className="text-slate-500">AI 信心分數:</span>
                                <span className="font-bold text-violet-600">{prediction.confidenceScore}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-violet-300 to-violet-600 transition-all duration-700" 
                                    style={{ width: `${prediction.confidenceScore}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-slate-600 leading-tight mt-1 border-t border-slate-100 pt-1 italic">{prediction.reasoning}</p>
                        <div className="mt-1 text-[10px] text-slate-400 text-right flex items-center justify-end">
                             <span className="bg-slate-100 px-1 rounded">僅供參考</span>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Summary Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-2 flex flex-col">
           <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-2">
                <h4 className="text-base font-semibold text-slate-700 flex items-center">
                    <ClipboardList className="w-4 h-4 mr-1 text-teal-500" /> AI 市場摘要
                </h4>
                
                {sentiment && sentimentConfig && SentimentIcon && (
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center px-2 py-1 rounded-full border ${sentimentConfig.color} shadow-sm`}>
                            <SentimentIcon className="w-3 h-3 mr-1.5" />
                            <span className="text-xs font-bold">{sentimentConfig.text}</span>
                        </div>
                        <div className="flex items-center mt-1.5 gap-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">情緒指數</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${sentimentConfig.bar} transition-all duration-500`} 
                                    style={{ width: `${sentiment.score}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold w-5 text-right">{sentiment.score}</span>
                        </div>
                    </div>
                )}
           </div>
           
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {summary}
          </div>
          
          {/* Expandable News Section */}
          <div className="mt-auto pt-3">
             <div className="flex justify-between items-center">
                 {renderSources(summarySources)}
                 <button 
                    onClick={toggleNews}
                    className="flex items-center text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                 >
                    {showNews ? '隱藏' : '顯示更多'}
                    {showNews ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                 </button>
             </div>
             
             {showNews && (
                 <div className="mt-3 border-t border-slate-200 pt-3 animate-fade-in">
                     <h5 className="text-xs font-bold text-slate-500 mb-2">延伸閱讀 (最新新聞)</h5>
                     {newsStatus === LoadingStatus.LOADING ? (
                         <div className="flex justify-center py-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /></div>
                     ) : newsList.length > 0 ? (
                         <ul className="space-y-2">
                             {newsList.map((item, idx) => (
                                 <li key={idx} className="text-xs flex flex-col bg-white p-2 rounded border border-slate-100 hover:border-teal-200 transition-colors">
                                     <a href={item.link} target="_blank" rel="noreferrer" className="font-medium text-slate-700 hover:text-teal-600 flex items-start">
                                        <ExternalLink className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0 text-slate-400" />
                                        {item.title}
                                     </a>
                                     <div className="flex justify-between mt-1 pl-5 text-[10px] text-slate-400">
                                         <span>{item.source}</span>
                                         <span>{item.date}</span>
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                         <p className="text-xs text-slate-400">暫無更多新聞</p>
                     )}
                 </div>
             )}
          </div>
        </div>

        {/* Investment View Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-3">
          <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <Layers className="w-4 h-4 mr-1 text-slate-500" /> AI 投資觀點 (Pros & Cons)
          </h4>
          <div className="text-sm text-slate-700">
             {typeof viewHtml === 'string' ? viewHtml : viewHtml}
          </div>
          
          {/* Analyst Ratings Section */}
          {analystRating && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                  <h5 className="text-sm font-bold text-slate-600 mb-3 flex items-center">
                      <BarChartHorizontal className="w-4 h-4 mr-2" /> 分析師評級共識: <span className="ml-2 px-2 py-0.5 bg-slate-800 text-white rounded text-xs">{analystRating.consensus}</span>
                  </h5>
                  <div className="flex items-center gap-1 h-6 w-full max-w-md rounded-full overflow-hidden bg-slate-100">
                      {analystRating.buyCount > 0 && (
                          <div className="h-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold" style={{ flex: analystRating.buyCount }}>
                              Buy {analystRating.buyCount}
                          </div>
                      )}
                      {analystRating.holdCount > 0 && (
                          <div className="h-full bg-slate-400 flex items-center justify-center text-[10px] text-white font-bold" style={{ flex: analystRating.holdCount }}>
                              Hold {analystRating.holdCount}
                          </div>
                      )}
                      {analystRating.sellCount > 0 && (
                          <div className="h-full bg-rose-500 flex items-center justify-center text-[10px] text-white font-bold" style={{ flex: analystRating.sellCount }}>
                              Sell {analystRating.sellCount}
                          </div>
                      )}
                  </div>
              </div>
          )}
          
          {renderSources(viewSources)}
        </div>
      </div>
    </div>
  );
};

// Helper sub-component for buttons
const ActionButton = ({ onClick, loading, icon, label, colorClass }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`${colorClass} text-white font-medium py-2 px-3 rounded-lg shadow-md transition duration-200 flex items-center justify-center text-sm whitespace-nowrap disabled:opacity-75 disabled:cursor-not-allowed`}
  >
    {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : icon}
    {loading ? '分析中...' : label}
  </button>
);

export default StockCard;