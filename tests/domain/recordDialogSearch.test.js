import test from "node:test";
import assert from "node:assert/strict";

import {
  recordMatchesDialogSearch,
  clientMatchesSearch,
} from "../../src/domain/client/recordDialogSearch.js";

test("recordMatchesDialogSearch matches dialogId from full URL", () => {
  assert.equal(
    recordMatchesDialogSearch(
      {
        dialogId: "89844866",
      },
      "https://bluesales.ru/app/Messenger/?dialogId=89844866"
    ),
    true
  );
});

test("clientMatchesSearch matches dialog link and name", () => {
  assert.equal(
    clientMatchesSearch(
      {
        name: "Мария",
        dialogLink:
          "https://bluesales.ru/app/Messenger?dialogId=89844866",
      },
      "89844866"
    ),
    true
  );

  assert.equal(
    clientMatchesSearch(
      {
        name: "Мария",
        manager: "Катя",
      },
      "мария"
    ),
    true
  );
});
