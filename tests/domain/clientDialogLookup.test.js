import test from "node:test";
import assert from "node:assert/strict";

import {
  clientCanonicalDialogMatches,
} from "../../src/domain/client/clientDialogLookup.js";

const MISHAS_DIALOG =
  "https://bluesales.ru/app/Messenger?dialogId=105631789";

test("rejects stale payment dialog when client card has different dialog", () => {
  const misha = {
    name: "Миша",
    dialogLink: MISHAS_DIALOG,
    dialogId: "105631789",
    clientNote: "160881977",
  };

  assert.equal(
    clientCanonicalDialogMatches(
      misha,
      "https://bluesales.ru/app/Messenger/?dialogId=89559619",
      "89559619",
      {
        dialogId: "89559619",
        clientId: "misha-id",
      }
    ),
    false
  );
});

test("accepts payment dialog only for legacy client without dialog on card", () => {
  const legacyClient = {
    name: "Legacy",
    clientNote: "12345678",
  };

  assert.equal(
    clientCanonicalDialogMatches(
      legacyClient,
      "https://bluesales.ru/app/Messenger/?dialogId=89559619",
      "89559619",
      {
        dialogId: "89559619",
      }
    ),
    true
  );

  assert.equal(
    clientCanonicalDialogMatches(
      legacyClient,
      "https://bluesales.ru/app/Messenger/?dialogId=89559619",
      "89559619",
      {
        dialogId: "105631789",
      }
    ),
    false
  );
});

test("matches client card dialog regardless of payment", () => {
  const atlas = {
    name: "atlas",
    dialogLink:
      "https://bluesales.ru/app/Messenger/?dialogId=89844866",
    dialogId: "89844866",
  };

  assert.equal(
    clientCanonicalDialogMatches(
      atlas,
      "https://bluesales.ru/app/Messenger/?dialogId=89844866",
      "89844866",
      {
        dialogId: "105631789",
      }
    ),
    true
  );
});
