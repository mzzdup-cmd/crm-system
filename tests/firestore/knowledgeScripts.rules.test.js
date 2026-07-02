import {
  readFileSync,
} from "node:fs";
import {
  after,
  before,
  beforeEach,
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  addDoc,
  setDoc,
} from "firebase/firestore";

const PROJECT_ID =
  "crm-school-knowledge-rules-test";
const RULES = readFileSync(
  "firestore.rules",
  "utf8"
);

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: RULES,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedUser(uid, profile) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "users",
          uid
        ),
        profile
      );
    }
  );
}

function authed(uid, email) {
  return testEnv.authenticatedContext(uid, {
    email,
  });
}

function buildScriptPayload(overrides = {}) {
  const now = Date.now();

  return {
    title: "Тестовая обработка",
    content: "Текст обработки",
    tags: ["дожим"],
    pinned: false,
    managerId: "katya_bakaeva",
    manager: "Катя Бакаева",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdByUid: "manager-katya-uid",
    updatedByUid: "manager-katya-uid",
    ...overrides,
  };
}

describe("knowledgeScripts create", () => {
  const UID = "manager-katya-uid";
  const EMAIL = "katya@crm-school.ru";

  it("PASS: manager profile without explicit role field (staff member)", async () => {
    await seedUser(UID, {
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "knowledgeScripts"
        ),
        buildScriptPayload()
      )
    );
  });

  it("PASS: manager with role manager", async () => {
    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "knowledgeScripts"
        ),
        buildScriptPayload()
      )
    );
  });

  it("FAIL: wrong managerId", async () => {
    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    await assertFails(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "knowledgeScripts"
        ),
        buildScriptPayload({
          managerId: "alexander_simanov",
          manager: "Александр Симанов",
        })
      )
    );
  });
});
