import {
  DEFAULT_LEGACY_TT_DEAL_TYPE_ID,
  isTopupDealType,
  resolveDealTypeId,
} from "../../constants/dealTypes.js";

import {
  dialogLinksMatch,
  extractDialogId,
} from "../client/dialogLinkUtils.js";

function getLegacyBsId(payment) {
  return String(
    payment?.legacyClientBsId ||
      payment?.clientNote ||
      ""
  ).trim();
}

function paymentMatchesDialogLink(
  payment,
  normalizedLink,
  normalizedDialogId
) {
  if (
    dialogLinksMatch(
      payment.dialogLink,
      normalizedLink
    )
  ) {
    return true;
  }

  if (!normalizedDialogId) {
    return false;
  }

  return (
    extractDialogId(payment.dialogLink) ===
    normalizedDialogId
  );
}

function narrowDialogLinkMatches(payments) {
  const grouped = new Map();

  for (const payment of payments) {
    const bsId = getLegacyBsId(payment);

    if (!bsId) {
      continue;
    }

    if (!grouped.has(bsId)) {
      grouped.set(bsId, []);
    }

    grouped.get(bsId).push(payment);
  }

  if (grouped.size <= 1) {
    return payments;
  }

  let oldestBsId = null;
  let oldestCreatedAt = Infinity;

  for (const [bsId, group] of grouped) {
    const groupOldest = Math.min(
      ...group.map((payment) =>
        Number(payment.createdAt || 0)
      )
    );

    if (groupOldest < oldestCreatedAt) {
      oldestCreatedAt = groupOldest;
      oldestBsId = bsId;
    }
  }

  if (!oldestBsId) {
    return payments;
  }

  return payments.filter(
    (payment) =>
      getLegacyBsId(payment) === oldestBsId
  );
}

export function matchLegacySubscriberPayments(
  payments = [],
  { bsId, dialogLink } = {}
) {
  const normalizedId = bsId?.trim();
  const normalizedLink =
    dialogLink?.trim();
  const normalizedDialogId =
    extractDialogId(normalizedLink);

  if (!normalizedId && !normalizedLink) {
    return [];
  }

  let matchingPayments = payments.filter(
    (payment) => {
      if (normalizedId) {
        return (
          getLegacyBsId(payment) ===
          normalizedId
        );
      }

      return paymentMatchesDialogLink(
        payment,
        normalizedLink,
        normalizedDialogId
      );
    }
  );

  if (
    !normalizedId &&
    normalizedLink &&
    matchingPayments.length > 1
  ) {
    matchingPayments =
      narrowDialogLinkMatches(
        matchingPayments
      );
  }

  return matchingPayments;
}

export function pickLegacyProfileAnchor(
  payments = []
) {
  if (!payments.length) {
    return null;
  }

  const sorted = [...payments].sort(
    (left, right) =>
      Number(left.createdAt || 0) -
      Number(right.createdAt || 0)
  );

  const anchor =
    sorted.find(
      (payment) =>
        !isTopupDealType(
          payment.dealType
        ) &&
        !String(
          payment.dealType || ""
        ).startsWith("Доплата")
    ) || sorted[0];

  return anchor;
}

export function suggestLegacyTopupDealTypeId(
  anchorDealType
) {
  const id = resolveDealTypeId(
    anchorDealType
  );

  if (isTopupDealType(id)) {
    return id;
  }

  const topupByBase = {
    new: "topup_new",
    bb: "topup_bb",
    upsell: "topup_upsell",
    mailing: "topup_mailing",
    po: "topup_po",
  };

  return (
    topupByBase[id] ||
    DEFAULT_LEGACY_TT_DEAL_TYPE_ID
  );
}

export function buildLegacySubscriberProfile(
  matchingPayments = []
) {
  if (!matchingPayments.length) {
    return null;
  }

  const anchor =
    pickLegacyProfileAnchor(
      matchingPayments
    );
  const totalPaidInCrm =
    matchingPayments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );
  const budget = Number(
    anchor.budget || 0
  );
  const remainInCrm =
    budget > 0
      ? Math.max(
          0,
          budget - totalPaidInCrm
        )
      : null;

  return {
    ...anchor,
    totalPaidInCrm,
    remainInCrm,
    paymentCount:
      matchingPayments.length,
    legacyAnchorPaymentId:
      anchor.id,
  };
}
