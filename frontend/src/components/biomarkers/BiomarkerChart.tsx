"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BiomarkerDataPoint } from "@/types/models";

/* ── Single-metric chart (HbA1c, Glucose) ─────────────────── */
interface SingleChartProps {
  data: BiomarkerDataPoint[];
  metricName: string;
  unit: string;
  refMin?: number;
  refMax?: number;
  refLines?: { value: number; label: string; color: string }[];
}

/** Custom tooltip for single-metric charts. */
function SingleTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: BiomarkerDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-muted-foreground">
        {new Date(label ?? point.test_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="text-sm font-bold">
        {point.value} {point.unit}
      </p>
      <p
        className={`text-xs font-semibold ${
          point.status === "normal"
            ? "text-emerald-500"
            : point.status === "high"
              ? "text-red-500"
              : "text-blue-500"
        }`}
      >
        {point.status.toUpperCase()}
      </p>
    </div>
  );
}

export function BiomarkerLineChart({
  data,
  metricName,
  unit,
  refMin,
  refMax,
  refLines,
}: SingleChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="test_date"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          }
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 12 }}
          label={{
            value: unit,
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11 },
          }}
        />
        <Tooltip content={<SingleTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={() => metricName}
        />

        {/* Reference range shading */}
        {refMin != null && (
          <ReferenceLine
            y={refMin}
            stroke="#22c55e"
            strokeDasharray="6 4"
            strokeWidth={1}
            label={{
              value: `Min: ${refMin}`,
              position: "right",
              fontSize: 10,
              fill: "#22c55e",
            }}
          />
        )}
        {refMax != null && (
          <ReferenceLine
            y={refMax}
            stroke="#22c55e"
            strokeDasharray="6 4"
            strokeWidth={1}
            label={{
              value: `Max: ${refMax}`,
              position: "right",
              fontSize: 10,
              fill: "#22c55e",
            }}
          />
        )}

        {/* Custom reference lines (e.g., diabetes threshold) */}
        {refLines?.map((rl) => (
          <ReferenceLine
            key={rl.value}
            y={rl.value}
            stroke={rl.color}
            strokeDasharray="8 4"
            strokeWidth={1.5}
            label={{
              value: rl.label,
              position: "right",
              fontSize: 10,
              fill: rl.color,
            }}
          />
        ))}

        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(221, 83%, 53%)"
          strokeWidth={2.5}
          dot={{ r: 5, fill: "hsl(221, 83%, 53%)", strokeWidth: 2 }}
          activeDot={{ r: 7 }}
          name={metricName}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Multi-line chart (Lipid Profile) ─────────────────────── */
interface LipidLine {
  key: string;
  label: string;
  color: string;
  data: { test_date: string; value: number; unit: string }[];
}

interface MultiChartProps {
  lines: LipidLine[];
}

/** Merge all line data by date for Recharts. */
function mergeLipidData(lines: LipidLine[]) {
  const dateMap = new Map<
    string,
    Record<string, string | number>
  >();
  for (const line of lines) {
    for (const point of line.data) {
      const existing = dateMap.get(point.test_date) ?? {
        test_date: point.test_date,
      };
      existing[line.key] = point.value;
      dateMap.set(point.test_date, existing);
    }
  }
  return Array.from(dateMap.values());
}

function MultiTooltip({
  active,
  payload,
  label,
  lines,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
  lines: LipidLine[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        {new Date(label ?? "").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      {payload.map((p) => {
        const line = lines.find((l) => l.key === p.dataKey);
        return (
          <p key={p.dataKey} className="text-sm" style={{ color: line?.color }}>
            <span className="font-semibold">{line?.label}:</span> {p.value}{" "}
            mg/dL
          </p>
        );
      })}
    </div>
  );
}

export function LipidMultiChart({ lines }: MultiChartProps) {
  const merged = mergeLipidData(lines);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={merged}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="test_date"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            })
          }
          className="text-xs"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 12 }}
          label={{
            value: "mg/dL",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11 },
          }}
        />
        <Tooltip content={<MultiTooltip lines={lines} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {/* Reference lines for LDL */}
        <ReferenceLine
          y={100}
          stroke="#ef4444"
          strokeDasharray="6 4"
          strokeWidth={1}
          label={{
            value: "LDL target <100",
            position: "right",
            fontSize: 10,
            fill: "#ef4444",
          }}
        />
        <ReferenceLine
          y={40}
          stroke="#22c55e"
          strokeDasharray="6 4"
          strokeWidth={1}
          label={{
            value: "HDL target >40",
            position: "right",
            fontSize: 10,
            fill: "#22c55e",
          }}
        />

        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: line.color, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            name={line.label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
