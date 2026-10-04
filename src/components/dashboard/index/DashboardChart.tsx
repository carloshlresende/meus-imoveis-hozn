"use client"

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { createClient } from "@/lib/supabase/client";

type Charge = {
  period: string;
  amount: number;
  amount_paid: number;
};

const monthLabel = (period: string) => {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

const DashboardChart = () => {
  const supabase = createClient();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChart() {
      setLoading(true);

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startPeriod = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      const endPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("rent_charges")
        .select("period,amount,amount_paid")
        .gte("period", startPeriod)
        .lte("period", endPeriod)
        .order("period");

      if (error) {
        console.error("Erro ao carregar gráfico:", error);
        setCharges([]);
      } else {
        setCharges((data as Charge[]) ?? []);
      }

      setLoading(false);
    }

    loadChart();
  }, []);

  const chartRows = useMemo(() => {
    const now = new Date();
    const periods: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }

    return periods.map((period) => {
      const rows = charges.filter((c) => c.period === period);
      return {
        period,
        charged: rows.reduce((sum, c) => sum + Number(c.amount ?? 0), 0),
        received: rows.reduce((sum, c) => sum + Number(c.amount_paid ?? 0), 0),
      };
    });
  }, [charges]);

  const data = {
    labels: chartRows.map((row) => monthLabel(row.period)),
    datasets: [
      {
        label: "Cobrado",
        data: chartRows.map((row) => row.charged),
        borderWidth: 1,
      },
      {
        label: "Recebido",
        data: chartRows.map((row) => row.received),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label(context: any) {
            return `${context.dataset.label}: ${Number(context.raw).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback(value: string | number) {
            return Number(value).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            });
          },
        },
      },
    },
  };

  if (loading) {
    return <div style={{ minHeight: 320 }}>Carregando gráfico...</div>;
  }

  return (
    <div style={{ height: 320 }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default DashboardChart;
