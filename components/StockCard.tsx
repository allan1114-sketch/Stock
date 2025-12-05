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
  Download
} from 'lucide-react';
import { StockInfo, LoadingStatus, Source, ChartDataPoint, PriceAlert } from '../types';
import { GeminiService } from '../services/geminiService';
import StockChart from './StockChart';
import { parsePrice } from '../utils';

interface StockCardProps {
  stock: StockInfo;
  onNotify: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
  isWatched: boolean;
  onToggleWatch: (stock: StockInfo) => void;
}

const StockCard: React.FC<StockCardProps> = ({ stock, onNotify, isWatched, onToggleWatch }) => {
  // States for Price/MA
  const [dataStatus, setDataStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [price, setPrice] = useState<string>('點擊查詢');
  const [ma50, setMa50] = useState<string>('點擊查詢');
  
  // States for Summary
  const [summaryStatus, setSummaryStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [summary, setSummary] = useState<string>('點擊「新聞摘要」按鈕進行分析。');
  const [summarySources, setSummarySources] = useState<Source[]>([]);

  // States for Investment View
  const [viewStatus, setViewStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [viewHtml, setViewHtml] = useState<React.ReactNode>('點擊「投資觀點」按鈕進行分析。');
  const [viewSources, setViewSources] = useState<Source[]>([]);

  // States for Chart
  const [chartStatus, setChartStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartSources, setChartSources] = useState<Source[]>([]);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | '3M'>('1M');
  const [showChart, setShowChart] = useState<boolean>(false);

  // States for Alerts
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertConfig, setAlertConfig] = useState<PriceAlert | null>(null);
  const [inputPrice, setInputPrice] = useState('');

  // Interval Ref for polling
  const chartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Handlers ---

  const checkPriceAlert = (priceInput: string | number) => {
    if (!alertConfig || !alertConfig.active) return;

    let currentPrice: number | null = null;
    if (typeof priceInput === 'number') {
        currentPrice = priceInput;
    } else {
        currentPrice = parsePrice(priceInput);
    }
    
    if (currentPrice === null) return;

    let triggered = false;
    let message = '';

    if (alertConfig.type === 'above' && currentPrice >= alertConfig.targetPrice) {
      triggered = true;
      message = `${stock.symbol} 股價已達到或超過目標 $${alertConfig.targetPrice} (目前: ${currentPrice})`;
    } else if (alertConfig.type === 'below' && currentPrice <= alertConfig.targetPrice) {
      triggered = true;
      message = `${stock.symbol} 股價已跌至或低於目標 $${alertConfig.targetPrice} (目前: ${currentPrice})`;
    }

    if (triggered) {
      onNotify('股價警報觸發', message, 'alert');
      // Optional: deactivate alert after trigger so it doesn't spam
      setAlertConfig({ ...alertConfig, active: false });
    }
  };

  const fetchTechData = async () => {
    if (dataStatus === LoadingStatus.LOADING) return;
    setDataStatus(LoadingStatus.LOADING);
    setPrice('載入中...');
    setMa50('載入中...');

    try {
      const [pRes, mRes] = await Promise.all([
        GeminiService.fetchPrice(stock.queryName),
        GeminiService.fetchMA50(stock.queryName)
      ]);
      setPrice(pRes.text);
      setMa50(mRes.text);
      setDataStatus(LoadingStatus.SUCCESS);
      
      // Check alerts whenever price updates
      checkPriceAlert(pRes.text);

    } catch {
      setPrice('API 錯誤');
      setMa50('API 錯誤');
      setDataStatus(LoadingStatus.ERROR);
    }
  };

  const fetchSummary = async () => {
    if (summaryStatus === LoadingStatus.LOADING) return;
    setSummaryStatus(LoadingStatus.LOADING);
    setSummary('AI 正在生成摘要...');
    setSummarySources([]);

    try {
      const res = await GeminiService.fetchStockSummary(stock.queryName);
      setSummary(res.text);
      setSummarySources(res.sources);
      setSummaryStatus(LoadingStatus.SUCCESS);
    } catch {
      setSummary('摘要 API 錯誤或網路問題。');
      setSummaryStatus(LoadingStatus.ERROR);
    }
  };

  const fetchView = async () => {
    if (viewStatus === LoadingStatus.LOADING) return;
    setViewStatus(LoadingStatus.LOADING);
    setViewHtml('AI 正在生成觀點...'); 
    setViewSources([]);

    try {
      const res = await GeminiService.fetchInvestmentView(stock.queryName);
      const formattedView = formatViewContent(res.text);
      setViewHtml(formattedView);
      setViewSources(res.sources);
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
      
      // If we have recent data, we can also try to parse the latest point for alerts
      if (res.data.length > 0) {
          const lastPoint = res.data[res.data.length - 1];
          checkPriceAlert(lastPoint.price);
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
    
    // Create CSV content
    const headers = ['Date/Time', 'Price'];
    const rows = chartData.map(pt => `"${pt.time}",${pt.price}`);
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stock.symbol}_price_history_${chartRange}.csv`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onNotify('匯出成功', `已下載 ${stock.symbol} 的歷史價格數據`, 'success');
  };

  // --- Effects ---

  // Polling for Chart Data when Chart is visible
  useEffect(() => {
    if (showChart) {
        // Fetch every 60 seconds to simulate real-time updates
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
      const target = parseFloat(inputPrice);
      if (isNaN(target)) {
          onNotify('輸入錯誤', '請輸入有效的數字價格', 'info');
          return;
      }

      // Determine if we are setting an "Above" or "Below" alert based on current context
      // Since we might not have current price, we'll infer or default. 
      // If user sets target > current (if available), it's "Above".
      
      const currentP = parsePrice(price);
      let type: 'above' | 'below' = 'above';
      
      if (currentP !== null) {
          type = target > currentP ? 'above' : 'below';
      }

      setAlertConfig({
          targetPrice: target,
          active: true,
          type
      });
      setShowAlertInput(false);
      onNotify('警報已設定', `當 ${stock.symbol} 價格${type === 'above' ? '超過' : '低於'} $${target} 時將通知您`, 'success');
  };

  const clearAlert = () => {
      setAlertConfig(null);
      setInputPrice('');
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
          elements.push(
            <ul key={`list-${idx}`} className="list-none pl-0 mt-2 space-y-1">
              {listItems}
            </ul>
          );
          listItems = [];
          inList = false;
        }

        const content = trimmed.replace(/\*\*/g, '');
        let colorClass = 'text-slate-700';
        if (content.includes('正面')) colorClass = 'text-emerald-600';
        else if (content.includes('負面')) colorClass = 'text-rose-600';

        elements.push(
          <strong key={`header-${idx}`} className={`${colorClass} block mt-3 mb-1 text-sm`}>
            {content}
          </strong>
        );
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
         inList = true;
         const content = trimmed.substring(1).trim();
         listItems.push(
           <li key={`li-${idx}`} className="relative pl-5 before:content-['•'] before:absolute before:left-0 before:text-teal-500 before:font-bold">
             {content}
           </li>
         );
      } else {
        if (inList && listItems.length > 0) {
           elements.push(
             <ul key={`list-${idx}`} className="list-none pl-0 mt-2 space-y-1">
               {listItems}
             </ul>
           );
           listItems = [];
           inList = false;
        }
        elements.push(<p key={`p-${idx}`} className="mt-1">{trimmed}</p>);
      }
    });

    if (inList && listItems.length > 0) {
       elements.push(
         <ul key={`list-end`} className="list-none pl-0 mt-2 space-y-1">
           {listItems}
         </ul>
       );
    }

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
          <a 
            key={i} 
            href={s.uri} 
            target="_blank" 
            rel="noreferrer" 
            className="text-sky-500 hover:underline mr-2"
          >
            {s.title}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-lg flex flex-col border-l-[5px] border-cyan-500 hover:shadow-xl hover:scale-[1.002] transition-all duration-300 relative">
      
      {/* Top Right Actions */}
      <div className="absolute top-5 right-5 z-10 flex gap-2">
          {/* Watchlist Toggle */}
          <button
            onClick={() => onToggleWatch(stock)}
            className={`p-2 rounded-full transition-colors ${isWatched ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-yellow-500'}`}
            title={isWatched ? "從觀察名單移除" : "加入觀察名單"}
          >
            <Star className={`w-5 h-5 ${isWatched ? 'fill-current' : ''}`} />
          </button>

          {/* Alert Indicator / Popup */}
          <div className="relative">
              <button 
                 onClick={() => setShowAlertInput(!showAlertInput)}
                 className={`p-2 rounded-full transition-colors ${alertConfig?.active ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-sky-600'}`}
                 title="設定價格警報"
              >
                 {alertConfig?.active ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </button>
              
              {/* Alert Config Popover */}
              {showAlertInput && (
                  <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 z-20 animate-fade-in-down">
                      <h5 className="text-sm font-bold text-slate-700 mb-2">設定價格警報</h5>
                      <div className="flex items-center mb-2">
                          <span className="text-slate-500 mr-2">$</span>
                          <input 
                            type="number" 
                            value={inputPrice}
                            onChange={(e) => setInputPrice(e.target.value)}
                            placeholder="目標價格"
                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:border-sky-500 outline-none"
                          />
                      </div>
                      <div className="flex space-x-2">
                          <button 
                            onClick={handleSaveAlert}
                            className="bg-sky-600 text-white text-xs py-1 px-3 rounded hover:bg-sky-700 flex-1"
                          >
                              儲存
                          </button>
                          {alertConfig && (
                               <button 
                               onClick={clearAlert}
                               className="bg-red-50 text-red-600 text-xs py-1 px-3 rounded hover:bg-red-100"
                             >
                                 移除
                             </button>
                          )}
                      </div>
                      {alertConfig && (
                          <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-1 rounded">
                              當前目標: ${alertConfig.targetPrice}
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* Row 1: Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-3 border-slate-100 pr-24">
        <div className="mb-3 sm:mb-0">
          <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900">{stock.name}</p>
              {isWatched && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center border border-yellow-200">
                      <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                      已追蹤
                  </span>
              )}
          </div>
          <span className="text-sm text-slate-500">{stock.description}</span>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <ActionButton 
            onClick={fetchTechData} 
            loading={dataStatus === LoadingStatus.LOADING}
            icon={<Activity className="w-4 h-4 mr-1" />}
            label="技術數據"
            colorClass="bg-sky-600 hover:bg-sky-700"
          />
          <ActionButton 
            onClick={fetchSummary} 
            loading={summaryStatus === LoadingStatus.LOADING}
            icon={<Newspaper className="w-4 h-4 mr-1" />}
            label="新聞摘要"
            colorClass="bg-teal-600 hover:bg-teal-700"
          />
          <ActionButton 
            onClick={fetchView} 
            loading={viewStatus === LoadingStatus.LOADING}
            icon={<TrendingUp className="w-4 h-4 mr-1" />}
            label="投資觀點"
            colorClass="bg-slate-600 hover:bg-slate-700"
          />
           <ActionButton 
            onClick={toggleChart} 
            loading={false}
            icon={<LineChartIcon className="w-4 h-4 mr-1" />}
            label={showChart ? "隱藏圖表" : "走勢圖表"}
            colorClass="bg-indigo-600 hover:bg-indigo-700"
          />
        </div>
      </div>

      {/* Optional Row: Chart */}
      {showChart && (
        <div className="mb-6 bg-white p-4 rounded-lg border border-indigo-100 shadow-sm animate-fade-in">
           <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-semibold text-indigo-800 flex items-center">
                 <LineChartIcon className="w-5 h-5 mr-2" /> 
                 價格走勢 
                 <span className="ml-2 text-xs font-normal text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                    即時更新 (每分鐘)
                 </span>
              </h4>
              <div className="flex items-center gap-2">
                {/* CSV Export Button */}
                {chartData.length > 0 && (
                     <button 
                        onClick={handleExportCSV}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center"
                        title="匯出 CSV"
                     >
                        <Download className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">CSV</span>
                     </button>
                 )}
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
                    {(['1D', '1W', '1M', '3M'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => fetchChart(r)}
                        className={`px-3 py-1 text-xs font-medium rounded ${chartRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                        {r}
                    </button>
                    ))}
                </div>
              </div>
           </div>
           
           {chartStatus === LoadingStatus.LOADING && chartData.length === 0 ? (
             <div className="h-64 flex items-center justify-center text-indigo-400">
               <Loader2 className="w-8 h-8 animate-spin" />
             </div>
           ) : chartStatus === LoadingStatus.ERROR ? (
             <div className="h-64 flex items-center justify-center text-red-400">
               無法載入圖表數據
             </div>
           ) : (
             <StockChart data={chartData} />
           )}
           {renderSources(chartSources)}
        </div>
      )}

      {/* Row 2: Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Data Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
          <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <Server className="w-4 h-4 mr-1 text-sky-500" /> 即時數據 (Price & MA)
          </h4>
          <div className="text-sm text-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-slate-600">最新價位:</span>
              <span className={`text-xl font-extrabold ${getPriceColor(price)}`}>{price}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="font-medium text-slate-500">50 天線 (MA50):</span>
              <span className="text-base font-semibold text-slate-700">{ma50}</span>
            </div>
          </div>
        </div>

        {/* Summary Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-2">
           <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <ClipboardList className="w-4 h-4 mr-1 text-teal-500" /> AI 市場摘要 (Summary)
          </h4>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">
            {summary}
          </div>
          {renderSources(summarySources)}
        </div>

        {/* Investment View Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner md:col-span-3">
          <h4 className="text-base font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center">
            <Layers className="w-4 h-4 mr-1 text-slate-500" /> AI 投資觀點 (Pros & Cons)
          </h4>
          <div className="text-sm text-slate-700">
             {typeof viewHtml === 'string' ? viewHtml : viewHtml}
          </div>
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