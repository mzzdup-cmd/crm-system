import {
  useEffect,
  useState,
  useMemo,
} from "react";

import { useAuth } from "../context/AuthContext";

import {
  subscribeToNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

export function useNotifications() {
  const { userData } = useAuth();

  const [notifications, setNotifications] =
    useState([]);

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    if (!userData?.uid) {
      setNotifications([]);
      return undefined;
    }

    setConnected(true);

    const unsubscribe =
      subscribeToNotifications(
        userData.uid,
        (items) => {
          setNotifications(items);
        }
      );

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [userData?.uid]);

  const unreadCount = useMemo(
    () =>
      countUnreadNotifications(
        notifications
      ),
    [notifications]
  );

  async function markRead(id) {
    await markNotificationRead(id);

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
              readAt: Date.now(),
            }
          : item
      )
    );
  }

  async function markAllRead() {
    if (!userData?.uid) {
      return;
    }

    await markAllNotificationsRead(
      userData.uid,
      notifications
    );

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
        readAt: Date.now(),
      }))
    );
  }

  return {
    notifications,
    unreadCount,
    connected,
    markRead,
    markAllRead,
  };
}
