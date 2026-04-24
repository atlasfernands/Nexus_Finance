/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { CalendarRange, RotateCcw } from "lucide-react";
import { useFinance } from "../features/finance/FinanceContext";
import { parseDateString } from "../lib/utils";
import { ReportingGranularity } from "../types";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => ({
  value: month,
  label: new Date(2026, month, 1).toLocaleString("pt-BR", { month: "long" }),
}));

export default function ReportingPeriodControls() {
  const { state, dispatch } = useFinance();
  const { reportingPeriod, transactions } = state;

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([currentYear]);

    for (let offset = 1; offset <= 4; offset += 1) {
      yearSet.add(currentYear - offset);
      yearSet.add(currentYear + offset);
    }

    transactions.forEach((transaction) => {
      const parsedDate = parseDateString(transaction.date);
      if (parsedDate) {
        yearSet.add(parsedDate.getFullYear());
      }
    });

    return Array.from(yearSet).sort((left, right) => right - left);
  }, [transactions]);

  const currentSystemPeriod = new Date().toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const handleReset = () => {
    const now = new Date();

    dispatch({
      type: "UPDATE_REPORTING_PERIOD",
      payload: {
        granularity: "month",
        month: now.getMonth(),
        year: now.getFullYear(),
      },
    });
  };

  return (
    <section className="trading-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-white">
            <CalendarRange size={18} className="text-brand-green" />
            <h3 className="text-sm font-bold uppercase tracking-widest">Periodo de Analise</h3>
          </div>
          <p className="text-sm text-slate-300">
            Relatorios e indicadores consideram o periodo selecionado.
          </p>
          <p className="mt-1 text-xs text-slate-500">Hoje: {currentSystemPeriod}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
          <select
            className="rounded-lg border border-brand-border bg-slate-900 px-3 py-2 text-sm text-slate-200"
            value={reportingPeriod.granularity}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_REPORTING_PERIOD",
                payload: { granularity: event.target.value as ReportingGranularity },
              })
            }
          >
            <option value="month">Mensal</option>
            <option value="year">Anual</option>
          </select>

          {reportingPeriod.granularity === "month" && (
            <select
              className="rounded-lg border border-brand-border bg-slate-900 px-3 py-2 text-sm text-slate-200"
              value={reportingPeriod.month}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_REPORTING_PERIOD",
                  payload: { month: Number(event.target.value) },
                })
              }
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          )}

          <select
            className="rounded-lg border border-brand-border bg-slate-900 px-3 py-2 text-sm text-slate-200"
            value={reportingPeriod.year}
            onChange={(event) =>
              dispatch({
                type: "UPDATE_REPORTING_PERIOD",
                payload: { year: Number(event.target.value) },
              })
            }
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <RotateCcw size={16} /> Atual
          </button>
        </div>
      </div>
    </section>
  );
}
