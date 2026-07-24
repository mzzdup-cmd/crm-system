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
  getManagerNameById,
} from "../constants/managers";
import {
  normalizeManagerFields,
} from "../domain/auth/managerMigration";
import {
  isLeadership,
  getCurrentManagerId,
  getManagerIdsForScopedQuery,
  resolveManagerFieldsForWrite,
} from "../domain/auth/roleHelpers";
import {
  buildWriteAuditFields,
} from "../domain/audit/auditFields";
import {
  canAccessClient,
  canAccessPayment,
} from "../domain/auth/permissionHelpers";
import {
  dialogLinksMatch,
  getDialogLinkLookupVariants,
  extractDialogId,
  resolveDialogLookupId,
} from "../domain/client/dialogLinkUtils";
import {
  clientCanonicalDialogMatches,
  clientMatchesDialogLookup,
} from "../domain/client/clientDialogLookup";
import { resolveNextPaymentDate } from "../domain/client/clientDates";
import { getClientStatus, getRemain } from "../domain/client/clientStatus";
import { resolveMissingVkRemindersForClient } from "./missingVkReminderService";
import {
  queueTtVkResyncForClient,
  queueTtRowResyncForClient,
} from "./ttVkResyncService";

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
  const dialogLink =
    data.dialogLink?.trim() || "";
  const dialogId =
    data.dialogId?.trim() ||
    extractDialogId(dialogLink) ||
    "";

  return {
    ...data,
    manager,
    managerId,
    dialogLink,
    dialogId,
    amount: Number(data.amount || 0),
    budget: Number(data.budget || 0),
    fromTt: data.fromTt === true,
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

  const managerIds =
    getManagerIdsForScopedQuery(userData);

  if (!managerIds.length) {
    return [];
  }

  const clientMap = new Map();

  for (const managerId of managerIds) {
    try {
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

      snapshot.docs.forEach((clientDoc) => {
        clientMap.set(
          clientDoc.id,
          mapClientDoc(clientDoc)
        );
      });
    } catch (error) {
      console.warn(
        `[clientService] clients query failed for ${managerId}:`,
        error
      );
    }
  }

  return [...clientMap.values()];
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

function resolveRecordOwnerLabel(data = {}) {
  return (
    data.manager?.trim() ||
    getManagerNameById(data.managerId) ||
    data.managerId ||
    "другой менеджер"
  );
}

function pickBlockedOwner(
  current,
  candidate
) {
  if (!candidate?.managerLabel) {
    return current;
  }

  if (!current?.managerLabel) {
    return candidate;
  }

  return current;
}

async function tryResolveClientFromPayment(
  paymentData,
  userData,
  blockedOwner
) {
  if (
    userData &&
    !canAccessPayment(
      userData,
      paymentData
    )
  ) {
    return {
      client: null,
      accessDenied: true,
      blockedOwner: pickBlockedOwner(
        blockedOwner,
        {
          managerLabel:
            resolveRecordOwnerLabel(
              paymentData
            ),
          dealType:
            paymentData.dealType || "",
          source: "payment",
        }
      ),
    };
  }

  if (!paymentData.clientId) {
    return {
      client: null,
      accessDenied: false,
      blockedOwner,
    };
  }

  let client = null;

  try {
    client = await getClientById(
      paymentData.clientId
    );
  } catch (error) {
    if (
      error?.code === "permission-denied"
    ) {
      return {
        client: null,
        accessDenied: true,
        blockedOwner: pickBlockedOwner(
          blockedOwner,
          {
            managerLabel:
              resolveRecordOwnerLabel(
                paymentData
              ),
            dealType:
              paymentData.dealType || "",
            source: "payment",
          }
        ),
      };
    }

    throw error;
  }

  if (!client) {
    return {
      client: null,
      accessDenied: false,
      blockedOwner,
    };
  }

  if (
    userData &&
    !canAccessClient(
      userData,
      client
    )
  ) {
    return {
      client: null,
      accessDenied: true,
      blockedOwner: pickBlockedOwner(
        blockedOwner,
        {
          managerLabel:
            resolveRecordOwnerLabel(
              client
            ),
          source: "client",
        }
      ),
    };
  }

  return {
    client,
    accessDenied: false,
    blockedOwner,
  };
}

async function queryDocsSafely(firestoreQuery) {
  try {
    return await getDocs(firestoreQuery);
  } catch (error) {
    if (error?.code === "permission-denied") {
      return null;
    }

    throw error;
  }
}

function getPaymentBsId(payment = {}) {
  return String(
    payment.legacyClientBsId ||
      payment.clientNote ||
      ""
  ).trim();
}

function bsIdsMatch(left, right) {
  const a = String(left || "").trim();
  const b = String(right || "").trim();

  return Boolean(a && b && a === b);
}

function clientMatchesBsId(
  client,
  bsId
) {
  if (!bsId) {
    return true;
  }

  return bsIdsMatch(
    client?.clientNote,
    bsId
  );
}

async function searchPaymentsByBsId({
  bsId,
  userData,
  blockedOwner,
}) {
  if (!bsId) {
    return {
      accessDenied: false,
      blockedOwner,
    };
  }

  let accessDenied = false;
  let owner = blockedOwner;
  const candidates = [];

  for (const field of [
    "clientNote",
    "legacyClientBsId",
  ]) {
    const snapshot =
      await queryDocsSafely(
        query(
          collection(db, "payments"),
          where(field, "==", bsId)
        )
      );

    if (!snapshot) {
      continue;
    }

    for (const paymentDoc of snapshot.docs) {
      const paymentData =
        paymentDoc.data();

      if (paymentData.deletedAt) {
        continue;
      }

      const resolved =
        await tryResolveClientFromPayment(
          paymentData,
          userData,
          owner
        );

      owner = resolved.blockedOwner;

      if (resolved.accessDenied) {
        accessDenied = true;
        continue;
      }

      if (resolved.client) {
        candidates.push({
          client: resolved.client,
          payment: paymentData,
          bsIdMatch: true,
        });
      }
    }
  }

  if (candidates.length) {
    return {
      client: candidates[0].client,
      status: "found",
      accessDenied,
      blockedOwner: owner,
    };
  }

  return {
    accessDenied,
    blockedOwner: owner,
  };
}

async function searchOwnedClientsByBsId(
  bsId,
  userData
) {
  if (!bsId || !userData) {
    return null;
  }

  const ownedClients =
    await getClientsForUser(userData);

  return (
    ownedClients.find((client) =>
      clientMatchesBsId(
        client,
        bsId
      )
    ) || null
  );
}

async function searchPaymentsForDialog({
  dialogId,
  variants,
  dialogLink,
  userData,
  blockedOwner,
  bsId = "",
}) {
  let accessDenied = false;
  let owner = blockedOwner;
  const candidates = [];
  const dialogCollisions = [];

  const paymentQueries = [];

  if (dialogId) {
    paymentQueries.push(
      query(
        collection(db, "payments"),
        where("dialogId", "==", dialogId)
      )
    );
  }

  for (const variant of variants) {
    paymentQueries.push(
      query(
        collection(db, "payments"),
        where(
          "dialogLink",
          "==",
          variant
        )
      )
    );
  }

  for (const paymentQuery of paymentQueries) {
    const snapshot =
      await queryDocsSafely(paymentQuery);

    if (!snapshot) {
      continue;
    }

    for (const paymentDoc of snapshot.docs) {
      const paymentData =
        paymentDoc.data();

      if (paymentData.deletedAt) {
        continue;
      }

      if (
        dialogLink &&
        dialogId &&
        !paymentData.dialogId &&
        !dialogLinksMatch(
          paymentData.dialogLink,
          dialogLink
        )
      ) {
        continue;
      }

      const resolved =
        await tryResolveClientFromPayment(
          paymentData,
          userData,
          owner
        );

      owner = resolved.blockedOwner;

      if (resolved.accessDenied) {
        accessDenied = true;
        continue;
      }

      if (resolved.client) {
        if (
          dialogId &&
          !clientCanonicalDialogMatches(
            resolved.client,
            dialogLink,
            dialogId,
            paymentData
          )
        ) {
          dialogCollisions.push({
            client: resolved.client,
            payment: paymentData,
          });
          continue;
        }

        const paymentBsId =
          getPaymentBsId(paymentData);
        const bsIdMatch =
          !bsId ||
          bsIdsMatch(paymentBsId, bsId) ||
          clientMatchesBsId(
            resolved.client,
            bsId
          );

        if (bsId && paymentBsId && !bsIdMatch) {
          continue;
        }

        candidates.push({
          client: resolved.client,
          payment: paymentData,
          bsIdMatch,
        });
      }
    }
  }

  if (candidates.length) {
    if (bsId) {
      const byBsId = candidates.find(
        (item) => item.bsIdMatch
      );

      if (byBsId) {
        return {
          client: byBsId.client,
          status: "found",
        };
      }

      return {
        accessDenied,
        blockedOwner: owner,
        collision: {
          client: candidates[0].client,
          paymentBsId: getPaymentBsId(
            candidates[0].payment
          ),
        },
      };
    }

    return {
      client: candidates[0].client,
      status: "found",
    };
  }

  if (dialogCollisions.length) {
    return {
      accessDenied,
      blockedOwner: owner,
      collision: {
        client:
          dialogCollisions[0].client,
        paymentDialogId:
          dialogCollisions[0].payment
            ?.dialogId ||
          extractDialogId(
            dialogCollisions[0].payment
              ?.dialogLink
          ),
        clientDialogId:
          dialogCollisions[0].client
            ?.dialogId ||
          extractDialogId(
            dialogCollisions[0].client
              ?.dialogLink
          ),
        kind: "dialog_client_mismatch",
      },
    };
  }

  return {
    accessDenied,
    blockedOwner: owner,
  };
}

async function searchClientsForDialog({
  dialogId,
  variants,
  userData,
  blockedOwner,
}) {
  if (!isLeadership(userData)) {
    return {
      client: null,
      accessDenied: false,
      blockedOwner,
    };
  }

  let accessDenied = false;
  let owner = blockedOwner;

  const clientQueries = [];

  if (dialogId) {
    clientQueries.push(
      query(
        collection(db, "clients"),
        where("dialogId", "==", dialogId)
      )
    );
  }

  for (const variant of variants) {
    clientQueries.push(
      query(
        collection(db, "clients"),
        where(
          "dialogLink",
          "==",
          variant
        )
      )
    );
  }

  for (const clientQuery of clientQueries) {
    const snapshot =
      await queryDocsSafely(clientQuery);

    if (!snapshot) {
      continue;
    }

    for (const clientDoc of snapshot.docs) {
      const client = mapClientDoc(clientDoc);

      if (
        userData &&
        !canAccessClient(
          userData,
          client
        )
      ) {
        accessDenied = true;
        owner = pickBlockedOwner(owner, {
          managerLabel:
            resolveRecordOwnerLabel(
              client
            ),
          source: "client",
        });
        continue;
      }

      return {
        client,
        status: "found",
        accessDenied: false,
        blockedOwner: owner,
      };
    }
  }

  return {
    client: null,
    accessDenied,
    blockedOwner: owner,
  };
}

async function searchOwnedClientsForDialog(
  dialogLink,
  userData
) {
  if (!userData) {
    return null;
  }

  const ownedClients =
    await getClientsForUser(userData);

  return (
    ownedClients.find((client) =>
      clientMatchesDialogLookup(
        client,
        dialogLink
      )
    ) || null
  );
}

export async function findClientByDialogLink(
  dialogLink,
  userData = null,
  options = {}
) {
  const bsId = String(
    options.bsId || ""
  ).trim();

  if (!dialogLink && !bsId) {
    return {
      client: null,
      status: "empty",
    };
  }

  try {
    if (bsId) {
      const ownedByBsId =
        await searchOwnedClientsByBsId(
          bsId,
          userData
        );

      if (ownedByBsId) {
        return {
          client: ownedByBsId,
          status: "found",
        };
      }

      const paymentByBsId =
        await searchPaymentsByBsId({
          bsId,
          userData,
          blockedOwner: null,
        });

      if (paymentByBsId.status === "found") {
        return {
          client: paymentByBsId.client,
          status: "found",
        };
      }
    }

    if (!dialogLink) {
      return {
        client: null,
        status: "not_found",
      };
    }

    const dialogId =
      resolveDialogLookupId(dialogLink);
    const variants =
      getDialogLinkLookupVariants(
        dialogLink
      );

    const ownedClient =
      await searchOwnedClientsForDialog(
        dialogLink,
        userData
      );

    if (ownedClient) {
      if (
        bsId &&
        !clientMatchesBsId(
          ownedClient,
          bsId
        )
      ) {
        return {
          client: null,
          status: "bs_id_mismatch",
          collision: {
            client: ownedClient,
            paymentBsId:
              ownedClient.clientNote || "",
          },
        };
      }

      return {
        client: ownedClient,
        status: "found",
      };
    }

    const clientResult =
      await searchClientsForDialog({
        dialogId,
        variants,
        userData,
        blockedOwner: null,
      });

    if (clientResult.status === "found") {
      const client = clientResult.client;

      if (
        bsId &&
        !clientMatchesBsId(
          client,
          bsId
        )
      ) {
        return {
          client: null,
          status: "bs_id_mismatch",
          collision: {
            client,
            paymentBsId:
              client.clientNote || "",
          },
        };
      }

      return {
        client,
        status: "found",
      };
    }

    if (
      clientResult.accessDenied &&
      clientResult.blockedOwner
    ) {
      return {
        client: null,
        status: "access_denied",
        blockedOwner:
          clientResult.blockedOwner,
      };
    }

    return {
      client: null,
      status: "not_found",
    };
  } catch (error) {
    console.warn(
      "Client lookup by dialog link failed:",
      error
    );

    return {
      client: null,
      status: "error",
      error,
    };
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

  if ("dialogLink" in data) {
    payload.dialogLink =
      data.dialogLink?.trim() || "";
    payload.dialogId =
      extractDialogId(payload.dialogLink) ||
      "";
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

  if (
    "budget" in data ||
    "tariff" in data
  ) {
    try {
      await queueTtRowResyncForClient(id);
    } catch (error) {
      console.warn(
        "TT row resync queue skipped:",
        id,
        error
      );
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
