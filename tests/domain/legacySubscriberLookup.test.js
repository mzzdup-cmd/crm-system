import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLegacySubscriberProfile,
  matchLegacySubscriberPayments,
  suggestLegacyTopupDealTypeId,
} from "../../src/domain/payment/legacySubscriberLookup.js";

const dialogLink =
  "https://bluesales.ru/app/Messenger/?dialogId=105731596";

test("bs id lookup ignores newer payments on same dialog link", () => {
  const payments = [
    {
      id: "june",
      legacyClientBsId: "160993228",
      legacyClientName: "fedarrrrr35",
      dealType: "Новая",
      dialogLink,
      amount: 3000,
      createdAt: 1000,
    },
    {
      id: "july",
      legacyClientBsId: "999999999",
      legacyClientName: "fresh_july_lead",
      dealType: "Доплата Новая",
      dialogLink,
      amount: 5000,
      createdAt: 2000,
    },
  ];

  const matched = matchLegacySubscriberPayments(
    payments,
    {
      bsId: "160993228",
      dialogLink,
    }
  );

  const profile =
    buildLegacySubscriberProfile(matched);

  assert.equal(matched.length, 1);
  assert.equal(profile.legacyClientName, "fedarrrrr35");
  assert.equal(profile.id, "june");
});

test("dialog-only lookup prefers oldest subscriber group", () => {
  const payments = [
    {
      id: "june",
      legacyClientBsId: "160993228",
      legacyClientName: "fedarrrrr35",
      dealType: "Новая",
      dialogLink,
      amount: 3000,
      createdAt: 1000,
    },
    {
      id: "july",
      legacyClientBsId: "999999999",
      legacyClientName: "fresh_july_lead",
      dealType: "Доплата Новая",
      dialogLink,
      amount: 5000,
      createdAt: 2000,
    },
  ];

  const matched = matchLegacySubscriberPayments(
    payments,
    { dialogLink }
  );

  const profile =
    buildLegacySubscriberProfile(matched);

  assert.equal(matched.length, 1);
  assert.equal(profile.legacyClientName, "fedarrrrr35");
});

test("suggestLegacyTopupDealTypeId maps base deal to topup", () => {
  assert.equal(
    suggestLegacyTopupDealTypeId("Новая"),
    "topup_new"
  );
  assert.equal(
    suggestLegacyTopupDealTypeId("Доплата Новая"),
    "topup_new"
  );
});
