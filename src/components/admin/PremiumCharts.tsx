import { memo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

type AreaPoint = { label: string; value: number };
type BarPoint = { label: string; value: number };
type PiePoint = { label: string; value: number; color?: string };

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--accent))",
  "hsl(var(--purple))",
  "hsl(var(--pink))",
  "hsl(var(--teal))",
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--foreground-secondary))", fontSize: 11 },
};

export const RevenueAreaChart = memo(function RevenueAreaChart({
  data, height = 220,
}: { data: AreaPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--foreground-tertiary))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--foreground-tertiary))" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5}
          fill="url(#rev-grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const CategoryBarChart = memo(function CategoryBarChart({
  data, height = 240,
}: { data: BarPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--foreground-tertiary))" }} axisLine={false} tickLine={false} />
        <YAxis dataKey="label" type="category" width={88}
          tick={{ fontSize: 11, fill: "hsl(var(--foreground-secondary))" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export const StatusPieChart = memo(function StatusPieChart({
  data, height = 220,
}: { data: PiePoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
});

export default { RevenueAreaChart, CategoryBarChart, StatusPieChart };
