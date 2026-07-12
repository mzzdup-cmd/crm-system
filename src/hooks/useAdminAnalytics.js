import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";

import {
  getAdminAnalytics,
  ANALYTICS_PERIODS,
  clearAnalyticsCache,
} from "../services/analyticsService";

export function useAdminAnalytics(
  initialPeriod = ANALYTICS_PERIODS.MONTH
) {
  const { userData } = useAuth();

  const [period, setPeriod] =
    useState(initialPeriod);

  const [customRange, setCustomRange] =
    useState({});

  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const loadAnalytics = useCallback(
    async () => {
      if (!userData) {
        return;
      }

      setLoading(true);

      try {
        const report =
          await getAdminAnalytics({
            userData,
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
    },
    [
      userData,
      period,
      customRange,
    ]
  );

  useEffect(() => {
    if (!userData) {
      setLoading(true);
      setData(null);
      return;
    }

    loadAnalytics();
  }, [loadAnalytics, userData]);

  function reload() {
    clearAnalyticsCache();
    return loadAnalytics();
  }

  return {
    data,
    loading,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    reload,
  };
}
