import test from "node:test";
import assert from "node:assert/strict";

import {
  paymentMatchesSearch,
  enrichPaymentForSearch,
} from "../../src/domain/payment/paymentSearch.js";

const basePayment = {
  clientName: "Элин",
  manager: "Руслан Романюк",
  amount: 4000,
  paymentDate: "2026-07-01",
  dealType: "Новая",
  course: "Экстерн Монтаж",
  paymentSystem: "Робокасса",
  dialogLink:
    "https://bluesales.ru/app/Messenger?dialogId=104624030",
};

test("matches invoice number partial search", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        invoiceNumber: "46220555",
      },
      "46220555"
    ),
    true
  );
});

test("matches formatted invoice with digit-only query", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        invoiceNumber: "4622-0555",
      },
      "46220555"
    ),
    true
  );
});

test("matches legacy invoice field names", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        account: "46220555",
      },
      "46220555"
    ),
    true
  );
});

test("matches dialog id from dialog link", () => {
  assert.equal(
    paymentMatchesSearch(
      basePayment,
      "104624030"
    ),
    true
  );
});

test("matches full bluesales URL in search", () => {
  assert.equal(
    paymentMatchesSearch(
      basePayment,
      "https://bluesales.ru/app/Messenger/?dialogId=104624030"
    ),
    true
  );
});

test("matches dialog link from linked client record", () => {
  assert.equal(
    paymentMatchesSearch(
      enrichPaymentForSearch(
        {
          clientId: "c1",
          clientName: "Миша",
          course: "Монтаж",
        },
        {
          id: "c1",
          dialogLink:
            "https://bluesales.ru/app/Messenger/?dialogId=105631789",
        }
      ),
      "https://bluesales.ru/app/Messenger/?dialogId=105631789"
    ),
    true
  );
});

test("matches BS client id in clientNote", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        clientNote: "142728300",
      },
      "142728300"
    ),
    true
  );
});

test("matches client name text search", () => {
  assert.equal(
    paymentMatchesSearch(
      basePayment,
      "элин"
    ),
    true
  );
});

test("returns all payments for empty query", () => {
  assert.equal(
    paymentMatchesSearch(
      basePayment,
      ""
    ),
    true
  );
});

test("matches invoice 46228595 digit search", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        invoiceNumber: "46228595",
      },
      "46228595"
    ),
    true
  );
});

test("does not match unrelated query", () => {
  assert.equal(
    paymentMatchesSearch(
      {
        ...basePayment,
        invoiceNumber: "46220555",
      },
      "99999999"
    ),
    false
  );
});
