"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

const data = [
  {
    period: "Aujourd'hui",
    arr: 0,
    practitioners: 0,
  },
  {
    period: "An 1",
    arr: 468000, // 468k€
    practitioners: 600,
  },
  {
    period: "An 2",
    arr: 2300000, // 2.3M€
    practitioners: 3000,
  },
  {
    period: "An 3",
    arr: 5800000, // 5.8M€
    practitioners: 7500,
  },
];

const formatARR = (value: number) => {
  if (value === 0) return "0€";
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M€`;
  }
  return `${(value / 1000).toFixed(0)}k€`;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const isLast = payload.period === "An 3";
  
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={isLast ? 8 : 6}
        fill="#9bb49b"
        stroke="white"
        strokeWidth={isLast ? 4 : 3}
        style={{ filter: "drop-shadow(0 2px 4px rgba(155, 180, 155, 0.3))" }}
      />
      {isLast && (
        <g>
          <circle
            cx={cx + 4}
            cy={cy - 4}
            r={3}
            fill="white"
            stroke="#9bb49b"
            strokeWidth={2}
          />
          <circle cx={cx + 4} cy={cy - 4} r={1.5} fill="#9bb49b" />
        </g>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-3 py-2 rounded-2xl shadow-lg border border-sauge/20 text-xs">
        <div className="font-bold text-anthracite mb-1">{data.period}</div>
        <div className="text-anthracite/60 mb-1">
          {data.practitioners.toLocaleString()} praticiens
        </div>
        <div className="text-sauge font-semibold">{formatARR(data.arr)} ARR</div>
        {data.period === "An 3" && (
          <div className="text-anthracite/50 text-xs mt-1">7% du marché</div>
        )}
      </div>
    );
  }
  return null;
};

export function ProjectionChart() {
  return (
    <div className="w-full h-[400px] md:h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="2 2" stroke="#e0e0e0" opacity={0.5} />
          <XAxis
            dataKey="period"
            stroke="#2f2f2f"
            style={{ fontSize: "14px", fontWeight: 600 }}
            tick={{ fill: "#2f2f2f" }}
          />
          <YAxis
            stroke="#2f2f2f"
            tick={{ fill: "#2f2f2f", fontSize: "12px" }}
            tickFormatter={formatARR}
            label={{
              value: "Revenu annuel récurrent (ARR)",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: "12px", fill: "#2f2f2f", opacity: 0.6 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="arr"
            stroke="#9bb49b"
            strokeWidth={4}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

