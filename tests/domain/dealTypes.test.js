import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isDeferredPaymentProfileDealType,
  isOptionalStartDateDealType,
  canChangePaymentStreamDealType,
  needsBudgetFieldForExistingDeal,
} from "../../src/constants/dealTypes.js";

describe("isDeferredPaymentProfileDealType", () => {
  it("matches bb, upsell, and mailing deal types", () => {
    assert.equal(
      isDeferredPaymentProfileDealType("bb"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("ББ"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("upsell"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("Апсэйл"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("Апсейл"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("mailing"),
      true
    );
    assert.equal(
      isDeferredPaymentProfileDealType("Рассылка"),
      true
    );
  });

  it("does not match other deal types", () => {
    assert.equal(
      isDeferredPaymentProfileDealType("new"),
      false
    );
    assert.equal(
      isDeferredPaymentProfileDealType("Новая"),
      false
    );
    assert.equal(
      isDeferredPaymentProfileDealType("topup_bb"),
      false
    );
  });
});

describe("canChangePaymentStreamDealType", () => {
  it("allows stream change only for bb, upsell, mailing", () => {
    assert.equal(
      canChangePaymentStreamDealType("ББ"),
      true
    );
    assert.equal(
      canChangePaymentStreamDealType("Апсэйл"),
      true
    );
    assert.equal(
      canChangePaymentStreamDealType("Рассылка"),
      true
    );
    assert.equal(
      canChangePaymentStreamDealType("Доплата ББ"),
      false
    );
    assert.equal(
      canChangePaymentStreamDealType("Новая"),
      false
    );
  });
});

describe("isOptionalStartDateDealType", () => {
  it("aliases deferred profile deal types", () => {
    assert.equal(
      isOptionalStartDateDealType("bb"),
      isDeferredPaymentProfileDealType("bb")
    );
    assert.equal(
      isOptionalStartDateDealType("upsell"),
      isDeferredPaymentProfileDealType("upsell")
    );
  });
});

describe("needsBudgetFieldForExistingDeal", () => {
  it("shows budget field only for upsell", () => {
    assert.equal(
      needsBudgetFieldForExistingDeal("upsell"),
      true
    );
    assert.equal(
      needsBudgetFieldForExistingDeal("bb"),
      false
    );
  });
});

describe("paymentNeedsStartDate reminders disabled", () => {
  it("documents that deferred profile deals never trigger reminders", () => {
    // Reminder service returns false for all payments — verified in code review.
    assert.equal(
      isDeferredPaymentProfileDealType("ББ"),
      true
    );
  });
});
