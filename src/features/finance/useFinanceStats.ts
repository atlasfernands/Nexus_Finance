/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useFinance } from "./FinanceContext";
import { Transaction } from "../../types";
import { formatDate } from "../../lib/utils";

export function useFinanceStats() {
  const { state } = useFinance();
  const { transactions } = state;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthLabel = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const isCurrentMonth = (t: Transaction) => {
    const d = formatDate(t.data);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const isLastMonth = (t: Transaction) => {
    const d = formatDate(t.data);
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
  };

  const currentMonthTransactions = transactions.filter(t => isCurrentMonth(t) && t.status !== "cancelado");

  const getWeekIndex = (date: Date) => Math.min(4, Math.floor((date.getDate() - 1) / 7));

  const monthlyFlow = Array.from({ length: 5 }, (_, index) => ({
    name: `Sem ${index + 1}`,
    entradas: 0,
    saidas: 0,
  }));

  currentMonthTransactions.forEach(t => {
    const d = formatDate(t.data);
    const idx = getWeekIndex(d);
    if (t.tipo === "entrada") {
      monthlyFlow[idx].entradas += t.valor;
    } else {
      monthlyFlow[idx].saidas += t.valor;
    }
  });

  // Saldo Realizado = realizado + pago
  const saldoRealizado = transactions
    .filter(t => t.status === "realizado" || t.status === "pago")
    .reduce((acc, t) => acc + (t.tipo === "entrada" ? t.valor : -t.valor), 0);

  // Saldo Projetado = todos (exceto cancelados)
  const saldoProjetado = transactions
    .filter(t => t.status !== "cancelado")
    .reduce((acc, t) => acc + (t.tipo === "entrada" ? t.valor : -t.valor), 0);

  const entradasMes = currentMonthTransactions
    .filter(t => t.tipo === "entrada")
    .reduce((acc, t) => acc + t.valor, 0);

  const saidasMes = currentMonthTransactions
    .filter(t => t.tipo === "saída")
    .reduce((acc, t) => acc + t.valor, 0);

  const entradasMesAnterior = transactions
    .filter(t => isLastMonth(t) && t.tipo === "entrada" && t.status !== "cancelado")
    .reduce((acc, t) => acc + t.valor, 0);

  const saidasMesAnterior = transactions
    .filter(t => isLastMonth(t) && t.tipo === "saída" && t.status !== "cancelado")
    .reduce((acc, t) => acc + t.valor, 0);

  const deltaEntradas = entradasMesAnterior !== 0 ? ((entradasMes - entradasMesAnterior) / entradasMesAnterior) * 100 : 0;
  const deltaSaidas = saidasMesAnterior !== 0 ? ((saidasMes - saidasMesAnterior) / saidasMesAnterior) * 100 : 0;

  const monthlyRiskRatio = entradasMes > 0 ? Math.min((saidasMes / entradasMes) * 100, 100) : 100;
  const filledRiskSegments = Math.round(monthlyRiskRatio / 10);
  const riskStatus = monthlyRiskRatio < 60 ? "Baixo" : monthlyRiskRatio < 80 ? "Médio" : "Alto";

  // Store Meta
  const saldoLoja = transactions
    .filter(t => t.subcategoria === "Loja" && (t.status === "realizado" || t.status === "pago"))
    .reduce((acc, t) => acc + (t.tipo === "entrada" ? t.valor : -t.valor), 0);
    
  const metaAtingidaPercent = Math.min((saldoLoja / state.profile.meta) * 100, 100);

  return {
    currentMonthLabel,
    saldoRealizado,
    saldoProjetado,
    entradasMes,
    saidasMes,
    deltaEntradas,
    deltaSaidas,
    monthlyFlow,
    monthlyRiskRatio,
    filledRiskSegments,
    riskStatus,
    saldoLoja,
    metaAtingidaPercent,
    transactions
  };
}
