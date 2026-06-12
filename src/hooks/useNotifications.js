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
  markNotificationResolved,
  markAllNotificationsRead,
} from "../services/notificationService";

import {
  getClientsForUser,
} from "../services/clientService";

import {
  syncMissingVkResolutionForUser,
} from "../services/missingVkReminderService";

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

    getClientsForUser(userData)
      .then((clients) =>
        syncMissingVkResolutionForUser(
          userData.uid,
          clients
        )
      )
      .catch((error) => {
        console.error(
          "Missing VK sync failed:",
          error
        );
      });

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [userData]);

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

  async function markResolved(id) {
    await markNotificationResolved(id);

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
              readAt: Date.now(),
              resolved: true,
              resolvedAt: Date.now(),
            }
          : item
      )
    );
  }

  return {
    notifications,
    unreadCount,
    connected,
    markRead,
    markResolved,
    markAllRead,
  };
}
