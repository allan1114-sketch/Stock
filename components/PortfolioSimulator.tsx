import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AssetAllocation } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PieChart as PieIcon, Plus, Trash2 } from 'lucide-react';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PortfolioSimulator: React.FC = () => {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<AssetAllocation[]>([
    { id: '1', name: 'Stocks', value: 60, color: COLORS[0] },
    { id: '2', name: 'Bonds', value: 30, color: COLORS[1] },
    { id: '3', name: 'Cash', value: 10, color: COLORS[2] },
  ]);
  const [newAssetName, setNewAssetName] = useState('');

  const total = assets.reduce((sum, a) => sum + a.value, 0);

  const handleValueChange = (id: string, newValue: string) => {
    const val = parseFloat(newValue) || 0;
    setAssets(prev => prev.map(a => a.id === id ? { ...a, value: val } : a));
  };

  const handleRemove = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleAdd = () => {
    if (!newAssetName) return;
    const newId = Date.now().toString();
    const color = COLORS[assets.length % COLORS.length];
    setAssets([...assets, { id: newId, name: newAssetName, value: 0, color }]);
    setNewAssetName('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
        <PieIcon className="w-5 h-5 mr-2 text-violet-600" />
        {t('portfolio.title')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assets}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {assets.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
             <span className={`text-xl font-bold ${total === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>
                 {total}%
             </span>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-3">
           <div className="flex gap-2 mb-4">
              <input 
                 type="text" 
                 placeholder="New Asset Class..." 
                 value={newAssetName}
                 onChange={e => setNewAssetName(e.target.value)}
                 className="border rounded px-2 py-1 flex-1 text-sm"
              />
              <button onClick={handleAdd} className="bg-slate-800 text-white p-1 rounded hover:bg-slate-700">
                 <Plus className="w-4 h-4" />
              </button>
           </div>

           <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
             {assets.map((asset) => (
               <div key={asset.id} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }}></div>
                  <span className="flex-1 font-medium text-slate-700">{asset.name}</span>
                  <input 
                    type="number" 
                    value={asset.value} 
                    onChange={(e) => handleValueChange(asset.id, e.target.value)}
                    className="w-16 border rounded px-1 text-right"
                  />
                  <span className="text-slate-500">%</span>
                  <button onClick={() => handleRemove(asset.id)} className="text-slate-400 hover:text-red-500">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
             ))}
           </div>
           
           {total !== 100 && (
               <p className="text-xs text-rose-500 mt-2 text-right">Total must equal 100% (Current: {total}%)</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSimulator;
