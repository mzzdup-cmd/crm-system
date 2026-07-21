import {
  isBbBookingClient,
} from "./bbBookingLogic";

export const SUBSCRIPTION_OUTCOMES = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CHURNED: "churned",
};

export function hadSubscriptionPlan(client) {
  return Number(client?.budget || 0) > 0;
}

export function isSubscriptionChurned(client) {
  return (
    client?.subscriptionOutcome ===
    SUBSCRIPTION_OUTCOMES.CHURNED
  );
}

export function isSubscriptionCompleted(client) {
  if (
    client?.subscriptionOutcome ===
    SUBSCRIPTION_OUTCOMES.COMPLETED
  ) {
    return true;
  }

  return (
    hadSubscriptionPlan(client)
    && !isSubscriptionChurned(client)
    && Number(client?.amount || 0)
      >= Number(client?.budget || 0)
  );
}

export function isActiveSubscription(client) {
  if (!hadSubscriptionPlan(client)) {
    return false;
  }

  if (isSubscriptionChurned(client)) {
    return false;
  }

  if (isSubscriptionCompleted(client)) {
    return false;
  }

  return (
    Number(client?.budget || 0)
    - Number(client?.amount || 0)
  ) > 0;
}

export function buildSubscriptionOutcomeUpdate(
  client,
  nextAmount,
  dealTypeId = ""
) {
  const budget = Number(client?.budget || 0);

  if (!budget) {
    return {};
  }

  if (
    isSubscriptionChurned(client)
  ) {
    if (
      dealTypeId === "topup_po" ||
      dealTypeId === "Доплата ПО"
    ) {
      const remain =
        budget -
        Number(nextAmount || 0);

      if (remain <= 0) {
        return {
          subscriptionOutcome:
            SUBSCRIPTION_OUTCOMES.COMPLETED,
          subscriptionClosedAt:
            Date.now(),
          nextPaymentDate: null,
        };
      }

      return {
        subscriptionOutcome:
          SUBSCRIPTION_OUTCOMES.ACTIVE,
        subscriptionClosedAt: null,
      };
    }

    return {};
  }

  const remain = budget - Number(nextAmount || 0);

  if (remain <= 0) {
    return {
      subscriptionOutcome:
        SUBSCRIPTION_OUTCOMES.COMPLETED,
      subscriptionClosedAt: Date.now(),
      nextPaymentDate: null,
    };
  }

  if (
    client?.subscriptionOutcome ===
    SUBSCRIPTION_OUTCOMES.COMPLETED
  ) {
    return {
      subscriptionOutcome:
        SUBSCRIPTION_OUTCOMES.ACTIVE,
      subscriptionClosedAt: null,
    };
  }

  return {};
}

export function categorizeSubscriptions(
  clients,
  payments = []
) {
  const enriched = clients
    .filter(hadSubscriptionPlan)
    .filter(
      (client) =>
        !isBbBookingClient(
          client,
          payments
        )
    )
    .map((client) => ({
      ...client,
      subscriptionCategory:
        isSubscriptionChurned(client)
          ? SUBSCRIPTION_OUTCOMES.CHURNED
          : isSubscriptionCompleted(client)
            ? SUBSCRIPTION_OUTCOMES.COMPLETED
            : SUBSCRIPTION_OUTCOMES.ACTIVE,
    }));

  return {
    active: enriched.filter(
      (client) =>
        client.subscriptionCategory ===
        SUBSCRIPTION_OUTCOMES.ACTIVE
    ),
    completed: enriched.filter(
      (client) =>
        client.subscriptionCategory ===
        SUBSCRIPTION_OUTCOMES.COMPLETED
    ),
    churned: enriched.filter(
      (client) =>
        client.subscriptionCategory ===
        SUBSCRIPTION_OUTCOMES.CHURNED
    ),
  };
}
