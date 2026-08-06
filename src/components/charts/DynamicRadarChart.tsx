"use client";

import dynamic from "next/dynamic";
import React from "react";

const RechartsRadarChart = dynamic(
  async () => {
    const mod = await import("recharts");
    const {
      ResponsiveContainer,
      RadarChart,
      PolarGrid,
      PolarAngleAxis,
      PolarRadiusAxis,
      Radar,
    } = mod;

    return function RadarChartComponent({ data }: { data: any[] }) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8" }} />
            <Radar name="Skills" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
          </RadarChart>
        </ResponsiveContainer>
      );
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl animate-pulse text-slate-400 text-xs font-medium">
        Loading Radar Chart...
      </div>
    ),
  }
);

export function DynamicRadarChart({ data }: { data: any[] }) {
  return <RechartsRadarChart data={data} />;
}
