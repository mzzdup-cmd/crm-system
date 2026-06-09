import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  CHART_COLORS,
  PIE_COLORS,
  CHART_THEME,
} from "../../constants/analytics";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: CHART_THEME.tooltipBg,
        border: `1px solid ${CHART_THEME.tooltipBorder}`,
      }}
    >
      <div className="text-slate-300 mb-1">

        {label}

      </div>

      {

        payload.map((entry) => (

          <div
            key={entry.name}
            style={{ color: entry.color }}
          >

            {entry.name}: {entry.value}

          </div>

        ))

      }

    </div>
  );
}

export function RevenueLineChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <LineChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="date"
          stroke={CHART_THEME.axis}
        />
        <YAxis
          stroke={CHART_THEME.axis}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Выручка"
          stroke={CHART_COLORS.green}
          strokeWidth={3}
          dot={{ fill: CHART_COLORS.green }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ManagerBarChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
        />
        <YAxis
          stroke={CHART_THEME.axis}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="revenue"
          name="Выручка"
          fill={CHART_COLORS.cyan}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DealsPieChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={95}
          label
        >
          {

            data.map((entry, index) => (

              <Cell
                key={entry.name}
                fill={
                  PIE_COLORS[
                    index % PIE_COLORS.length
                  ]
                }
              />

            ))

          }
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrafficLoadChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
        />
        <YAxis
          stroke={CHART_THEME.axis}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="load"
          name="Load"
          fill={CHART_COLORS.yellow}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={280}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          label
        >
          <Cell fill={CHART_COLORS.yellow} />
          <Cell fill={CHART_COLORS.red} />
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ManagerKpiChart({ data }) {
  return (
    <ResponsiveContainer
      width="100%"
      height={300}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
        />
        <YAxis
          stroke={CHART_THEME.axis}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        <Bar
          dataKey="newDeals"
          name="Новые"
          fill={CHART_COLORS.green}
          stackId="a"
        />
        <Bar
          dataKey="topups"
          name="Доплаты"
          fill={CHART_COLORS.cyan}
          stackId="a"
        />
        <Bar
          dataKey="upsells"
          name="Апсэйлы"
          fill={CHART_COLORS.pink}
          stackId="a"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
