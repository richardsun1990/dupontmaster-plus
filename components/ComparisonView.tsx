import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowLeft, Filter, Calendar } from 'lucide-react';

interface ComparisonViewProps {
  projects: Project[];
  onBack: () => void;
}

const COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

type MetricKey = 'roe' | 'netMargin' | 'turnover' | 'multiplier' | 'revenue' | 'netProfitParent' | 'operatingCashFlow';

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; axisFormatter: (v: number) => string; tooltipFormatter: (v: number) => string }> = {
  roe: { 
    label: '净资产收益率 (ROE)', 
    unit: '%', 
    axisFormatter: (v) => `${v}%`,
    tooltipFormatter: (v) => `${v.toFixed(2)}%`
  },
  netMargin: { 
    label: '销售净利率', 
    unit: '%', 
    axisFormatter: (v) => `${v}%`,
    tooltipFormatter: (v) => `${v.toFixed(2)}%`
  },
  turnover: { 
    label: '总资产周转率', 
    unit: '次', 
    axisFormatter: (v) => v.toFixed(2),
    tooltipFormatter: (v) => v.toFixed(4)
  },
  multiplier: { 
    label: '权益乘数', 
    unit: '倍', 
    axisFormatter: (v) => v.toFixed(2),
    tooltipFormatter: (v) => v.toFixed(2)
  },
  revenue: { 
    label: '营业收入', 
    unit: '元', 
    axisFormatter: (v) => new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(v),
    tooltipFormatter: (v) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v)
  },
  netProfitParent: { 
    label: '归母净利润', 
    unit: '元', 
    axisFormatter: (v) => new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(v),
    tooltipFormatter: (v) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v)
  },
  operatingCashFlow: { 
    label: '经营性现金流', 
    unit: '元', 
    axisFormatter: (v) => new Intl.NumberFormat('zh-CN', { notation: 'compact' }).format(v),
    tooltipFormatter: (v) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(v)
  },
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ projects, onBack }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('roe');
  const [startYear, setStartYear] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');

  // 1. Collect all unique years across all projects
  const allYears = useMemo(() => {
    const years = new Set<string>();
    projects.forEach(p => {
        p.data.forEach(d => {
            years.add(d.year);
        });
    });
    return Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));
  }, [projects]);

  // Initialize date range
  useEffect(() => {
    if (allYears.length > 0) {
      if (!startYear) setStartYear(allYears[0]);
      if (!endYear) setEndYear(allYears[allYears.length - 1]);
    }
  }, [allYears]);

  // 2. Build chart data based on selection
  const chartData = useMemo(() => {
    // Filter years
    const filteredYears = allYears.filter(y => {
       const yNum = parseInt(y);
       const sNum = parseInt(startYear || '0');
       const eNum = parseInt(endYear || '9999');
       return yNum >= sNum && yNum <= eNum;
    });

    return filteredYears.map(year => {
      const entry: any = { year };
      projects.forEach(p => {
          const yearData = p.data.find(d => d.year === year);
          if (yearData) {
              let value = 0;
              switch (selectedMetric) {
                case 'roe':
                  value = yearData.equityParent ? (yearData.netProfitParent / yearData.equityParent) * 100 : 0;
                  break;
                case 'netMargin':
                  value = yearData.revenue ? (yearData.netProfitParent / yearData.revenue) * 100 : 0;
                  break;
                case 'turnover':
                  value = yearData.totalAssets ? yearData.revenue / yearData.totalAssets : 0;
                  break;
                case 'multiplier':
                  value = yearData.equityParent ? yearData.totalAssets / yearData.equityParent : 0;
                  break;
                case 'revenue':
                  value = yearData.revenue;
                  break;
                case 'netProfitParent':
                  value = yearData.netProfitParent;
                  break;
                case 'operatingCashFlow':
                  value = yearData.operatingCashFlow ?? 0; // handle undefined
                  break;
              }
              // Round specifically for chart display to avoid tiny floating point issues
              // But keep raw numbers for currency to allow formatting
              if (['roe', 'netMargin'].includes(selectedMetric)) {
                  entry[p.id] = parseFloat(value.toFixed(2));
              } else if (['turnover', 'multiplier'].includes(selectedMetric)) {
                  entry[p.id] = parseFloat(value.toFixed(4));
              } else {
                  entry[p.id] = value;
              }
          }
      });
      return entry;
    });
  }, [projects, allYears, selectedMetric, startYear, endYear]);

  // Helper for summary table
  const getLatestMetrics = (project: Project) => {
    if (!project.data.length) return null;
    const latest = project.data[project.data.length - 1];
    const roe = latest.equityParent ? latest.netProfitParent / latest.equityParent : 0;
    const netMargin = latest.revenue ? latest.netProfitParent / latest.revenue : 0;
    const turnover = latest.totalAssets ? latest.revenue / latest.totalAssets : 0;
    const multiplier = latest.equityParent ? latest.totalAssets / latest.equityParent : 0;
    
    return {
        year: latest.year,
        roe,
        netMargin,
        turnover,
        multiplier,
        revenue: latest.revenue,
        profit: latest.netProfitParent
    };
  };

  const config = METRIC_CONFIG[selectedMetric];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-2 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            返回项目列表
          </button>
          <h1 className="text-2xl font-bold text-gray-800">多项目对比分析</h1>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
          
          {/* Metric Selector */}
          <div className="flex-1 w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-500" />
              选择对比指标
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${selectedMetric === key 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {METRIC_CONFIG[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="w-full md:w-auto bg-gray-50 p-3 rounded-lg border border-gray-100">
             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
               <Calendar className="w-3 h-3" />
               时间范围
             </label>
             <div className="flex items-center gap-2">
               <select 
                 value={startYear}
                 onChange={(e) => setStartYear(e.target.value)}
                 className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
               >
                 {allYears.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <span className="text-gray-400">-</span>
               <select 
                 value={endYear}
                 onChange={(e) => setEndYear(e.target.value)}
                 className="block w-full rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
               >
                 {allYears.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
             </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
            {config.label} 走势对比
        </h3>
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="year" 
                  stroke="#94a3b8" 
                  tick={{fill: '#64748b'}} 
                  axisLine={{stroke: '#e2e8f0'}}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickFormatter={config.axisFormatter}
                  tick={{fill: '#64748b'}}
                  axisLine={{stroke: '#e2e8f0'}}
                  width={60}
                />
                <Tooltip 
                 formatter={(value: number) => [config.tooltipFormatter(value), config.label]}
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend iconType="circle" />
                {projects.map((p, index) => (
                    <Line 
                        key={p.id}
                        type="monotone" 
                        dataKey={p.id} 
                        name={p.name} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        dot={{ r: 3, strokeWidth: 0 }}
                        connectNulls
                    />
                ))}
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
            最新年度核心指标概览
        </h3>
        <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700 rounded-tl-lg">项目名称</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">最新年份</th>
                    <th className="px-6 py-4 font-semibold text-indigo-700 bg-indigo-50/50">ROE</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">销售净利率</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">总资产周转率</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">权益乘数</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">营业收入</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 rounded-tr-lg">归母净利润</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {projects.map((p, index) => {
                    const m = getLatestMetrics(p);
                    if (!m) return null;
                    return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                {p.name}
                            </td>
                            <td className="px-6 py-4 text-gray-500">{m.year}</td>
                            <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{(m.roe * 100).toFixed(2)}%</td>
                            <td className="px-6 py-4 text-gray-700">{(m.netMargin * 100).toFixed(2)}%</td>
                            <td className="px-6 py-4 text-gray-700">{m.turnover.toFixed(4)}</td>
                            <td className="px-6 py-4 text-gray-700">{m.multiplier.toFixed(2)}</td>
                            <td className="px-6 py-4 text-gray-500">
                                {new Intl.NumberFormat('zh-CN', { notation: 'compact', compactDisplay: 'short' }).format(m.revenue)}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {new Intl.NumberFormat('zh-CN', { notation: 'compact', compactDisplay: 'short' }).format(m.profit)}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonView;