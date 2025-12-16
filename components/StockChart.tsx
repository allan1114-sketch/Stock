import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Label,
  ComposedChart,
  Bar,
  Line
} from 'recharts';
import { ChartDataPoint, ChartAnnotation } from '../types';
import { CandlestickChart, LineChart } from 'lucide-react';

interface StockChartProps {
  data: ChartDataPoint[];
  color?: string;
  annotations?: ChartAnnotation[];
}

// Custom shape for Candlestick
const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload, yAxis } = props;
  const { open, close, high, low } = payload;
  
  // Guard against missing data
  if (open == null || close == null || high == null || low == null) return null;

  const isRising = close >= open;
  const color = isRising ? '#10b981' : '#ef4444'; // Emerald for up, Red for down
  
  // Calculate coordinates using the Y-axis scale
  const yHigh = yAxis.scale(high);
  const yLow = yAxis.scale(low);
  const yOpen = yAxis.scale(open);
  const yClose = yAxis.scale(close);
  
  const bodyTop = Math.min(yOpen, yClose);
  let bodyHeight = Math.abs(yOpen - yClose);
  
  // Ensure we can see the body even if open === close (Doji)
  if (bodyHeight < 1) bodyHeight = 1;

  // Center the wick
  const wickX = x + width / 2;
  
  return (
    <g stroke={color} fill={color} strokeWidth="1.5">
      {/* Wick */}
      <path d={`M ${wickX},${yHigh} L ${wickX},${yLow}`} />
      {/* Body */}
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={color}
      />
    </g>
  );
};

const StockChart: React.FC<StockChartProps> = ({ data, color = "#0ea5e9", annotations = [] }) => {
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');

  // Safe check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-400">
        無數據顯示
      </div>
    );
  }

  // Calculate domain for better visual scaling
  const allValues = chartType === 'candle' 
    ? data.flatMap(d => [d.high || d.price, d.low || d.price])
    : data.map(d => d.price);
    
  const minPrice = Math.min(...allValues);
  const maxPrice = Math.max(...allValues);
  const padding = (maxPrice - minPrice) * 0.1;

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      // Calculate change stats if OHLC is present
      const hasOHLC = d.open != null && d.close != null;
      const change = hasOHLC ? d.close - d.open : 0;
      const changePct = hasOHLC && d.open !== 0 ? (change / d.open) * 100 : 0;
      const isUp = change >= 0;
      const colorClass = isUp ? 'text-emerald-600' : 'text-rose-600';

      return (
        <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-200 shadow-xl rounded-lg min-w-[160px] z-50 text-xs font-sans">
          <p className="text-slate-500 font-bold mb-2 border-b border-slate-100 pb-1">{label}</p>
          
          {chartType === 'area' ? (
             <div className="flex items-baseline justify-between gap-4">
                <span className="text-slate-400 font-medium">Price</span>
                <span className="text-sky-700 font-bold text-lg font-mono">
                  {d.price.toFixed(2)}
                </span>
             </div>
          ) : (
             <div className="space-y-2">
               <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                 <div className="flex justify-between items-center"><span className="text-slate-400">Open</span> <span className="font-mono text-slate-700">{d.open?.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-400">High</span> <span className="font-mono text-slate-700">{d.high?.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-400">Low</span> <span className="font-mono text-slate-700">{d.low?.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-400">Close</span> <span className={`font-mono font-bold ${colorClass}`}>{d.close?.toFixed(2)}</span></div>
               </div>
               
               {hasOHLC && (
                   <div className={`pt-2 border-t border-slate-100 flex justify-between items-center font-bold ${colorClass}`}>
                       <span>Change</span>
                       <span>{change > 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)</span>
                   </div>
               )}
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80 w-full bg-white p-2 rounded-lg relative group">
      {/* Chart Type Toggle */}
      <div className="absolute top-2 right-4 z-10 flex bg-slate-100/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-200 opacity-60 group-hover:opacity-100 transition-opacity">
        <button 
           onClick={() => setChartType('area')}
           className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white shadow-sm text-sky-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
           title="Line / Area View"
        >
           <LineChart className="w-4 h-4" />
        </button>
        <button 
           onClick={() => setChartType('candle')}
           className={`p-1.5 rounded-md transition-all ${chartType === 'candle' ? 'bg-white shadow-sm text-sky-600 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
           title="Candlestick View"
        >
           <CandlestickChart className="w-4 h-4" />
        </button>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={35} />
            <YAxis domain={[minPrice - padding, maxPrice + padding]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => val.toFixed(0)} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" animationDuration={500} />
            {annotations.map((ann) => (
              <ReferenceLine key={ann.id} y={ann.yAxisValue} stroke={ann.color || "#ef4444"} strokeDasharray="4 4">
                <Label value={ann.label} position="insideTopLeft" fill={ann.color || "#ef4444"} fontSize={10} />
              </ReferenceLine>
            ))}
            <Brush 
                dataKey="time" 
                height={24} 
                stroke="#94a3b8" 
                fill="#f8fafc"
                travellerWidth={12}
                tickFormatter={() => ''}
                alwaysShowText={false} 
            />
          </AreaChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
             <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={35} />
             <YAxis domain={[minPrice - padding, maxPrice + padding]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => val.toFixed(0)} />
             <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
             
             {/* Invisible Bars to ensure axis scaling covers the full range of High/Low */}
             <Bar dataKey="high" fillOpacity={0} isAnimationActive={false} />
             <Bar dataKey="low" fillOpacity={0} isAnimationActive={false} />
             
             {/* The actual Candle Shape */}
             <Bar 
               dataKey="close" 
               shape={<CandleStickShape />} 
               animationDuration={500}
             />
             
             {annotations.map((ann) => (
               <ReferenceLine key={ann.id} y={ann.yAxisValue} stroke={ann.color || "#ef4444"} strokeDasharray="4 4">
                 <Label value={ann.label} position="insideTopLeft" fill={ann.color || "#ef4444"} fontSize={10} />
               </ReferenceLine>
             ))}
             <Brush 
                dataKey="time" 
                height={24} 
                stroke="#94a3b8" 
                fill="#f8fafc"
                travellerWidth={12}
                tickFormatter={() => ''}
                alwaysShowText={false} 
            />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;