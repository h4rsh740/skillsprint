"use client";

import dynamic from "next/dynamic";
import React from "react";

const RechartsAreaChart = dynamic(
  async () => {
    const mod = await import("recharts");
    const {
      ResponsiveContainer,
      AreaChart,
      XAxis,
      YAxis,
      CartesianGrid,
      Area,
      Tooltip,
    } = mod;

    return function AreaChartComponent({ data }: { data: any[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl animate-pulse text-slate-400 text-xs font-medium">
        Loading Progress Chart...
      </div>
    ),
  }
);

export function DynamicAreaChart({ data }: { data: any[] }) {
  return <RechartsAreaChart data={data} />;
}
