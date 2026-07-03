import {
  useEffect,
  useState,
} from "react";

import {
  getAdminAnalytics,
  ANALYTICS_PERIODS,
} from "../services/analyticsService";

export function useAdminAnalytics(
  initialPeriod = ANALYTICS_PERIODS.MONTH
) {
  const [period, setPeriod] =
    useState(initialPeriod);

  const [customRange, setCustomRange] =
    useState({});

  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period, customRange]);

  async function loadAnalytics() {
    setLoading(true);

    try {
      const report =
        await getAdminAnalytics({
          period,
          customRange,
        });

      setData(report);
    } catch (error) {
      console.error(
        "[useAdminAnalytics] load failed:",
        error
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    loading,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    reload: loadAnalytics,
  };
}
