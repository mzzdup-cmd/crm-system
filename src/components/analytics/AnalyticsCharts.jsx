import {
  useEffect,
  useRef,
  useState,
} from "react";

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

function buildChartRenderKey(data, valueKey = "value") {
  if (!Array.isArray(data) || !data.length) {
    return "empty";
  }

  const total = data.reduce(
    (sum, item) =>
      sum + Number(item?.[valueKey] || 0),
    0
  );

  return `${data.length}:${total}`;
}

const CHART_HEIGHT = 280;

const MANAGER_AXIS_PROPS = {
  interval: 0,
  angle: -35,
  textAnchor: "end",
  height: 72,
  tick: { fontSize: 11 },
};

function ChartEmpty({
  message = "Нет данных за период",
}) {
  return (
    <div
      className="
        flex h-full w-full flex-col items-center
        justify-center rounded-xl border border-dashed
        border-slate-700 bg-slate-800/30 px-4 text-center
      "
    >
      <div className="text-2xl mb-2 opacity-70">
        📊
      </div>
      <p className="text-slate-400 text-sm">
        {message}
      </p>
      <p className="text-slate-500 text-xs mt-1">
        Попробуйте «Месяц» или «Неделя»
      </p>
    </div>
  );
}

function ChartFrame({
  height = CHART_HEIGHT,
  isEmpty,
  emptyMessage,
  renderKey = "chart",
  children,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({
    width: 0,
    height,
  });

  useEffect(() => {
    const node = containerRef.current;

    if (!node || isEmpty) {
      return undefined;
    }

    const updateSize = () => {
      setSize({
        width: node.clientWidth,
        height:
          node.clientHeight || height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(
      updateSize
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [renderKey, isEmpty, height]);

  const canRender =
    size.width > 0 && size.height > 0;

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0"
      style={{
        height,
        minHeight: height,
      }}
    >
      {isEmpty ? (
        <ChartEmpty message={emptyMessage} />
      ) : canRender ? (
        <ResponsiveContainer
          width={size.width}
          height={size.height}
          minWidth={0}
        >
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-slate-800/40" />
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const fullName =
    payload[0]?.payload?.fullName;

  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: CHART_THEME.tooltipBg,
        border: `1px solid ${CHART_THEME.tooltipBorder}`,
      }}
    >
      <div className="text-slate-300 mb-1">

        {fullName || label}

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

function hasNumericValues(data, key = "value") {
  return Array.isArray(data)
    && data.some(
      (item) => Number(item?.[key] || 0) > 0
    );
}

export function RevenueLineChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !hasNumericValues(data, "revenue");

  return (
    <ChartFrame
      isEmpty={isEmpty}
      emptyMessage="Нет оплат за выбранный период"
      renderKey={buildChartRenderKey(
        data,
        "revenue"
      )}
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
    </ChartFrame>
  );
}

export function ManagerBarChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !hasNumericValues(data, "revenue");

  return (
    <ChartFrame
      isEmpty={isEmpty}
      emptyMessage="Нет выручки по менеджерам"
      renderKey={buildChartRenderKey(
        data,
        "revenue"
      )}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
          {...MANAGER_AXIS_PROPS}
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
    </ChartFrame>
  );
}

export function DealsPieChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !hasNumericValues(data, "value");

  return (
    <ChartFrame
      isEmpty={isEmpty}
      emptyMessage="Нет сделок за период"
      renderKey={buildChartRenderKey(
        data,
        "value"
      )}
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
    </ChartFrame>
  );
}

export function TrafficLoadChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !hasNumericValues(data, "load");

  return (
    <ChartFrame
      isEmpty={isEmpty}
      emptyMessage="Трафик не распределён"
      renderKey={buildChartRenderKey(
        data,
        "load"
      )}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
          {...MANAGER_AXIS_PROPS}
        />
        <YAxis
          stroke={CHART_THEME.axis}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="load"
          name="Нагрузка"
          fill={CHART_COLORS.yellow}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartFrame>
  );
}

export function SubscriptionChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !hasNumericValues(data, "value");

  return (
    <ChartFrame
      isEmpty={isEmpty}
      emptyMessage="Нет подписок и просрочек"
      renderKey={buildChartRenderKey(
        data,
        "value"
      )}
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
    </ChartFrame>
  );
}

export function ManagerKpiChart({ data }) {
  const isEmpty =
    !Array.isArray(data)
    || !data.length
    || !data.some(
      (item) =>
        Number(item?.newDeals || 0) > 0
        || Number(item?.topups || 0) > 0
        || Number(item?.upsells || 0) > 0
    );

  const renderKey = data
    .map(
      (item) =>
        `${item.name}:${item.newDeals}:${item.topups}:${item.upsells}`
    )
    .join("|");

  return (
    <ChartFrame
      height={300}
      isEmpty={isEmpty}
      emptyMessage="Нет KPI по менеджерам"
      renderKey={renderKey || "empty"}
    >
      <BarChart data={data}>
        <CartesianGrid
          stroke={CHART_THEME.grid}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          stroke={CHART_THEME.axis}
          {...MANAGER_AXIS_PROPS}
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
    </ChartFrame>
  );
}
