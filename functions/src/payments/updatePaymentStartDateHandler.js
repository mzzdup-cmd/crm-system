const admin = require("firebase-admin");

const { HttpsError } = require("firebase-functions/v2/https");

function resolveDealTypeId(value) {
  if (!value) {
    return "";
  }

  if (value === "ББ" || value === "bb") {
    return "bb";
  }

  if (value === "Рассылка" || value === "mailing") {
    return "mailing";
  }

  if (
    value === "Апсэйл" ||
    value === "Апсейл" ||
    value === "upsell"
  ) {
    return "upsell";
  }

  return String(value);
}

function isOptionalStartDateDealType(value) {
  const id = resolveDealTypeId(value);

  return (
    id === "bb" ||
    id === "mailing" ||
    id === "upsell"
  );
}

function canonicalManagerId(managerId) {
  const aliases = {
    katya: "katya_bakaeva",
    andrey: "andrey_volkov",
    denis: "denis_manuilov",
    ruslan: "ruslan_romanyuk",
    alexander: "alexander_simanov",
    sergey: "sergey_grebenshchikov",
    polina_plamadyala: "polina_plamadya",
    vilu_petrova: "vilu_petrova",
    violeta_petrova: "vilu_petrova",
  };

  return aliases[managerId] || managerId;
}

const SUBSCRIPTION_CYCLE_DAYS = 14;

function getNextPaymentDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  date.setDate(date.getDate() + SUBSCRIPTION_CYCLE_DAYS);
  return date.toISOString().split("T")[0];
}

function resolvePlannedStartDate(payment, client = null) {
  return (
    payment?.curatorStartDate?.trim() ||
    payment?.startDate?.trim() ||
    client?.startDate?.trim() ||
    ""
  );
}

function paymentAccessibleByUser(payment, user) {
  if (!payment || !user) {
    return false;
  }

  if (user.role === "admin" || user.role === "rop") {
    return true;
  }

  const userManagerId = canonicalManagerId(
    user.managerId || ""
  );

  const paymentManagerId = canonicalManagerId(
    payment.managerId || ""
  );

  if (
    userManagerId &&
    paymentManagerId &&
    userManagerId === paymentManagerId
  ) {
    return true;
  }

  if (
    user.name &&
    payment.manager &&
    user.name.trim() === payment.manager.trim()
  ) {
    return true;
  }

  return false;
}

async function updatePaymentStartDateHandler(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Войдите в систему"
    );
  }

  const paymentId = String(
    request.data?.paymentId || ""
  ).trim();

  const startDate = String(
    request.data?.startDate ?? ""
  ).trim();

  if (!paymentId) {
    throw new HttpsError(
      "invalid-argument",
      "paymentId обязателен"
    );
  }

  const db = admin.firestore();
  const uid = request.auth.uid;

  const userSnap = await db
    .collection("users")
    .doc(uid)
    .get();

  if (!userSnap.exists) {
    throw new HttpsError(
      "permission-denied",
      "Профиль пользователя не найден"
    );
  }

  const user = userSnap.data();

  const paymentRef = db
    .collection("payments")
    .doc(paymentId);

  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new HttpsError(
      "not-found",
      "Оплата не найдена"
    );
  }

  const payment = paymentSnap.data();

  if (
    !isOptionalStartDateDealType(
      payment.dealType
    ) &&
    !isOptionalStartDateDealType(
      payment.dealTypeId
    )
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Смена потока доступна только для ББ, Апсэйл и Рассылка"
    );
  }

  if (
    user.role !== "admin" &&
    user.role !== "rop" &&
    !paymentAccessibleByUser(
      payment,
      user
    )
  ) {
    throw new HttpsError(
      "permission-denied",
      "Нет прав на эту оплату"
    );
  }

  const payload = {
    startDate,
    updatedAt: Date.now(),
    updatedByUid: uid,
  };

  if (user.managerId) {
    payload.manager =
      user.name || payment.manager || "";
  }

  const hasTtRow = Boolean(
    payment.ttRowNumber ||
      payment.ttUpdatedRange
  );
  const startDateChanged =
    startDate !== (payment.startDate || "");

  if (
    payment.syncedToSheets === true &&
    hasTtRow &&
    startDateChanged
  ) {
    payload.ttStartDateResyncPending = true;
  }

  await paymentRef.update(payload);

  if (payment.clientId) {
    const clientRef = db
      .collection("clients")
      .doc(payment.clientId);
    const clientSnap = await clientRef.get();

    if (clientSnap.exists) {
      const client = clientSnap.data();
      const mergedPayment = {
        ...payment,
        startDate,
      };
      const effectiveStart =
        resolvePlannedStartDate(
          mergedPayment,
          client
        );
      const clientUpdate = {
        startDate: effectiveStart,
        updatedAt: Date.now(),
      };

      if (effectiveStart) {
        clientUpdate.nextPaymentDate =
          getNextPaymentDate(
            effectiveStart
          );
      }

      await clientRef.update(clientUpdate);
    }
  }

  return {
    ok: true,
    paymentId,
    startDate,
  };
}

module.exports = {
  updatePaymentStartDateHandler,
};
