
import { FinancialYearData, BusinessCompositionItem } from "../types";
// @ts-ignore
import { read, utils } from "xlsx";

// Configuration for metric detection with positive and negative lookups
const METRIC_RULES: Record<keyof Omit<FinancialYearData, 'year' | 'businessComposition'>, { positive: string[], negative?: string[] }> = {
    revenue: {
        positive: ['营业总收入', '营业收入', 'Total Revenue', 'Operating Revenue', 'Revenue', 'Main Business Income', '营收', '主营业务收入'],
        negative: ['成本', 'Cost', 'Expense', '费用', '增长率', 'Growth', 'Cash', '现金', '税', 'Tax', '率', 'Ratio']
    },
    netProfitParent: {
        positive: ['归属于母公司所有者的净利润', '归属于母公司股东的净利润', '归母净利润', 'Net Profit Attributable to Owners', 'Net Income Attributable', 'Net Profit Parent', '归属于上市公司股东的净利润'],
        negative: ['扣非', 'Non-recurring', '税前', 'Before Tax', '增长率', 'Growth', 'Rate', '率']
    },
    totalAssets: {
        positive: ['资产总计', '资产总额', 'Total Assets', '总资产'],
        negative: ['平均', 'Average', '净资产', 'Net Assets', '流动', 'Current', '非流动', 'Non-current', '周转', 'Turnover', '收益', 'Return', '增长', 'Growth', 'Depreciation', '折旧', '率', 'Ratio']
    },
    equityParent: {
        positive: ['归属于母公司所有者权益', '归属于母公司股东权益', '归母权益', '归属于母公司股东的权益', 'Total Equity Attributable to Owners', 'Equity Attributable to Parent', '归属于上市公司股东的所有者权益', '股东权益合计', '所有者权益合计', 'Total Equity'],
        negative: ['少数', 'Minority', '平均', 'Average', '增长', 'Growth', '率', 'Ratio', '负债', 'Liabilities']
    },
    operatingCashFlow: {
        positive: ['经营活动产生的现金流量净额', '经营活动现金流量净额', '经营活动净现金流', 'Net Cash Flow from Operating Activities', 'Net Cash from Operating', 'Operating Cash Flow', 'OCF', '经营现金流', '经营性现金流'],
        negative: ['投资', 'Investing', '筹资', 'Financing', '增长', 'Growth', '率', 'Ratio']
    },
    capex: {
        positive: ['购建固定资产', '购建固定资产、无形资产和其他长期资产支付的现金', 'Capital Expenditure', 'Capex', 'Capital Spending', 'Purchase of Property', '资本开支', '资本性支出'],
        negative: ['Ratio', '率']
    },
    costOfRevenue: {
        positive: ['营业成本', '营业总成本', 'Cost of Revenue', 'Operating Cost', 'Cost of Sales', '主营业务成本'],
        negative: ['率', 'Ratio', 'Growth', '增长']
    },
    salesExpenses: {
        positive: ['销售费用', 'Selling Expenses', 'Distribution Costs', 'Marketing Expenses'],
        negative: ['率', 'Ratio']
    },
    managementExpenses: {
        positive: ['管理费用', 'Management Expenses', 'Administrative Expenses', 'General and Administrative'],
        negative: ['率', 'Ratio']
    },
    financialExpenses: {
        positive: ['财务费用', 'Financial Expenses', 'Finance Costs', 'Interest Expense'],
        negative: ['率', 'Ratio']
    },
    researchExpenses: {
        positive: ['研发费用', 'Research and Development', 'R&D'],
        negative: ['率', 'Ratio']
    },
    taxExpenses: {
        positive: ['所得税费用', '所得税', 'Income Tax Expenses', 'Income Tax'],
        negative: ['递延', 'Deferred', 'Payable', '应交', '率', 'Ratio']
    }
};

const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove currency symbols, commas, spaces, invisible chars
        let v = val.replace(/[¥$£€,\s\uFEFF\xA0]/g, '').trim();
        // Handle parenthesis for negative numbers (e.g. "(1000)")
        if (v.startsWith('(') && v.endsWith(')')) {
            v = '-' + v.slice(1, -1);
        }
        // Handle percentages
        if (v.endsWith('%')) {
            return parseFloat(v) / 100;
        }
        // Handle dashes as 0
        if (v === '-' || v === '—' || v === '') return 0;
        
        const parsed = parseFloat(v);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// Parse string "Name:100; Name2:200" into object
const parseBusinessComposition = (str: string): BusinessCompositionItem[] => {
    if (!str || typeof str !== 'string') return [];
    try {
        return str.split(/;|；/).map(s => {
            const parts = s.split(/:|：/);
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = cleanNumber(parts[1]);
                if (name && !isNaN(value)) return { name, value };
            }
            return null;
        }).filter((i): i is BusinessCompositionItem => i !== null);
    } catch (e) {
        return [];
    }
};

// Helper: Determine which metric a string matches (if any)
const identifyMetric = (str: string): keyof FinancialYearData | 'businessComposition' | null => {
    if (!str) return null;
    const cleanStr = String(str).trim();
    
    // Check for Business Composition specially
    if (cleanStr.includes('主营业务构成') || cleanStr.includes('Business Composition')) {
        return 'businessComposition';
    }

    // Check standard metrics
    for (const [key, rules] of Object.entries(METRIC_RULES)) {
        // 1. Must NOT contain any negative keywords
        if (rules.negative && rules.negative.some(n => cleanStr.includes(n))) {
            continue;
        }
        // 2. Must contain at least one positive keyword
        if (rules.positive.some(p => cleanStr.includes(p))) {
            return key as keyof FinancialYearData;
        }
    }
    return null;
};

