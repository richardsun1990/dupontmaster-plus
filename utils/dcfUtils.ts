
import { DCFParams } from "../types";

export const calculateDCF = (params: DCFParams) => {
  const {
    ocfInBillions,
    capexInBillions,
    growthPeriod,
    growthRate,
    terminalRate,
    discountRate,
    shareCountInBillions,
  } = params;

  // Convert Billions back to full numeric values for calculation
  const ocf = ocfInBillions * 1e8;
  const capex = capexInBillions * 1e8;
  const shareCount = shareCountInBillions * 1e8;

  const baseFCF = ocf - capex;
  const projections = [];
  let currentFCF = baseFCF;
  let totalPV = 0;

  // 1. Growth Period
  for (let i = 1; i <= growthPeriod; i++) {
    currentFCF = currentFCF * (1 + growthRate / 100);
    const pv = currentFCF / Math.pow(1 + discountRate / 100, i);
    totalPV += pv;
    projections.push({
      year: `Year ${i}`,
      fcf: currentFCF,
      pv: pv,
    });
  }

  // 2. Terminal Value (Gordon Growth Model)
  // TV = FCF(n+1) / (r - g)
  // FCF(n+1) = FCF(n) * (1 + terminal g)
  const nextFCF = currentFCF * (1 + terminalRate / 100);
  const terminalValue = nextFCF / ((discountRate - terminalRate) / 100);
  const terminalPV = terminalValue / Math.pow(1 + discountRate / 100, growthPeriod);

  totalPV += terminalPV;

  const valuePerShare = shareCount > 0 ? totalPV / shareCount : 0;

  return {
    baseFCF,
    projections,
    terminalValue,
    terminalPV,
    totalValue: totalPV,
    valuePerShare,
    shareCount,
  };
};
