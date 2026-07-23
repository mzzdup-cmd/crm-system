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
  addDoc,
  setDoc,
} from "firebase/firestore";

const PROJECT_ID =
  "crm-school-legacy-payment-rules";
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

describe("payments create — legacy old client", () => {
  const UID = "manager-katya-uid";
  const EMAIL = "katya@crm-school.ru";

  it("PASS: legacy client payment for Katya", async () => {
    await seedUser(UID, {
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Тест",
          legacyClientName: "Тест",
          legacyClientBsId: "BS-123",
          course: "Python",
          tariff: "Стандарт",
          dealType: "Доплата",
          isLegacy: true,
          isLegacyClient: true,
          dialogLink: "https://vk.com/im123",
          vkLink: "https://vk.com/id123",
          amount: 5000,
          paymentSystem: "ЮKassa",
          invoiceNumber: "497512-5356",
          comment: "",
          manager: "Катя Бакаева",
          managerId: "katya_bakaeva",
          paymentDate: "2026-06-08",
          startDate: "2026-06-08",
          curatorStartDate: "",
          sourceId: "6",
          sourceName: "6",
          budget: 0,
          syncedToSheets: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("PASS: manager profile without role field", async () => {
    await seedUser(UID, {
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Тест",
          dealType: "Доплата",
          amount: 1000,
          manager: "Катя Бакаева",
          managerId: "katya_bakaeva",
          paymentSystem: "ЮKassa",
          syncedToSheets: false,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
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

    const now = Date.now();

    await assertFails(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Тест",
          dealType: "Доплата",
          amount: 1000,
          manager: "Александр Симанов",
          managerId: "alexander_simanov",
          paymentSystem: "ЮKassa",
          syncedToSheets: false,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("PASS: Polina Penkova legacy subscriber payment (addLegacyPayment path)", async () => {
    const UID = "polina-uid";
    const EMAIL = "polina.p@crm-school.ru";

    await seedUser(UID, {
      managerId: "polina_penkova",
      name: "Полина Пенькова",
      email: EMAIL,
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Тест",
          dealType: "Доплата",
          amount: 5000,
          manager: "Полина Пенькова",
          managerId: "polina_penkova",
          paymentSystem: "Prodamus",
          syncedToSheets: false,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("FAIL: wrong managerId and manager name vs auth email polina.p", async () => {
    const UID = "polina-stale-uid";
    const EMAIL = "polina.p@crm-school.ru";

    await seedUser(UID, {
      role: "manager",
      managerId: "polina_plamadya",
      name: "Полина Пенькова",
    });

    const now = Date.now();

    await assertFails(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Тест",
          dealType: "Доплата ББ",
          amount: 5000,
          manager: "Полина Пламадяла",
          managerId: "polina_plamadya",
          paymentSystem: "Prodamus",
          invoiceNumber: "46286185",
          syncedToSheets: false,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("PASS: auth email wins over stale profile managerId", async () => {
    const UID = "denis-stale-uid";
    const EMAIL = "denis@crm-school.ru";

    await seedUser(UID, {
      managerId: "katya_bakaeva",
      name: "Денис Мануйлов",
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "fedarrrrr35",
          legacyClientName: "fedarrrrr35",
          legacyClientBsId: "160993228",
          course: "Экстерн",
          tariff: "Базовый",
          dealType: "Доплата Новая",
          isLegacy: true,
          isLegacyClient: true,
          dialogLink:
            "https://bluesales.ru/app/Messenger/?dialogId=105731596",
          vkLink: "https://vk.com/example",
          amount: 5000,
          paymentSystem: "Prodamus",
          invoiceNumber: "46286185",
          comment: "",
          manager: "Денис Мануйлов",
          managerId: "denis_manuilov",
          paymentDate: "2026-07-16",
          startDate: "2026-06-08",
          curatorStartDate: "",
          sourceId: "6",
          sourceName: "6",
          budget: 28000,
          syncedToSheets: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("PASS: Polina Plamadya auth email wins over stale profile managerId", async () => {
    const UID = "polina-pl-stale-uid";
    const EMAIL = "polina.pl@crm-school.ru";

    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Полина Пламадяла",
      email: EMAIL,
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Test",
          dealType: "Доплата Новая",
          amount: 5000,
          paymentSystem: "Prodamus",
          invoiceNumber: "123",
          manager: "Полина Пламадяла",
          managerId: "polina_plamadya",
          paymentDate: "2026-07-21",
          startDate: "2026-05-04",
          syncedToSheets: false,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });

  it("PASS: Denis Manuilov legacy top-up after subscriber lookup", async () => {
    const UID = "denis-uid";
    const EMAIL = "denis@crm-school.ru";

    await seedUser(UID, {
      managerId: "denis_manuilov",
      name: "Денис Мануйлов",
      email: EMAIL,
    });

    const now = Date.now();

    await assertSucceeds(
      addDoc(
        collection(
          authed(UID, EMAIL).firestore(),
          "payments"
        ),
        {
          clientId: null,
          clientName: "Mychik: Монтаж-Базовый",
          legacyClientName: "Mychik: Монтаж-Базовый",
          legacyClientBsId: "160769525",
          course: "Монтаж",
          tariff: "Базовый",
          dealType: "Доплата Новая",
          isLegacy: true,
          isLegacyClient: true,
          dialogLink:
            "https://bizasales.ru/app/Messenger?dialogId=100174414",
          vkLink: "https://vk.com/example",
          amount: 5000,
          paymentSystem: "Prodamus",
          invoiceNumber: "46286185",
          comment: "",
          manager: "Денис Мануйлов",
          managerId: "denis_manuilov",
          paymentDate: "2026-07-15",
          startDate: "2026-06-08",
          curatorStartDate: "",
          sourceId: "6",
          sourceName: "6",
          budget: 28000,
          syncedToSheets: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          createdByUid: UID,
          updatedByUid: UID,
        }
      )
    );
  });
});
