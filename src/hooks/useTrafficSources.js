import {
  useEffect,
  useState,
  useRef,
} from "react";

import { useAuth }
from "../context/AuthContext";

import {
  subscribeTrafficSources,
  ensureTrafficSourcesSeeded,
} from "../services/trafficSourceService";

import { isLeadership }
from "../domain/auth/roleHelpers";

export function useTrafficSources() {
  const { userData, user } = useAuth();

  const [sources, setSources] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [connected, setConnected] =
    useState(false);

  const seedStartedRef =
    useRef(false);

  useEffect(() => {
    if (!userData || seedStartedRef.current) {
      return;
    }

    seedStartedRef.current = true;

    if (!isLeadership(userData)) {
      return;
    }

    ensureTrafficSourcesSeeded({
      createdBy:
        user?.uid ||
        userData.uid ||
        "system",
    }).catch((error) => {
      if (isLeadership(userData)) {
        console.error(
          "[useTrafficSources] seed failed:",
          error
        );
      }
    });
  }, [userData, user?.uid]);

  useEffect(() => {
    if (!userData) {
      setSources([]);
      setLoading(false);
      return undefined;
    }

    setConnected(true);
    setLoading(true);

    const unsubscribe =
      subscribeTrafficSources(
        (items) => {
          setSources(items);
          setLoading(false);
        }
      );

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [userData]);

  const hasFirestoreSources =
    sources.some(
      (source) => !source.isFallback
    );

  return {
    sources,
    loading,
    connected,
    hasFirestoreSources,
  };
}
