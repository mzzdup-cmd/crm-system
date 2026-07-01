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
  syncMissingVkRemindersForUser,
  mergeMissingVkReminders,
} from "../services/missingVkReminderService";

import {
  NOTIFICATION_TYPES,
} from "../constants/notifications";

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
      setClients([]);
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
      .then((items) => {
        setClients(items);

        return Promise.all([
          syncMissingVkResolutionForUser(
            userData.uid,
            items
          ),
          syncMissingVkRemindersForUser(
            userData,
            items
          ),
        ]);
      })
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

  const missingVkReminders = useMemo(
    () =>
      mergeMissingVkReminders(
        notifications,
        clients
      ),
    [notifications, clients]
  );

  const unreadCount = useMemo(
    () =>
      countUnreadNotifications(
        notifications
      ) +
      missingVkReminders.filter(
        (item) => item.data?.fromClient
      ).length,
    [notifications, missingVkReminders]
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
    missingVkReminders,
    unreadCount,
    connected,
    markRead,
    markResolved,
    markAllRead,
  };
}
