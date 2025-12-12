
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DupontMetrics } from '../types';

interface TrendChartProps {
  metricsHistory: DupontMetrics[];
  selectedYear?: string;
  onYearSelect?: (year: string) => void;
}

const TrendChart: React.FC<TrendChartProps> = ({ metricsHistory, selectedYear, onYearSelect }) => {
  const data = metricsHistory.map(m => ({
    ...m,
    roePct: parseFloat((m.roe * 100).toFixed(2)),
    marginPct: parseFloat((m.netProfitMargin * 100).toFixed(2)),
  }));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
            历年趋势分析
        </div>
        {onYearSelect && <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-1 rounded">点击数据点可切换年份</span>}
      </h3>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onClick={(e) => {
              if (onYearSelect && e && e.activeLabel) {
                onYearSelect(e.activeLabel);
              }
            }}
            className={onYearSelect ? 'cursor-pointer' : ''}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" stroke="#94a3b8" />
            <YAxis yAxisId="left" stroke="#94a3b8" unit="%" />
            <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" hide />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36} />
            
            {selectedYear && (
                <ReferenceLine x={selectedYear} stroke="#cbd5e1" strokeDasharray="3 3" />
            )}

            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="roePct" 
              name="ROE (%)" 
              stroke="#4f46e5" 
              strokeWidth={3}
              activeDot={{ r: 8 }} 
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="marginPct" 
              name="销售净利率 (%)" 
              stroke="#0ea5e9" 
              strokeWidth={2} 
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex gap-4 justify-center text-sm text-gray-500">
        <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
           <span>净资产收益率 (ROE)</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-sky-500"></span>
           <span>销售净利率</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
