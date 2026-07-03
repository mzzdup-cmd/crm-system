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
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID =
  "crm-client-contact-patch-rules";
const RULES = readFileSync(
  "firestore.rules",
  "utf8"
);

const CLIENT_ID = "client-andrey-1";

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

async function seedClient(clientId, data) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "clients",
          clientId
        ),
        data
      );
    }
  );
}

function authed(uid, email) {
  return testEnv.authenticatedContext(uid, {
    email,
  });
}

describe("clients update — manager contact field patches", () => {
  const ANDREY_UID = "andrey-uid";
  const ANDREY_EMAIL = "andrey@crm-school.ru";

  const CLIENT = {
    name: "Test Client",
    dialogLink: "https://example.com/dialog",
    course: "Course A",
    tariff: "Tariff 1",
    budget: 50000,
    amount: 10000,
    managerId: "andrey_volkov",
    manager: "Андрей В",
    vkLink: "",
    clientNote: "bs-123",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    createdByUid: "other-uid",
  };

  beforeEach(async () => {
    await seedUser(ANDREY_UID, {
      role: "manager",
      managerId: "andrey_volkov",
      name: "Андрей В",
      email: ANDREY_EMAIL,
    });

    await seedClient(CLIENT_ID, CLIENT);
  });

  it("PASS: manager patches vkLink on owned client (not creator)", async () => {
    const db = authed(
      ANDREY_UID,
      ANDREY_EMAIL
    ).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "clients", CLIENT_ID), {
        vkLink: "https://vk.com/id123",
        updatedAt: Date.now(),
      })
    );
  });

  it("PASS: manager patches dialogLink and clientNote on owned client", async () => {
    const db = authed(
      ANDREY_UID,
      ANDREY_EMAIL
    ).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "clients", CLIENT_ID), {
        dialogLink: "https://example.com/new-dialog",
        clientNote: "bs-456",
        updatedAt: Date.now(),
      })
    );
  });

  it("FAIL: manager cannot patch vkLink on another manager's client", async () => {
    await seedClient("client-ruslan-1", {
      ...CLIENT,
      managerId: "ruslan_romanyuk",
      manager: "Руслан Романюк",
    });

    const db = authed(
      ANDREY_UID,
      ANDREY_EMAIL
    ).firestore();

    await assertFails(
      updateDoc(
        doc(db, "clients", "client-ruslan-1"),
        {
          vkLink: "https://vk.com/id123",
          updatedAt: Date.now(),
        }
      )
    );
  });
});
