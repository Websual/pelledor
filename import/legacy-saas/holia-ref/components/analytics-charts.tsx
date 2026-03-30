"use client";

import {
  ResponsiveContainer,
  AreaChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
} from "recharts";

const CHART_GREEN = "#9bb49b";

interface ViewsChartProps {
  data: Array<{ date: string; views: number }>;
}

export function ViewsChart({ data }: ViewsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-anthracite/60">
        <p>Aucune donnée disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: 14,
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              });
            }}
          />
          <Area
            type="monotone"
            dataKey="views"
            fill={CHART_GREEN}
            fillOpacity={0.4}
            stroke={CHART_GREEN}
            strokeWidth={2}
            dot={{ fill: CHART_GREEN, r: 4 }}
            activeDot={{ r: 6 }}
            name="Vues"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ClicksChartProps {
  data: Array<{ date: string; clicks: number }>;
}

export function ClicksChart({ data }: ClicksChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-anthracite/60">
        <p>Aucune donnée disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: 14,
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              });
            }}
          />
          <Bar
            dataKey="clicks"
            fill={CHART_GREEN}
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
            name="Clics"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ChartDataPoint {
  date: string;
  dateLabel?: string;
  views?: number;
  clicks?: number;
  revenue?: number;
  appointments?: number;
}

interface OverviewChartProps {
  data: ChartDataPoint[];
}

/** Vue d'ensemble : Revenus nets (Bar) + Nombre de rendez-vous (Bar), sans vues */
const formatRevenueEuros = (val: number | undefined) => {
  const n = Number(val ?? 0);
  return `${(n / 100).toFixed(2)} €`;
};

export function OverviewChart({ data }: OverviewChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-anthracite/60">
        <p>Aucune donnée disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            allowDecimals={false}
            name="RDV"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            tickFormatter={(v) => `${(Number(v) / 100).toFixed(0)} €`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: 14,
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              });
            }}
            formatter={(value: number, name: string) => {
              if (name === "revenue" || name === "Revenus nets")
                return [formatRevenueEuros(value), "Revenus nets"];
              if (name === "appointments" || name === "Rendez-vous")
                return [value, "Rendez-vous"];
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="square" />
          <Bar
            yAxisId="left"
            dataKey="appointments"
            fill={CHART_GREEN}
            fillOpacity={0.5}
            radius={[4, 4, 0, 0]}
            name="Rendez-vous"
          />
          <Bar
            yAxisId="right"
            dataKey="revenue"
            fill={CHART_GREEN}
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
            name="Revenus nets"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CombinedChartProps {
  viewsData: Array<{ date: string; views: number }>;
  clicksData: Array<{ date: string; clicks: number }>;
}

export function CombinedChart({ viewsData, clicksData }: CombinedChartProps) {
  const combinedData = viewsData.map((view) => {
    const click = clicksData.find((c) => c.date === view.date);
    return {
      date: view.date,
      views: view.views,
      clicks: click?.clicks || 0,
    };
  });

  if (combinedData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-anthracite/60">
        <p>Aucune donnée disponible pour le moment</p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combinedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: 14,
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
              });
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="square" />
          <Area
            type="monotone"
            dataKey="views"
            fill={CHART_GREEN}
            fillOpacity={0.5}
            stroke={CHART_GREEN}
            strokeWidth={2}
            name="Vues du profil"
          />
          <Area
            type="monotone"
            dataKey="clicks"
            fill="#2f2f2f"
            fillOpacity={0.3}
            stroke="#2f2f2f"
            strokeWidth={2}
            name="Clics réserver"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

