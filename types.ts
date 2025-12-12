
export interface FinancialYearData {
  year: string;
  revenue: number; // 营业收入
  netProfitParent: number; // 归属于母公司所有者的净利润
  totalAssets: number; // 总资产
  equityParent: number; // 归属于母公司所有者权益
  operatingCashFlow?: number; // 经营活动产生的现金流量净额
  capex?: number; // 构建固定资产、无形资产和其他长期资产支付的现金
  
  // Detailed Breakdown for Sankey
  costOfRevenue?: number; // 营业成本
  salesExpenses?: number; // 销售费用
  managementExpenses?: number; // 管理费用
  financialExpenses?: number; // 财务费用
  researchExpenses?: number; // 研发费用
  taxExpenses?: number; // 所得税费用 (Optional, can be used for "Tax & Others")

  // New field for Business Composition
  businessComposition?: BusinessCompositionItem[];
}

export interface BusinessCompositionItem {
  name: string;
  value: number;
}

export interface DupontMetrics {
  year: string;
  roe: number; // 净资产收益率
  netProfitMargin: number; // 销售净利率
  assetTurnover: number; // 总资产周转率
  equityMultiplier: number; // 权益乘数
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  data: FinancialYearData[];
  report?: string; // AI Analysis Report
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type ViewState = 'LIST' | 'UPLOAD' | 'DETAIL' | 'COMPARE';

export interface DCFParams {
  growthPeriod: number;
  growthRate: number;
  terminalRate: number;
  discountRate: number;
  shareCountInBillions: number;
  ocfInBillions: number;
  capexInBillions: number;
}
