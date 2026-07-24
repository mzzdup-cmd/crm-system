import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldRejectBsIdBinding,
} from "../../src/domain/client/dialogBsIdBinding.js";

test("bs-id binding rejected when dialogs differ", () => {
  assert.equal(
    shouldRejectBsIdBinding({
      formDialogLink:
        "https://bluesales.ru/app/Messenger/?dialogId=111",
      bsClientDialogLink:
        "https://bluesales.ru/app/Messenger/?dialogId=222",
    }),
    true
  );
});

test("bs-id binding rejected when card has no dialog", () => {
  assert.equal(
    shouldRejectBsIdBinding({
      formDialogLink:
        "https://bluesales.ru/app/Messenger/?dialogId=111",
      bsClientDialogLink: "",
    }),
    true
  );
});

test("bs-id binding allowed when dialogs match", () => {
  assert.equal(
    shouldRejectBsIdBinding({
      formDialogLink:
        "https://bluesales.ru/app/Messenger/?dialogId=111",
      bsClientDialogLink:
        "https://bluesales.ru/app/Messenger?dialogId=111",
    }),
    false
  );
});
