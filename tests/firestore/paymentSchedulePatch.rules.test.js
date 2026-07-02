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
  "crm-payment-schedule-patch-rules";
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

async function seedPayment(paymentId, data) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          "payments",
          paymentId
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

describe("payments update — schedule field patches", () => {
  const DENIS_UID = "denis-uid";
  const DENIS_EMAIL = "denis@crm-school.ru";
  const PAYMENT_ID = "payment-denis-new";

  beforeEach(async () => {
    await seedUser(DENIS_UID, {
      role: "manager",
      managerId: "denis",
      name: "Денис Мануйлов",
      email: DENIS_EMAIL,
    });

    await seedPayment(PAYMENT_ID, {
      clientId: "client-1",
      clientName: "Тест",
      dealType: "Новая",
      amount: 50000,
      paymentDate: "2026-07-01",
      startDate: "2026-06-29",
      curatorStartDate: "",
      managerId: "denis",
      manager: "Денис Мануйлов",
      createdAt: Date.now() - 86400000,
      createdByUid: DENIS_UID,
      deletedAt: null,
    });
  });

  it("PASS: Denis patches curatorStartDate on his Новая payment", async () => {
    const db = authed(
      DENIS_UID,
      DENIS_EMAIL
    ).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "payments", PAYMENT_ID), {
        curatorStartDate: "2026-07-02",
        updatedAt: Date.now(),
        updatedByUid: DENIS_UID,
      })
    );
  });

  it("PASS: Denis patches startDate on ББ payment", async () => {
    await seedPayment("payment-denis-bb", {
      clientId: "client-2",
      clientName: "ББ клиент",
      dealType: "ББ",
      amount: 30000,
      paymentDate: "2026-07-01",
      startDate: "",
      managerId: "denis_manuilov",
      manager: "Денис Мануйлов",
      createdAt: Date.now() - 86400000,
      createdByUid: DENIS_UID,
      deletedAt: null,
    });

    const db = authed(
      DENIS_UID,
      DENIS_EMAIL
    ).firestore();

    await assertSucceeds(
      updateDoc(
        doc(db, "payments", "payment-denis-bb"),
        {
          startDate: "2026-07-02",
          updatedAt: Date.now(),
          updatedByUid: DENIS_UID,
        }
      )
    );
  });

  it("FAIL: Denis cannot patch another manager payment", async () => {
    await seedPayment("payment-katya", {
      clientId: "client-3",
      clientName: "Чужой",
      dealType: "Новая",
      amount: 10000,
      paymentDate: "2026-07-01",
      startDate: "2026-06-29",
      managerId: "katya_bakaeva",
      manager: "Катя Бакаева",
      createdAt: Date.now() - 86400000,
      createdByUid: "katya-uid",
      deletedAt: null,
    });

    const db = authed(
      DENIS_UID,
      DENIS_EMAIL
    ).firestore();

    await assertFails(
      updateDoc(doc(db, "payments", "payment-katya"), {
        curatorStartDate: "2026-07-02",
        updatedAt: Date.now(),
        updatedByUid: DENIS_UID,
      })
    );
  });
});
