
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ReferenceLine } from 'recharts';
import { FinancialYearData, BusinessCompositionItem } from '../types';
import { Layers, TrendingUp } from 'lucide-react';

interface BusinessCompositionChartProps {
  data: FinancialYearData[];
  selectedYear: string;
  onYearSelect?: (year: string) => void;
}

// Expanded color palette for detailed breakdown
const COLORS = [
  '#60a5fa', '#34d399', '#f87171', '#fb923c', '#a78bfa', '#e879f9', '#94a3b8',
  '#2dd4bf', '#fbbf24', '#f472b6', '#818cf8', '#c084fc', '#a3e635', '#22d3ee'
];

const BusinessCompositionChart: React.FC<BusinessCompositionChartProps> = ({ data, selectedYear, onYearSelect }) => {
  
  const selectedData = data.find(d => d.year === selectedYear);
  const composition = selectedData?.businessComposition || [];
  
  // Prepare data for Pie Chart
  const pieData = composition.map((item) => ({
    ...item,
    value: Number((item.value / 100000000).toFixed(2)) // Convert to Billions for display
  })).sort((a, b) => b.value - a.value);

  // Calculate "Other" if the sum is significantly less than revenue
  const totalCompositionValue = composition.reduce((acc, curr) => acc + curr.value, 0);
  const revenue = selectedData?.revenue || 0;
  
  // If breakdown is less than 95% of revenue, add "Others"
  // Note: Only do this if we actually have some composition data
  if (composition.length > 0 && totalCompositionValue < revenue * 0.95) {
     pieData.push({
         name: '其他业务',
         value: Number(((revenue - totalCompositionValue) / 100000000).toFixed(2))
     });
  }

  // Prepare data for Stacked Bar Chart (Historical Trend)
  // We need to normalize categories across years
  const historyData = data.map(d => {
      const comp = d.businessComposition || [];
      const entry: any = { year: d.year };
      comp.forEach(c => {
          entry[c.name] = Number((c.value / 100000000).toFixed(2));
      });
      // Also calculate residual for history
      const compTotal = comp.reduce((acc, c) => acc + c.value, 0);
      if (comp.length > 0 && compTotal < (d.revenue || 0) * 0.95) {
          entry['其他业务'] = Number(((d.revenue - compTotal) / 100000000).toFixed(2));
      }
      return entry;
  });

  // Get all unique keys for the stacked bar
  const allKeys = Array.from(new Set(historyData.flatMap(d => Object.keys(d).filter(k => k !== 'year')))) as string[];

  // Calculate Growth Rate Data (YoY)
  const growthData = historyData.map((curr, idx) => {
    if (idx === 0) return null;
    const prev = historyData[idx - 1];
    const item: any = { year: curr.year };
    
    let hasGrowthData = false;
    allKeys.forEach(key => {
        const v1 = Number(prev[key] || 0);
        const v2 = Number(curr[key] || 0);
        // Only calculate growth if base is significant enough (> 0.1 billion)
        if (v1 > 0.1) {
            item[key] = parseFloat(((v2 - v1) / v1 * 100).toFixed(2));
            hasGrowthData = true;
        } else {
            item[key] = null;
        }
    });
    return hasGrowthData ? item : null;
  }).filter(Boolean);

  if (pieData.length === 0) {
      return null; 
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-500" />
        主营业务构成与增长分析
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. Pie Chart: Composition for Selected Year */}
          <div className="h-[350px] flex flex-col">
              <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">{selectedYear} 年度营收结构 (亿元)</h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            formatter={(value: number) => [`${value} 亿元`, '金额']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={72} // Increased height for multiple rows of legend
                            iconType="circle" 
                            wrapperStyle={{ overflowY: 'auto' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* 2. Stacked Bar Chart: Historical Trend */}
          <div className="h-[350px] flex flex-col">
              <h4 className="text-sm font-medium text-gray-500 mb-2 text-center">历年业务规模趋势 (亿元)</h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={historyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        onClick={(data) => {
                            if (onYearSelect && data && data.activeLabel) {
                                onYearSelect(data.activeLabel);
                            }
                        }}
                        className={onYearSelect ? 'cursor-pointer' : ''}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                             formatter={(value: number) => [`${value} 亿元`, '']}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={72} 
                            iconType="circle"
                            wrapperStyle={{ overflowY: 'auto' }}
                        />
                        {allKeys.map((key, index) => (
                            <Bar 
                                key={key} 
                                dataKey={key} 
                                stackId="a" 
                                fill={COLORS[index % COLORS.length]} 
                                maxBarSize={50}
                                fillOpacity={1}
                            >
                               {/* Highlight selected year */}
                               {historyData.map((entry, i) => (
                                   <Cell 
                                     key={`cell-${i}`} 
                                     fill={COLORS[index % COLORS.length]} 
                                     fillOpacity={entry.year === selectedYear ? 1 : 0.4}
                                     stroke={entry.year === selectedYear ? '#3730a3' : 'none'}
                                     strokeWidth={entry.year === selectedYear ? 2 : 0}
                                   />
                               ))}
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* 3. Line Chart: Growth Rate Trend (Full Width) */}
          {growthData.length > 0 && (
            <div className="col-span-1 md:col-span-2 h-[350px] flex flex-col mt-4 pt-8 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-500 mb-4 text-center flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    分业务营收同比增速 (%)
                </h4>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                          data={growthData}
                          margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                          onClick={(data) => {
                              if (onYearSelect && data && data.activeLabel) {
                                  onYearSelect(data.activeLabel);
                              }
                          }}
                          className={onYearSelect ? 'cursor-pointer' : ''}
                      >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="year" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" unit="%" />
                          <Tooltip 
                               formatter={(value: number) => [`${value}%`, '增速']}
                               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="plainline" />
                          {selectedYear && (
                              <ReferenceLine x={selectedYear} stroke="#cbd5e1" strokeDasharray="3 3" />
                          )}
                          {allKeys.map((key, index) => (
                              <Line 
                                  key={key} 
                                  type="monotone" 
                                  dataKey={key} 
                                  stroke={COLORS[index % COLORS.length]} 
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  connectNulls={true}
                              />
                          ))}
                      </LineChart>
                  </ResponsiveContainer>
                </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default BusinessCompositionChart;
