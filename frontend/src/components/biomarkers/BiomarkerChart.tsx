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
  locale?: string;
}

/** Custom tooltip for single-metric charts. */
function SingleTooltip({
  active,
  payload,
  label,
  locale = "en",
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: BiomarkerDataPoint }>;
  label?: string;
  locale?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const isUrdu = locale === "ur";
  const statusLabel =
    point.status === "normal"
      ? (isUrdu ? "محفوظ / نارمل" : "Safe / Normal")
      : point.status === "high"
      ? (isUrdu ? "نارمل سے زیادہ" : "Higher Than Normal")
      : (isUrdu ? "نارمل سے کم" : "Lower Than Normal");

  const formattedDate = (() => {
    const raw = label ?? point.test_date;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  return (
    <div className="rounded-lg border border-vault-border bg-card px-3 py-2 shadow-lg dark:border-border">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">
        {formattedDate}
      </p>
      <p className="text-sm font-bold text-vault-teal dark:text-teal-300">
        {point.value} {point.unit}
      </p>
      <p
        className={`text-xs font-bold ${
          point.status === "normal"
            ? "text-emerald-600 dark:text-emerald-400"
            : point.status === "high"
            ? "text-vault-red"
            : "text-blue-600 dark:text-blue-400"
        }`}
      >
        {isUrdu ? "حالت:" : "Status:"} {statusLabel}
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
  locale = "en",
}: SingleChartProps) {
  const isUrdu = locale === "ur";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
        <XAxis
          dataKey="test_date"
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return isNaN(d.getTime())
              ? v
              : d.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", {
                  month: "short",
                  year: "2-digit",
                });
          }}
          className="text-xs font-semibold"
          tick={{ fontSize: 11, fill: "currentColor" }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: "currentColor" }}
          label={{
            value: unit,
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fontWeight: "bold", fill: "#0D5C4A" },
          }}
        />
        <Tooltip content={<SingleTooltip locale={locale} />} />
        <Legend
          wrapperStyle={{ fontSize: 12, fontWeight: "bold" }}
          formatter={() => metricName}
        />

        {/* Reference range lines */}
        {refMin != null && (
          <ReferenceLine
            y={refMin}
            stroke="#10b981"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: `${isUrdu ? "محفوظ کم از کم:" : "Safe Min:"} ${refMin}`,
              position: "right",
              fontSize: 10,
              fill: "#10b981",
              fontWeight: "bold",
            }}
          />
        )}
        {refMax != null && (
          <ReferenceLine
            y={refMax}
            stroke="#10b981"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: `${isUrdu ? "محفوظ زیادہ سے زیادہ:" : "Safe Max:"} ${refMax}`,
              position: "right",
              fontSize: 10,
              fill: "#10b981",
              fontWeight: "bold",
            }}
          />
        )}

        {/* Custom threshold lines */}
        {refLines?.map((rl) => (
          <ReferenceLine
            key={rl.value}
            y={rl.value}
            stroke={rl.color}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: rl.label,
              position: "right",
              fontSize: 10,
              fill: rl.color,
              fontWeight: "bold",
            }}
          />
        ))}

        <Line
          type="monotone"
          dataKey="value"
          stroke="#0D5C4A"
          strokeWidth={3}
          dot={{ r: 5, fill: "#0D5C4A", stroke: "#FFFFFF", strokeWidth: 2 }}
          activeDot={{ r: 7, fill: "#0A8C6A" }}
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
  locale?: string;
  ldlTargetLabel?: string;
  hdlMinLabel?: string;
}

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
  locale = "en",
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
  lines: LipidLine[];
  locale?: string;
}) {
  if (!active || !payload?.length) return null;
  const isUrdu = locale === "ur";
  const formattedDate = (() => {
    const raw = label ?? "";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  return (
    <div className="rounded-lg border border-vault-border bg-card px-3 py-2 shadow-lg dark:border-border">
      <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
        {formattedDate}
      </p>
      {payload.map((p) => {
        const line = lines.find((l) => l.key === p.dataKey);
        return (
          <p key={p.dataKey} className="text-xs font-bold" style={{ color: line?.color }}>
            <span>{line?.label}:</span> {p.value} mg/dL
          </p>
        );
      })}
    </div>
  );
}

export function LipidMultiChart({
  lines,
  locale = "en",
  ldlTargetLabel = "Safe LDL Target <100",
  hdlMinLabel = "Safe HDL Min >40",
}: MultiChartProps) {
  const merged = mergeLipidData(lines);
  const isUrdu = locale === "ur";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={merged}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
        <XAxis
          dataKey="test_date"
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return isNaN(d.getTime())
              ? v
              : d.toLocaleDateString(isUrdu ? "ur-PK" : "en-US", {
                  month: "short",
                  year: "2-digit",
                });
          }}
          className="text-xs font-semibold"
          tick={{ fontSize: 11, fill: "currentColor" }}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11, fill: "currentColor" }}
          label={{
            value: "mg/dL",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fontWeight: "bold", fill: "#0D5C4A" },
          }}
        />
        <Tooltip content={<MultiTooltip lines={lines} locale={locale} />} />
        <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold" }} />

        {/* Reference lines for Lipid panel */}
        <ReferenceLine
          y={100}
          stroke="#C0392B"
          strokeDasharray="5 3"
          strokeWidth={1.5}
          label={{
            value: ldlTargetLabel,
            position: "right",
            fontSize: 10,
            fill: "#C0392B",
            fontWeight: "bold",
          }}
        />
        <ReferenceLine
          y={40}
          stroke="#10b981"
          strokeDasharray="5 3"
          strokeWidth={1.5}
          label={{
            value: hdlMinLabel,
            position: "right",
            fontSize: 10,
            fill: "#10b981",
            fontWeight: "bold",
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
