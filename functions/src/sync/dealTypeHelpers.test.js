const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isUpsellDeal,
  resolveTtBudgetAmount,
} = require("./dealTypeHelpers");

test("isUpsellDeal matches upsell labels but not topups", () => {
  assert.equal(isUpsellDeal("Апсэйл"), true);
  assert.equal(isUpsellDeal("Апсейл"), true);
  assert.equal(isUpsellDeal("upsell"), true);
  assert.equal(
    isUpsellDeal("Доплата Апсэйл"),
    false
  );
  assert.equal(isUpsellDeal("Новая"), false);
});

test("resolveTtBudgetAmount uses payment budget for new deals when client budget is zero", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Новая",
        budget: 22000,
      },
      client: { budget: 0 },
    }),
    22000
  );
});

test("resolveTtBudgetAmount prefers client budget for new deals", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Новая",
        budget: 1000,
      },
      client: { budget: 22000 },
    }),
    22000
  );
});

test("resolveTtBudgetAmount prefers payment budget for upsell", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Апсэйл",
        budget: 22000,
      },
      client: { budget: 0 },
    }),
    22000
  );
});

test("resolveTtBudgetAmount omits budget for topups", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Доплата ББ",
        budget: 40000,
      },
      client: { budget: 40000 },
    }),
    ""
  );
});

test("resolveTtBudgetAmount uses client budget for bb deals", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "ББ",
      },
      client: { budget: 40000 },
    }),
    40000
  );
});

test("resolveTtBudgetAmount omits budget for refunds", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Возврат",
        amount: 5000,
      },
      client: { budget: 22000 },
    }),
    ""
  );
});

test("resolveTtBudgetAmount uses client budget for upsell when payment budget is zero", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Апсэйл",
        budget: 0,
      },
      client: { budget: 30000 },
    }),
    30000
  );
});

test("resolveTtBudgetAmount omits empty budget for deferred profile deals", () => {
  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "ББ",
      },
      client: { budget: 0 },
    }),
    ""
  );

  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Апсэйл",
        budget: 0,
      },
      client: { budget: 0 },
    }),
    ""
  );

  assert.equal(
    resolveTtBudgetAmount({
      payment: {
        dealType: "Рассылка",
      },
      client: { budget: 0 },
    }),
    ""
  );
});
