import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";

import {
  dialogLinksMatch,
  extractDialogId,
  getDialogLinkLookupVariants,
} from "../../src/domain/client/dialogLinkUtils.js";

describe("dialogLinkUtils", () => {
  it("matches bluesales and bizasales links with same dialogId", () => {
    assert.equal(
      dialogLinksMatch(
        "https://bluesales.ru/app/Messenger?dialogId=100174414",
        "https://bizasales.ru/app/Messenger?dialogId=100174414"
      ),
      true
    );
  });

  it("matches business.vk.com variant by dialogId", () => {
    assert.equal(
      dialogLinksMatch(
        "https://business.vk.com/app/Messenger?dialogId=100174414",
        "https://bizasales.ru/app/Messenger?dialogId=100174414"
      ),
      true
    );
  });

  it("extracts dialogId from messenger URLs", () => {
    assert.equal(
      extractDialogId(
        "https://bizasales.ru/app/Messenger?dialogId=160769525"
      ),
      "160769525"
    );
  });

  it("matches bluesales links with Messenger/? path", () => {
    assert.equal(
      dialogLinksMatch(
        "https://bluesales.ru/app/Messenger/?dialogId=105731596",
        "https://bluesales.ru/app/Messenger?dialogId=105731596"
      ),
      true
    );
  });

  it("does not match different dialogIds on the same host", () => {
    assert.equal(
      dialogLinksMatch(
        "https://bluesales.ru/app/Messenger/?dialogId=105631789",
        "https://bluesales.ru/app/Messenger/?dialogId=106292200"
      ),
      false
    );
  });

  it("adds host alias variants for lookup", () => {
    const variants =
      getDialogLinkLookupVariants(
        "https://bizasales.ru/app/Messenger?dialogId=100174414"
      );

    assert.ok(
      variants.some((item) =>
        item.includes("bluesales.ru")
      )
    );
    assert.ok(
      variants.some((item) =>
        item.includes("dialogId=100174414")
      )
    );
  });
});
