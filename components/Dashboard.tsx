
import React, { useState, useMemo, useEffect } from 'react';
import { FinancialYearData, DupontMetrics, DCFParams } from '../types';
import DupontDiagram from './DupontDiagram';
import TrendChart from './TrendChart';
import DCFCalculator from './DCFCalculator';
import ProfitSankey from './ProfitSankey';
import BusinessCompositionChart from './BusinessCompositionChart';
import { ArrowLeft, RefreshCw, Calendar, PieChart, TrendingUp, FileText, Download } from 'lucide-react';
import { calculateDCF } from '../utils/dcfUtils';

interface DashboardProps {
  data: FinancialYearData[];
  projectName: string;
  onBack: () => void;
  onRefresh: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, projectName, onBack, onRefresh }) => {
  // Tabs: 'analysis' | 'profit' | 'dcf'
  const [activeTab, setActiveTab] = useState<'analysis' | 'profit' | 'dcf'>('analysis');
  
  // Default to the latest year
  const [selectedYear, setSelectedYear] = useState<string>(data[data.length - 1].year);

  // DCF State (Lifted Up)
  const [dcfParams, setDcfParams] = useState<DCFParams>({
    growthPeriod: 5,
    growthRate: 10,
    terminalRate: 2,
    discountRate: 8,
    shareCountInBillions: 0,
    ocfInBillions: 0,
    capexInBillions: 0
  });

  // Initialize DCF params when data loads
  useEffect(() => {
    const latest = data[data.length - 1];
    if (latest) {
      setDcfParams(prev => ({
        ...prev,
        ocfInBillions: (latest.operatingCashFlow || 0) / 1e8,
        capexInBillions: Math.abs(latest.capex || 0) / 1e8
      }));
    }
  }, [data]);

  const metricsHistory: DupontMetrics[] = useMemo(() => {
    return data.map(d => ({
      year: d.year,
      roe: d.equityParent ? d.netProfitParent / d.equityParent : 0,
      netProfitMargin: d.revenue ? d.netProfitParent / d.revenue : 0,
      assetTurnover: d.totalAssets ? d.revenue / d.totalAssets : 0,
      equityMultiplier: d.equityParent ? d.totalAssets / d.equityParent : 0
    }));
  }, [data]);

  const selectedData = data.find(d => d.year === selectedYear);
  const selectedMetrics = metricsHistory.find(m => m.year === selectedYear);
  const latestData = data[data.length - 1];

  const handleExportCSV = () => {
    // 0. Project Info
    const infoRows = [
        ['项目名称', projectName],
        ['导出日期', new Date().toLocaleDateString()],
        ['']
    ];

    // 1. Historical Data Headers (DuPont + Sankey Details)
    const historicalHeaders = [
        '年份', 
        '营业收入', 
        '营业成本', 
        '毛利润',
        '销售费用', 
        '管理费用', 
        '财务费用', 
        '研发费用', 
        '所得税费用', 
        '归母净利润', 
        '总资产', 
        '归母权益', 
        '经营现金流(OCF)', 
        '资本开支(Capex)', 
        'ROE', 
        '销售净利率', 
        '总资产周转率', 
        '权益乘数',
        '主营业务构成(Name:Value...)'
    ];

    // 2. Historical Data Rows
    const historicalRows = data.map(d => {
        const m = metricsHistory.find(m => m.year === d.year);
        const grossProfit = (d.revenue || 0) - (d.costOfRevenue || 0);
        const compStr = d.businessComposition ? d.businessComposition.map(c => `${c.name}:${c.value}`).join('; ') : '';

        return [
            d.year,
            d.revenue,
            d.costOfRevenue || 0,
            grossProfit,
            d.salesExpenses || 0,
            d.managementExpenses || 0,
            d.financialExpenses || 0,
            d.researchExpenses || 0,
            d.taxExpenses || 0,
            d.netProfitParent,
            d.totalAssets,
            d.equityParent,
            d.operatingCashFlow || 0,
            d.capex || 0,
            m ? (m.roe * 100).toFixed(2) + '%' : '',
            m ? (m.netProfitMargin * 100).toFixed(2) + '%' : '',
            m ? m.assetTurnover.toFixed(4) : '',
            m ? m.equityMultiplier.toFixed(2) : '',
            compStr
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','); // Quote strings to handle commas safely
    });

    // 3. DCF Calculation Data
    const dcfResult = calculateDCF(dcfParams);
    
    const dcfRows = [
        [''],
        ['--- DCF 估值模型数据 ---'],
        ['参数', '数值'],
        ['预测期 (年)', `${dcfParams.growthPeriod}`],
        ['未来增长率 (%)', `${dcfParams.growthRate}`],
        ['永续增长率 (%)', `${dcfParams.terminalRate}`],
        ['折现率 WACC (%)', `${dcfParams.discountRate}`],
        ['总股本 (亿股)', `${dcfParams.shareCountInBillions}`],
        ['基准 OCF (亿)', `${dcfParams.ocfInBillions}`],
        ['基准 Capex (亿)', `${dcfParams.capexInBillions}`],
        [''],
        ['估值结果', '数值 (元)'],
        ['企业内在价值 (EV)', dcfResult.totalValue],
        ['每股内在价值', dcfResult.valuePerShare],
        ['初始自由现金流 (Base FCF)', dcfResult.baseFCF],
        ['终值 (Terminal Value)', dcfResult.terminalValue],
        ['终值折现 (Terminal PV)', dcfResult.terminalPV],
        [''],
        ['--- 未来现金流预测 ---'],
        ['年份', '自由现金流 (FCF)', '折现值 (PV)'],
        ...dcfResult.projections.map(p => [p.year, p.fcf, p.pv].map(val => `"${val}"`).join(','))
    ].map(row => Array.isArray(row) ? row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') : row);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [
        ...infoRows.map(r => r.join(',')),
        historicalHeaders.join(','), 
        ...historicalRows,
        ...dcfRows
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${projectName}_全量分析数据.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedData || !selectedMetrics) return null;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-fade-in no-print">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-2 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              返回项目列表
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 break-words">{projectName}</h1>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 whitespace-nowrap">
                {data.length} 年数据
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {(activeTab === 'analysis' || activeTab === 'profit') && (
                <div className="relative w-full sm:w-auto">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full sm:w-auto pl-10 pr-8 py-2 bg-indigo-50 border-none text-indigo-700 font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                  >
                    {data.map(d => (
                      <option key={d.year} value={d.year}>{d.year} 年度</option>
                    ))}
                  </select>
                </div>
            )}
            
            <div className="flex gap-2">
                <button 
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all text-sm font-medium shadow-sm"
                title="导出所有分析数据"
                >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">导出CSV</span>
                </button>
                
                <button 
                  onClick={onRefresh}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-lg transition-all text-sm font-medium shadow-sm flex items-center justify-center"
                  title="更新数据"
                >
                  <RefreshCw className="w-4 h-4 flex-shrink-0" />
                </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Horizontal scrolling on mobile */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl max-w-lg overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'analysis' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PieChart className="w-4 h-4 flex-shrink-0" />
            杜邦分析
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'profit' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Download className="w-4 h-4 rotate-90 flex-shrink-0" />
            利润结构
          </button>
          <button
            onClick={() => setActiveTab('dcf')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'dcf' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            DCF估值
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-fade-in">
              {/* Left Column: Visual Dupont Tree */}
              <div className="lg:col-span-3">
                 <DupontDiagram metrics={selectedMetrics} data={selectedData} />
              </div>

              {/* Row 2: Trend + Summary */}
              <div className="lg:col-span-2">
                 <TrendChart 
                   metricsHistory={metricsHistory} 
                   selectedYear={selectedYear}
                   onYearSelect={setSelectedYear}
                 />
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    {selectedYear} 核心数据
                    </h3>
                    <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                        <span className="text-gray-500">营业收入</span>
                        <span className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', notation: 'compact' }).format(selectedData.revenue)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                        <span className="text-gray-500">归母净利润</span>
                        <span className="font-semibold text-emerald-600">
                        {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', notation: 'compact' }).format(selectedData.netProfitParent)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                        <span className="text-gray-500">总资产</span>
                        <span className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', notation: 'compact' }).format(selectedData.totalAssets)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                        <span className="text-gray-500">归母权益</span>
                        <span className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', notation: 'compact' }).format(selectedData.equityParent)}
                        </span>
                    </div>
                    </div>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'profit' && (
           <div className="space-y-6 md:space-y-8 animate-fade-in">
             <ProfitSankey data={selectedData} />
             {selectedData.businessComposition && selectedData.businessComposition.length > 0 && (
                <BusinessCompositionChart 
                  data={data} 
                  selectedYear={selectedYear} 
                  onYearSelect={setSelectedYear}
                />
             )}
           </div>
        )}

        {activeTab === 'dcf' && (
           <DCFCalculator 
             data={data}
             latestData={latestData} 
             projectName={projectName}
             params={dcfParams}
             onParamChange={setDcfParams}
           />
        )}
      </div>
    </>
  );
};

export default Dashboard;
