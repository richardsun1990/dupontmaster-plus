
import React, { useMemo } from 'react';
import { FinancialYearData, DCFParams } from '../types';
import { Calculator, HelpCircle, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Bar, Line, Legend } from 'recharts';
import { calculateDCF } from '../utils/dcfUtils';

interface DCFCalculatorProps {
  data: FinancialYearData[]; // Full history for trend analysis
  latestData: FinancialYearData;
  projectName: string;
  params: DCFParams;
  onParamChange: (newParams: DCFParams) => void;
}

const DCFCalculator: React.FC<DCFCalculatorProps> = ({ data, latestData, projectName, params, onParamChange }) => {
  
  const calculationResult = useMemo(() => calculateDCF(params), [params]);

  // Compute Historical FCF Data
  const historicalFCFData = useMemo(() => {
    return data.map((d, index) => {
      const ocf = d.operatingCashFlow || 0;
      const capex = Math.abs(d.capex || 0);
      const fcf = ocf - capex;
      
      let growthRate = 0;
      if (index > 0) {
        const prevOcf = data[index - 1].operatingCashFlow || 0;
        const prevCapex = Math.abs(data[index - 1].capex || 0);
        const prevFcf = prevOcf - prevCapex;
        
        // Avoid division by zero and extreme spikes from small bases
        if (Math.abs(prevFcf) > 1e4) { 
           growthRate = ((fcf - prevFcf) / Math.abs(prevFcf)) * 100;
        }
      }

      return {
        year: d.year,
        fcf,
        fcfDisplay: parseFloat((fcf / 1e8).toFixed(2)), // For display in chart (Billions)
        growthRate: index === 0 ? null : parseFloat(growthRate.toFixed(1))
      };
    });
  }, [data]);

  const updateParam = (key: keyof DCFParams, value: number) => {
    onParamChange({ ...params, [key]: value });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. New Section: Historical FCF Trend */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
           <BarChart2 className="w-5 h-5 text-indigo-500" />
           历史自由现金流 (FCF) 趋势分析
        </h3>
        <div className="h-[350px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <ComposedChart data={historicalFCFData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
               <CartesianGrid stroke="#f5f5f5" vertical={false} />
               <XAxis dataKey="year" scale="point" padding={{ left: 30, right: 30 }} stroke="#94a3b8" />
               <YAxis 
                  yAxisId="left" 
                  stroke="#94a3b8" 
                  label={{ value: 'FCF 金额 (亿元)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: 12 } }}
               />
               <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#fb923c"
                  unit="%"
                  label={{ value: '同比增长率', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#fb923c', fontSize: 12 } }}
               />
               <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === '自由现金流 (FCF)') return [`${value} 亿元`, name];
                    if (name === '同比增长率') return [`${value}%`, name];
                    return [value, name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
               />
               <Legend verticalAlign="top" height={36} />
               <Bar 
                  yAxisId="left" 
                  dataKey="fcfDisplay" 
                  name="自由现金流 (FCF)" 
                  fill="#818cf8" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
               />
               <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="growthRate" 
                  name="同比增长率" 
                  stroke="#fb923c" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#fff', stroke: '#fb923c', strokeWidth: 2 }}
               />
             </ComposedChart>
           </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          * 自由现金流 (FCF) ≈ 经营活动现金流净额 (OCF) - 资本性支出 (Capex)。此处金额单位为亿元。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-500" />
              估值参数设置
            </h3>

            <div className="space-y-6">
              {/* Base Data */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">基准数据 ({latestData.year})</h4>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">经营活动现金流净额 (OCF) - 亿元</label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                      <input 
                      type="number" 
                      value={params.ocfInBillions} 
                      onChange={e => updateParam('ocfInBillions', Number(e.target.value))}
                      className="w-full pl-7 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">亿</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">资本性支出 (Capex) - 亿元</label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
                      <input 
                      type="number" 
                      value={params.capexInBillions} 
                      onChange={e => updateParam('capexInBillions', Number(e.target.value))}
                      className="w-full pl-7 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">亿</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">初始自由现金流 = OCF - Capex = {formatCurrency(calculationResult.baseFCF)}</p>
                </div>
              </div>

              {/* Growth Assumptions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">预测增长期 (年)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map(yr => (
                    <button
                      key={yr}
                      onClick={() => updateParam('growthPeriod', yr)}
                      className={`py-2 px-3 rounded-md text-sm font-medium transition-colors border
                        ${params.growthPeriod === yr 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {yr}年
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">未来增长率 (%)</label>
                  <input 
                    type="number" 
                    value={params.growthRate}
                    onChange={e => updateParam('growthRate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">永续增长率 (%)</label>
                  <input 
                    type="number" 
                    value={params.terminalRate}
                    onChange={e => updateParam('terminalRate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">折现率 (WACC) %</label>
                  <input 
                    type="number" 
                    value={params.discountRate}
                    onChange={e => updateParam('discountRate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">总股本 (亿股)</label>
                  <input 
                    type="number" 
                    value={params.shareCountInBillions}
                    onChange={e => updateParam('shareCountInBillions', Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex gap-2">
                  <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>参考上方的历史 FCF 增长率曲线，结合行业前景，设定合理的未来增长率。</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                      <DollarSign className="w-24 h-24" />
                  </div>
                  <p className="text-indigo-100 text-sm font-medium mb-1">企业内在价值 (Enterprise Value)</p>
                  <h2 className="text-3xl font-bold">{formatCurrency(calculationResult.totalValue)}</h2>
                  <div className="mt-4 flex items-center gap-2 text-indigo-200 text-xs">
                      <span className="bg-white/20 px-2 py-1 rounded">终值占比 {((calculationResult.terminalPV / calculationResult.totalValue) * 100).toFixed(0)}%</span>
                  </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
                  <p className="text-gray-500 text-sm font-medium mb-1">每股内在价值</p>
                  {calculationResult.shareCount > 0 ? (
                      <>
                          <h2 className="text-3xl font-bold text-gray-800">
                              {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(calculationResult.valuePerShare)}
                          </h2>
                          <p className="text-gray-400 text-xs mt-2">基于 {params.shareCountInBillions} 亿股本计算</p>
                      </>
                  ) : (
                      <div className="text-gray-400 text-sm italic">请输入总股本以计算</div>
                  )}
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
                  <p className="text-gray-500 text-sm font-medium mb-1">初始自由现金流 (FCF)</p>
                  <h2 className="text-3xl font-bold text-gray-800">{formatCurrency(calculationResult.baseFCF)}</h2>
                  <p className="text-gray-400 text-xs mt-2">OCF {params.ocfInBillions.toFixed(2)}亿 - Capex {params.capexInBillions.toFixed(2)}亿</p>
              </div>
          </div>

          {/* Projection Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[320px]">
              <h4 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  未来现金流预测折现图
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculationResult.projections} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                      <defs>
                          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="year" stroke="#94a3b8" tick={{fontSize: 12}} />
                      <YAxis stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={(val) => (val/100000000).toFixed(0) + '亿'} />
                      <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(val: number) => formatCurrency(val)}
                      />
                      <Area type="monotone" dataKey="pv" stroke="#4f46e5" fillOpacity={1} fill="url(#colorPv)" name="现金流折现值 (PV)" />
                      <Area type="monotone" dataKey="fcf" stroke="#cbd5e1" strokeDasharray="5 5" fill="none" name="名义现金流 (FCF)" />
                  </AreaChart>
              </ResponsiveContainer>
          </div>

          {/* Details Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                          <th className="px-6 py-3">年份</th>
                          <th className="px-6 py-3 text-right">自由现金流 (FCF)</th>
                          <th className="px-6 py-3 text-right">折现系数</th>
                          <th className="px-6 py-3 text-right">折现值 (PV)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {calculationResult.projections.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-800">{p.year}</td>
                              <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(p.fcf)}</td>
                              <td className="px-6 py-3 text-right text-gray-500">{(1 / Math.pow(1 + params.discountRate/100, i)).toFixed(4)}</td>
                              <td className="px-6 py-3 text-right font-medium text-indigo-600">{formatCurrency(p.pv)}</td>
                          </tr>
                      ))}
                      <tr className="bg-indigo-50/50">
                          <td className="px-6 py-3 font-medium text-indigo-900">终值 (Terminal Value)</td>
                          <td className="px-6 py-3 text-right text-indigo-800">{formatCurrency(calculationResult.terminalValue)}</td>
                          <td className="px-6 py-3 text-right text-indigo-800">{(1 / Math.pow(1 + params.discountRate/100, params.growthPeriod)).toFixed(4)}</td>
                          <td className="px-6 py-3 text-right font-bold text-indigo-600">{formatCurrency(calculationResult.terminalPV)}</td>
                      </tr>
                  </tbody>
              </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DCFCalculator;
