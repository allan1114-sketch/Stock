import React from 'react';
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
  Label
} from 'recharts';
import { ChartDataPoint, ChartAnnotation } from '../types';

interface StockChartProps {
  data: ChartDataPoint[];
  color?: string;
  annotations?: ChartAnnotation[];
}

const StockChart: React.FC<StockChartProps> = ({ data, color = "#0ea5e9", annotations = [] }) => {
  // Safe check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-slate-400">
        無數據顯示
      </div>
    );
  }

  // Calculate domain for better visual scaling
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1; // Increased padding slightly

  // Custom Tooltip component for precise data display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg min-w-[120px] z-50">
          <p className="text-slate-500 text-xs font-medium mb-1 border-b border-slate-100 pb-1">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
             <span className="text-slate-400 text-xs font-semibold">USD</span>
             <span className="text-sky-700 font-bold text-lg">
               {typeof payload[0].value === 'number' 
                 ? payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                 : payload[0].value}
             </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80 w-full bg-white p-2 rounded-lg relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
            minTickGap={35}
            tickMargin={10}
          />
          <YAxis 
            domain={[minPrice - padding, maxPrice + padding]} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            tickFormatter={(val) => val.toFixed(0)}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={800}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
          
          {annotations.map((ann) => (
             <ReferenceLine 
                key={ann.id} 
                y={ann.yAxisValue} 
                stroke={ann.color || "#ef4444"} 
                strokeDasharray="4 4" 
                strokeWidth={2}
                ifOverflow="extendDomain"
             >
                <Label value={ann.label} position="insideTopLeft" fill={ann.color || "#ef4444"} fontSize={10} />
             </ReferenceLine>
          ))}

          <Brush 
            dataKey="time" 
            height={25} 
            stroke="#cbd5e1"
            fill="#f8fafc"
            tickFormatter={() => ''} 
            travellerWidth={10}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;