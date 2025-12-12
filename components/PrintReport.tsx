
import React from 'react';
import { FinancialYearData, DupontMetrics, DCFParams } from '../types';
import { calculateDCF } from '../utils/dcfUtils';

interface PrintReportProps {
  projectName: string;
  data: FinancialYearData[];
  metricsHistory: DupontMetrics[];
  dcfParams: DCFParams;
}

const PrintReport: React.FC<PrintReportProps> = ({ projectName, data, metricsHistory, dcfParams }) => {
  const dcfResult = calculateDCF(dcfParams);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(val);
  };

  const formatDate = () => {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="print-only bg-white p-8 max-w-[210mm] mx-auto">
      {/* Header */}
      <div className="border-b-2 border-indigo-600 pb-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{projectName} - 财务分析与估值报告</h1>
        <div className="flex justify-between text-gray-500 text-sm">
          <span>生成时间: {formatDate()}</span>
          <span>DuPont Analysis & DCF Valuation Model</span>
        </div>
      </div>

      {/* Section 1: Financial Summary Table */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-indigo-500 pl-3">一、核心财务数据概览</h2>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-2">年份</th>
                <th className="px-4 py-2 text-right">营业收入</th>
                <th className="px-4 py-2 text-right">归母净利润</th>
                <th className="px-4 py-2 text-right">总资产</th>
                <th className="px-4 py-2 text-right">归母权益</th>
                <th className="px-4 py-2 text-right">经营现金流</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d) => (
                <tr key={d.year}>
                  <td className="px-4 py-2 font-medium">{d.year}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(d.revenue)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(d.netProfitParent)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(d.totalAssets)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(d.equityParent)}</td>
                  <td className="px-4 py-2 text-right">{d.operatingCashFlow ? formatCurrency(d.operatingCashFlow) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Dupont Analysis Table */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-indigo-500 pl-3">二、杜邦分析 (ROE 分解)</h2>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 text-indigo-900 font-semibold">
              <tr>
                <th className="px-4 py-2">年份</th>
                <th className="px-4 py-2 text-right">ROE (净资产收益率)</th>
                <th className="px-4 py-2 text-right">销售净利率 (%)</th>
                <th className="px-4 py-2 text-right">总资产周转率 (次)</th>
                <th className="px-4 py-2 text-right">权益乘数 (倍)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricsHistory.map((m) => (
                <tr key={m.year}>
                  <td className="px-4 py-2 font-medium">{m.year}</td>
                  <td className="px-4 py-2 text-right font-bold">{(m.roe * 100).toFixed(2)}%</td>
                  <td className="px-4 py-2 text-right">{(m.netProfitMargin * 100).toFixed(2)}%</td>
                  <td className="px-4 py-2 text-right">{m.assetTurnover.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right">{m.equityMultiplier.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">* 杜邦公式：ROE = 销售净利率 × 总资产周转率 × 权益乘数</p>
      </section>

      {/* Section 3: DCF Valuation */}
      <section className="mb-8 break-before-page">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-indigo-500 pl-3">三、DCF 现金流折现估值</h2>
        
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">关键假设参数</h3>
            <ul className="text-sm space-y-2">
              <li className="flex justify-between"><span>预测期长度:</span> <span className="font-medium">{dcfParams.growthPeriod} 年</span></li>
              <li className="flex justify-between"><span>未来增长率:</span> <span className="font-medium">{dcfParams.growthRate}%</span></li>
              <li className="flex justify-between"><span>永续增长率:</span> <span className="font-medium">{dcfParams.terminalRate}%</span></li>
              <li className="flex justify-between"><span>折现率 (WACC):</span> <span className="font-medium">{dcfParams.discountRate}%</span></li>
              <li className="flex justify-between"><span>总股本:</span> <span className="font-medium">{dcfParams.shareCountInBillions} 亿股</span></li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50/30">
            <h3 className="font-semibold text-indigo-900 mb-3 border-b border-indigo-200 pb-2">估值结果</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span className="text-sm text-gray-600">企业内在价值 (EV)</span> 
                <span className="font-bold text-lg">{formatCurrency(dcfResult.totalValue)}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-sm text-gray-600">每股内在价值</span> 
                <span className="font-bold text-xl text-indigo-700">
                  {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(dcfResult.valuePerShare)}
                </span>
              </li>
              <li className="text-xs text-gray-500 mt-2 pt-2 border-t border-indigo-100">
                初始自由现金流 (Base FCF): {formatCurrency(dcfResult.baseFCF)}
              </li>
            </ul>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 mb-2">现金流预测明细</h3>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2">预测年份</th>
                <th className="px-4 py-2 text-right">自由现金流 (FCF)</th>
                <th className="px-4 py-2 text-right">折现系数</th>
                <th className="px-4 py-2 text-right">折现值 (PV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dcfResult.projections.map((p, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{p.year}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(p.fcf)}</td>
                  <td className="px-4 py-2 text-right">{(p.pv / p.fcf).toFixed(4)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(p.pv)}</td>
                </tr>
              ))}
               <tr className="bg-indigo-50 font-semibold">
                  <td className="px-4 py-2">终值 (Terminal Value)</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(dcfResult.terminalValue)}</td>
                  <td className="px-4 py-2 text-right">--</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(dcfResult.terminalPV)}</td>
               </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-12 border-t pt-4">
        Powered by DuPont Master AI Analysis System
      </div>
    </div>
  );
};

export default PrintReport;
