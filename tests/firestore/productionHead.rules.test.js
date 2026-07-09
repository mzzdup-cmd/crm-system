import {
  execSync,
} from "node:child_process";
import {
  after,
  before,
  beforeEach,
  describe,
  it,
} from "node:test";
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
import {
  buildClientWritePayload,
  buildActor,
} from "../helpers/buildClientWritePayload.js";

const PROJECT_ID = "crm-head-rules-test";
const RULES = execSync(
  "git show HEAD:firestore.rules",
  { encoding: "utf8" }
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
        doc(context.firestore(), "users", uid),
        profile
      );
    }
  );
}

describe("PRODUCTION HEAD rules — Katya create client", () => {
  const UID = "katya-uid";
  const EMAIL = "katya@crm-school.ru";

  it("FAIL without createdByUid (production rule set)", async () => {
    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const payload = buildClientWritePayload({
      actor: {
        role: "manager",
        managerId: "katya_bakaeva",
        name: "Катя Бакаева",
        email: EMAIL,
      },
    });

    await assertFails(
      addDoc(
        collection(
          testEnv
            .authenticatedContext(UID, { email: EMAIL })
            .firestore(),
          "clients"
        ),
        payload
      )
    );
  });

  it("PASS with createdByUid and matching managerId (HEAD rules)", async () => {
    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const payload = buildClientWritePayload({
      actor: buildActor(
        {
          role: "manager",
          managerId: "katya_bakaeva",
          name: "Катя Бакаева",
          email: EMAIL,
        },
        UID
      ),
    });

    await assertSucceeds(
      addDoc(
        collection(
          testEnv
            .authenticatedContext(UID, { email: EMAIL })
            .firestore(),
          "clients"
        ),
        payload
      )
    );
  });

  it("FAIL with empty managerId (hasManagerAttribution)", async () => {
    await seedUser(UID, {
      role: "manager",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const payload = {
      name: "Test",
      dialogLink: "https://x",
      managerId: "",
      manager: "Катя Бакаева",
      createdByUid: UID,
      updatedByUid: UID,
      amount: 0,
      budget: 1000,
    };

    await assertFails(
      addDoc(
        collection(
          testEnv
            .authenticatedContext(UID, { email: EMAIL })
            .firestore(),
          "clients"
        ),
        payload
      )
    );
  });
});