export const extractFinancialData = async (files: File[]): Promise<FinancialYearData[]> => {
  const yearDataMap: Record<string, Partial<FinancialYearData>> = {};

  for (const file of files) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = read(arrayBuffer);
        
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            // defval: '' ensures empty cells are empty strings, preventing index shifting
            const rows = utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
            
            if (rows.length === 0) continue;

            // --- STRATEGY DETECTION ---
            let detectedStrategy: 'HORIZONTAL' | 'VERTICAL' | null = null;
            let headerRowIndex = -1;

            // Scan first 20 rows to detect structure
            for (let r = 0; r < Math.min(rows.length, 30); r++) {
                const row = rows[r];
                if (!Array.isArray(row)) continue;

                // Check for Horizontal: Row contains multiple Years (e.g. 2020, 2021)
                const yearCount = row.filter(cell => /^(20\d{2}|19\d{2})/.test(String(cell).trim())).length;
                if (yearCount >= 2) {
                    detectedStrategy = 'HORIZONTAL';
                    headerRowIndex = r;
                    break;
                }

                // Check for Vertical: Row contains multiple Metric Keywords (e.g. 营业收入, 净利润)
                let keywordMatchCount = 0;
                const rowStr = row.map(c => String(c).trim());
                for (const cell of rowStr) {
                    if (identifyMetric(cell)) {
                        keywordMatchCount++;
                    }
                }
                
                // If we match enough unique metric types (>= 3), assume this is a vertical header
                if (keywordMatchCount >= 3) {
                    detectedStrategy = 'VERTICAL';
                    headerRowIndex = r;
                    break;
                }
            }

            if (!detectedStrategy || headerRowIndex === -1) continue;

            // --- PARSING EXECUTION ---

            if (detectedStrategy === 'HORIZONTAL') {
                // Header = Years, Rows = Metrics
                const yearColMap: Record<number, string> = {}; // colIndex -> Year
                
                // Parse Header
                const headerRow = rows[headerRowIndex];
                headerRow.forEach((cell: any, idx: number) => {
                    const cellStr = String(cell).trim();
                    const match = cellStr.match(/(\d{4})/); // Simple 4 digit finder
                    if (match && (cellStr.includes('20') || cellStr.includes('19'))) { 
                        yearColMap[idx] = match[1];
                    }
                });

                // Parse Data Rows
                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!Array.isArray(row)) continue;
                    const label = String(row[0] || row[1] || '').trim(); // Try col 0 or 1 for label
                    
                    const matchedKey = identifyMetric(label);
                    
                    if (matchedKey && matchedKey !== 'businessComposition') {
                        // Extract data for each year column
                        Object.entries(yearColMap).forEach(([colIdx, year]) => {
                            const val = cleanNumber(row[Number(colIdx)]);
                            if (!yearDataMap[year]) yearDataMap[year] = { year, businessComposition: [] };
                            
                            if (matchedKey === 'capex') {
                                // @ts-ignore
                                yearDataMap[year][matchedKey] = Math.abs(val);
                            } else {
                                // @ts-ignore
                                yearDataMap[year][matchedKey] = val;
                            }
                        });
                    }
                }

            } else if (detectedStrategy === 'VERTICAL') {
                // Header = Metrics, First Col = Years (Exported CSV Format)
                const metricColMap: Record<number, keyof FinancialYearData | 'businessComposition'> = {};
                
                // Parse Header
                const headerRow = rows[headerRowIndex];
                headerRow.forEach((cell: any, idx: number) => {
                    const cellStr = String(cell).trim();
                    const matchedKey = identifyMetric(cellStr);
                    if (matchedKey) {
                        metricColMap[idx] = matchedKey;
                    }
                });

                // Parse Data Rows
                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!Array.isArray(row)) continue;
                    
                    // Assume Year is in Column 0 (or find the column that looks like a year)
                    const yearStr = String(row[0]).trim();
                    const yearMatch = yearStr.match(/^(\d{4})/); // Start with 4 digits

                    if (yearMatch) {
                        const year = yearMatch[1];
                        if (!yearDataMap[year]) yearDataMap[year] = { year, businessComposition: [] };

                        Object.entries(metricColMap).forEach(([colIdx, metricKey]) => {
                            const rawVal = row[Number(colIdx)];
                            
                            if (metricKey === 'businessComposition') {
                                yearDataMap[year].businessComposition = parseBusinessComposition(String(rawVal));
                            } else {
                                const val = cleanNumber(rawVal);
                                if (metricKey === 'capex') {
                                    // @ts-ignore
                                    yearDataMap[year][metricKey] = Math.abs(val);
                                } else {
                                    // @ts-ignore
                                    yearDataMap[year][metricKey] = val;
                                }
                            }
                        });
                    }
                }
            }
        }

    } catch (e) {
        console.error("Parse Error", e);
        throw new Error(`Failed to parse file: ${file.name} - ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  // Convert map to array and validate
  const result = Object.values(yearDataMap).filter(d => 
      d.year && 
      (d.revenue !== undefined || d.netProfitParent !== undefined || d.totalAssets !== undefined)
  ) as FinancialYearData[];

  // Fill in defaults
  result.forEach(d => {
      if (d.revenue === undefined) d.revenue = 0;
      if (d.netProfitParent === undefined) d.netProfitParent = 0;
      if (d.totalAssets === undefined) d.totalAssets = 0;
      if (d.equityParent === undefined) d.equityParent = 0;
  });

  if (result.length === 0) {
      return [];
  }

  return result.sort((a, b) => parseInt(a.year) - parseInt(b.year));
};
