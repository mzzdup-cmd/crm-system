import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import {
  getManagerByName,
  getManagerById,
} from "../constants/managers";
import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";
import {
  isLeadership,
  getCurrentManagerId,
  resolveManagerFieldsForWrite,
} from "../domain/auth/roleHelpers";
import {
  buildWriteAuditFields,
} from "../domain/audit/auditFields";
import {
  canAccessClient,
} from "../domain/auth/permissionHelpers";
import { resolveNextPaymentDate } from "../domain/client/clientDates";
import { getClientStatus, getRemain } from "../domain/client/clientStatus";
import { resolveMissingVkRemindersForClient } from "./missingVkReminderService";
import { queueTtVkResyncForClient } from "./ttVkResyncService";

function mapClientDoc(snapshot) {
  const data = snapshot.data();
  const normalized =
    normalizeClientPayload(data);

  return {
    id: snapshot.id,
    ...normalized,
  };
}

export function normalizeClientPayload(data) {
  const { managerId, manager } =
    normalizeManagerFields(data);

  return {
    ...data,
    manager,
    managerId,
    amount: Number(data.amount || 0),
    budget: Number(data.budget || 0),
  };
}

export function enrichClient(client) {
  const normalized = normalizeClientPayload(client);

  return {
    ...normalized,
    remain: getRemain(normalized),
    status: getClientStatus(normalized),
  };
}

export async function getAllClients() {
  const snapshot = await getDocs(
    collection(db, "clients")
  );

  return snapshot.docs.map(mapClientDoc);
}

export async function getClientsForUser(userData) {
  if (isLeadership(userData)) {
    return getAllClients();
  }

  const managerId =
    getCurrentManagerId(userData);

  if (!managerId) {
    return [];
  }

  const clientsQuery = query(
    collection(db, "clients"),
    where(
      "managerId",
      "==",
      managerId
    )
  );

  const snapshot =
    await getDocs(clientsQuery);

  return snapshot.docs.map(mapClientDoc);
}

export async function getClientById(id) {
  const ref = doc(db, "clients", id);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return mapClientDoc(snapshot);
}

export async function getClientByIdForUser(
  id,
  userData
) {
  try {
    const client =
      await getClientById(id);

    if (!client) {
      return null;
    }

    if (!canAccessClient(userData, client)) {
      return null;
    }

    return client;
  } catch {
    return null;
  }
}

export async function findClientByDialogLink(
  dialogLink,
  userData = null
) {
  if (!dialogLink) {
    return null;
  }

  try {
    const clientsQuery = query(
      collection(db, "clients"),
      where("dialogLink", "==", dialogLink)
    );

    const snapshot = await getDocs(clientsQuery);

    if (snapshot.empty) {
      return null;
    }

    const client = mapClientDoc(snapshot.docs[0]);

    if (
      userData &&
      !canAccessClient(userData, client)
    ) {
      return null;
    }

    return client;
  } catch (error) {
    console.warn(
      "Client lookup by dialog link failed:",
      error
    );

    return null;
  }
}

export async function addClient(formData) {
  const {
    userData,
    createdByUid,
    ...rest
  } = formData;

  const managerFields =
    userData
      ? resolveManagerFieldsForWrite(
          userData,
          rest.manager
        )
      : normalizeManagerFields(rest);

  const payload = normalizeClientPayload({
    ...rest,
    ...managerFields,
    ...(rest.vkLink !== undefined
      ? {
          vkLink: rest.vkLink,
        }
      : {}),
  });

  const nextPaymentDate = resolveNextPaymentDate({
    amount: payload.amount,
    budget: payload.budget,
    paymentDate: payload.paymentDate,
  });

  const authUid =
    auth.currentUser?.uid ?? null;
  const auditFields = userData
    ? buildWriteAuditFields(
        userData,
        createdByUid || authUid
      )
    : {};

  const docRef = await addDoc(
    collection(db, "clients"),
    {
      ...payload,
      nextPaymentDate,
      ...auditFields,
    }
  );

  return {
    id: docRef.id,
    ...payload,
    nextPaymentDate,
  };
}

export async function updateClient(id, data) {
  const ref = doc(db, "clients", id);

  const payload = {
    ...data,
    updatedAt: Date.now(),
  };

  if (
    "manager" in data ||
    "managerId" in data
  ) {
    const { managerId, manager } =
      normalizeManagerFields(data);

    payload.managerId = managerId;
    payload.manager = manager;
  }

  if ("amount" in data) {
    payload.amount = Number(data.amount || 0);
  }

  if ("budget" in data) {
    payload.budget = Number(data.budget || 0);
  }

  if ("vkLink" in data) {
    payload.vkLink = data.vkLink;
  }

  await updateDoc(ref, payload);

  if (data.vkLink?.trim()) {
    const client = await getClientById(id);

    if (client) {
      try {
        await resolveMissingVkRemindersForClient(
          client
        );
      } catch (error) {
        console.warn(
          "Missing VK reminder resolve skipped:",
          id,
          error
        );
      }

      try {
        await queueTtVkResyncForClient(id);
      } catch (error) {
        console.warn(
          "TT VK resync queue skipped:",
          id,
          error
        );
      }
    }
  }
}

import {
  SUBSCRIPTION_OUTCOMES,
} from "../domain/client/subscriptionOutcome";

export async function markSubscriptionChurned(
  clientId
) {
  await updateClient(clientId, {
    subscriptionOutcome:
      SUBSCRIPTION_OUTCOMES.CHURNED,
    subscriptionClosedAt: Date.now(),
    nextPaymentDate: null,
  });
}

/** @deprecated use getClientsForUser */
export function filterClientsByAccess(clients, userData) {
  if (isLeadership(userData)) {
    return clients;
  }

  const userManagerId = userData?.managerId;
  const userName = userData?.name;

  return clients.filter((client) => {
    if (userManagerId && client.managerId) {
      return client.managerId === userManagerId;
    }

    return client.manager === userName;
  });
}

export function resolveManagerDisplayName(managerKey) {
  if (!managerKey) {
    return "";
  }

  const byName = getManagerByName(managerKey);

  if (byName) {
    return byName.name;
  }

  const byId = getManagerById(managerKey);

  return byId?.name || managerKey;
}
