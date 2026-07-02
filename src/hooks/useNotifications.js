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
  subscribeClientsForUser,
} from "../services/realtimeService";

import {
  NOTIFICATION_TYPES,
} from "../constants/notifications";

import {
  mergeMissingVkReminders,
  countActiveMissingVkReminders,
} from "../services/missingVkReminderService";

export function useNotifications() {
  const { userData } = useAuth();

  const [notifications, setNotifications] =
    useState([]);

  const [clients, setClients] =
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
        setNotifications
      );

    return () => {
      setConnected(false);
      unsubscribe();
    };
  }, [userData]);

  useEffect(() => {
    if (!userData) {
      setClients([]);
      return undefined;
    }

    return subscribeClientsForUser(
      userData,
      setClients
    );
  }, [userData]);

  const missingVkReminders = useMemo(
    () =>
      mergeMissingVkReminders(
        notifications,
        clients
      ),
    [notifications, clients]
  );

  const unreadCount = useMemo(() => {
    const standardUnread =
      countUnreadNotifications(
        notifications.filter(
          (item) =>
            item.type !==
            NOTIFICATION_TYPES.MISSING_VK_LINK
        )
      );

    const vkUnread =
      missingVkReminders.filter(
        (item) => !item.read
      ).length;

    return standardUnread + vkUnread;
  }, [notifications, missingVkReminders]);

  async function markRead(id) {
    if (
      String(id).startsWith(
        "missing_vk_client_"
      )
    ) {
      return;
    }

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
    if (
      String(id).startsWith(
        "missing_vk_client_"
      )
    ) {
      return;
    }

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
    missingVkReminders,
    unreadCount,
    connected,
    markRead,
    markResolved,
    markAllRead,
  };
}

export { countActiveMissingVkReminders };
