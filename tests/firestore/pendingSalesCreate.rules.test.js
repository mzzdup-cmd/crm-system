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
  collection,
  doc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import {
  buildActor,
} from "../helpers/buildClientWritePayload.js";

const PROJECT_ID = "crm-pending-sales-rules-test";
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
        doc(context.firestore(), "users", uid),
        profile
      );
    }
  );
}

function authed(uid, email) {
  return testEnv.authenticatedContext(uid, { email });
}

function pendingSalePayload(overrides = {}) {
  return {
    createdByManagerId: "denis_manuilov",
    ownerManagerId: "katya_bakaeva",
    dialogLink: "https://example.com/dialog",
    amount: 15000,
    paymentDate: "2026-07-08",
    comment: "",
    course: "",
    dealTypeId: "new",
    status: "pending",
    confirmedAt: null,
    paymentId: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("pendingSales create — staff quick sale", () => {
  it("PASS: manager creates sale for colleague with effectiveOwnerManagerId", async () => {
    const uid = "denis-uid";
    const email = "denis@crm-school.ru";

    await seedUser(uid, {
      role: "manager",
      managerId: "denis_manuilov",
      name: "Денис Мануйлов",
      email,
    });

    buildActor(
      {
        role: "manager",
        managerId: "denis_manuilov",
        name: "Денис Мануйлов",
        email,
      },
      uid
    );

    await assertSucceeds(
      addDoc(
        collection(authed(uid, email).firestore(), "pendingSales"),
        pendingSalePayload()
      )
    );
  });

  it("FAIL: createdByManagerId does not match effectiveOwnerManagerId", async () => {
    const uid = "denis-uid";
    const email = "denis@crm-school.ru";

    await seedUser(uid, {
      role: "manager",
      managerId: "denis_manuilov",
      name: "Денис Мануйлов",
      email,
    });

    await assertFails(
      addDoc(
        collection(authed(uid, email).firestore(), "pendingSales"),
        pendingSalePayload({
          createdByManagerId: "katya_bakaeva",
          ownerManagerId: "denis_manuilov",
        })
      )
    );
  });

  it("PASS: vilu alias matches effectiveOwnerManagerId from auth email", async () => {
    const uid = "vilu-uid";
    const email = "vilu@crm-school.ru";

    await seedUser(uid, {
      role: "manager",
      managerId: "vilu_petrova",
      name: "Виолетта Петрова",
      email,
    });

    await assertSucceeds(
      addDoc(
        collection(authed(uid, email).firestore(), "pendingSales"),
        pendingSalePayload({
          createdByManagerId: "vilu_petrova",
        })
      )
    );
  });
});
