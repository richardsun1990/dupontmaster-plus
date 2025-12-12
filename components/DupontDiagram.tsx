import React from 'react';
import { DupontMetrics, FinancialYearData } from '../types';

interface DupontDiagramProps {
  metrics: DupontMetrics;
  data: FinancialYearData;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

const Card: React.FC<{ 
  title: string; 
  value: string | number; 
  subtext?: string;
  color?: string;
  isRoot?: boolean;
}> = ({ title, value, subtext, color = "bg-white", isRoot = false }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border ${isRoot ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 ' + color} min-w-[140px] transition-all hover:shadow-md`}>
    <span className={`text-xs font-medium uppercase tracking-wider mb-1 ${isRoot ? 'text-indigo-800' : 'text-gray-500'}`}>{title}</span>
    <span className={`text-lg font-bold ${isRoot ? 'text-indigo-900 text-2xl' : 'text-gray-800'}`}>{value}</span>
    {subtext && <span className="text-xs text-gray-400 mt-1">{subtext}</span>}
  </div>
);

const Operator: React.FC<{ symbol: string }> = ({ symbol }) => (
  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400 font-bold text-lg mx-2 my-2">
    {symbol}
  </div>
);

const DupontDiagram: React.FC<DupontDiagramProps> = ({ metrics, data }) => {
  return (
    <div className="flex flex-col items-center w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-8 self-start flex items-center gap-2">
        <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
        杜邦分析分解图 ({metrics.year})
      </h3>
      
      {/* Level 1: ROE */}
      <div className="mb-8">
        <Card 
          title="净资产收益率 (ROE)" 
          value={`${(metrics.roe * 100).toFixed(2)}%`} 
          isRoot={true}
        />
      </div>

      {/* Connector */}
      <div className="w-0.5 h-8 bg-gray-300 -mt-8 mb-4"></div>
      
      {/* Level 1 Branching */}
      <div className="relative w-full max-w-4xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[66%] h-4 border-t-2 border-l-2 border-r-2 border-gray-300 rounded-t-xl"></div>
      </div>

      {/* Level 2: Three Components */}
      <div className="flex justify-between w-full max-w-4xl mt-4 gap-4 flex-wrap md:flex-nowrap">
        {/* Branch 1: Net Profit Margin */}
        <div className="flex flex-col items-center flex-1">
          <Card 
            title="销售净利率" 
            value={`${(metrics.netProfitMargin * 100).toFixed(2)}%`}
            color="bg-blue-50/50"
          />
          <div className="w-0.5 h-6 bg-gray-300 my-2"></div>
          <div className="flex flex-col items-center gap-2 w-full p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">归母净利润</span>
              <span className="font-semibold">{formatCurrency(data.netProfitParent)}</span>
            </div>
            <div className="w-full h-px bg-gray-300"></div>
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">营业收入</span>
              <span className="font-semibold">{formatCurrency(data.revenue)}</span>
            </div>
          </div>
        </div>

        <Operator symbol="×" />

        {/* Branch 2: Asset Turnover */}
        <div className="flex flex-col items-center flex-1">
          <Card 
            title="总资产周转率" 
            value={metrics.assetTurnover.toFixed(4)}
            subtext="次/年"
            color="bg-emerald-50/50"
          />
          <div className="w-0.5 h-6 bg-gray-300 my-2"></div>
          <div className="flex flex-col items-center gap-2 w-full p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">营业收入</span>
              <span className="font-semibold">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="w-full h-px bg-gray-300"></div>
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">总资产</span>
              <span className="font-semibold">{formatCurrency(data.totalAssets)}</span>
            </div>
          </div>
        </div>

        <Operator symbol="×" />

        {/* Branch 3: Equity Multiplier */}
        <div className="flex flex-col items-center flex-1">
          <Card 
            title="权益乘数" 
            value={metrics.equityMultiplier.toFixed(2)}
            color="bg-amber-50/50"
          />
          <div className="w-0.5 h-6 bg-gray-300 my-2"></div>
          <div className="flex flex-col items-center gap-2 w-full p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">总资产</span>
              <span className="font-semibold">{formatCurrency(data.totalAssets)}</span>
            </div>
            <div className="w-full h-px bg-gray-300"></div>
            <div className="flex justify-between w-full text-sm">
              <span className="text-gray-500">归母权益</span>
              <span className="font-semibold">{formatCurrency(data.equityParent)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DupontDiagram;