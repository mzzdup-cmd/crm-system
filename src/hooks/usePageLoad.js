import {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useAuth }
from "../context/AuthContext";

const DEFAULT_TIMEOUT_MS = 12000;

export function usePageLoad(
  loadFn,
  deps = [],
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const {
    userData,
    loading: authLoading,
  } = useAuth();

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [timedOut, setTimedOut] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userData) {
      setData(null);
      setLoading(false);
      setError(
        "Не удалось загрузить профиль пользователя"
      );
      setTimedOut(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);
    setTimedOut(false);

    const timeoutId =
      window.setTimeout(() => {
        if (!cancelled) {
          setTimedOut(true);
          console.warn(
            "[usePageLoad] request timed out"
          );
        }
      }, timeoutMs);

    (async () => {
      try {
        const result =
          await loadFn(userData);

        if (cancelled) {
          return;
        }

        window.clearTimeout(timeoutId);
        setData(result);
        setLoading(false);
        setTimedOut(false);
      } catch (loadError) {
        console.error(
          "[usePageLoad]",
          loadError
        );

        if (cancelled) {
          return;
        }

        window.clearTimeout(timeoutId);
        setData(null);
        setLoading(false);
        setError(
          loadError?.message ||
            "Ошибка загрузки данных"
        );
        setTimedOut(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    authLoading,
    userData,
    reloadKey,
    timeoutMs,
    ...deps,
  ]);

  return {
    data,
    loading: authLoading || loading,
    error,
    timedOut,
    reload,
    userData,
  };
}
