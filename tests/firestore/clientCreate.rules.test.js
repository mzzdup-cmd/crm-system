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
import {
  buildClientWritePayload,
  buildActor,
} from "../helpers/buildClientWritePayload.js";

const PROJECT_ID = "crm-school-rules-test";
const RULES = readFileSync(
  "firestore.rules",
  "utf8"
);

/** Exact clients create rule from firestore.rules */
const CLIENTS_CREATE_RULE =
  "match /clients/{clientId} allow create: " +
  "isSignedIn() && canCreateManagerData(request.resource.data)";

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

async function tryCreateClient(context, payload) {
  return addDoc(
    collection(context.firestore(), "clients"),
    payload
  );
}

describe("clients create — addPaymentForNewClient path", () => {
  const UID = "manager-katya-uid";
  const EMAIL = "katya@crm-school.ru";
  const USER_PROFILE = {
    role: "manager",
    managerId: "katya_bakaeva",
    name: "Катя Бакаева",
    email: EMAIL,
  };

  it("PASS: auth uid fallback in buildCreateAudit (resolveAuditUser fix)", async () => {
    await seedUser(UID, USER_PROFILE);

    const payload = buildClientWritePayload({
      actor: { ...USER_PROFILE },
      authUid: UID,
    });

    assert.equal(payload.createdByUid, UID);

    await assertSucceeds(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("PASS: NewPaymentPage actor pattern (uid fallback)", async () => {
    await seedUser(UID, USER_PROFILE);

    const actor = buildActor(
      USER_PROFILE,
      UID
    );
    const payload =
      buildClientWritePayload({ actor });

    assert.equal(payload.createdByUid, UID);
    assert.equal(
      payload.managerId,
      "katya_bakaeva"
    );

    await assertSucceeds(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("PASS: actor with uid + matching manager profile", async () => {
    await seedUser(UID, USER_PROFILE);

    const actor = {
      uid: UID,
      ...USER_PROFILE,
    };
    const payload =
      buildClientWritePayload({ actor });

    await assertSucceeds(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("FAIL: isOwnAuditCreate — missing createdByUid", async () => {
    await seedUser(UID, USER_PROFILE);

    const actor = {
      ...USER_PROFILE,
    };
    delete actor.uid;

    const payload =
      buildClientWritePayload({ actor });

    assert.equal(
      payload.createdByUid,
      undefined,
      "payload must omit createdByUid for this test"
    );

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("FAIL: isOwnAuditCreate — createdByUid != auth.uid", async () => {
    await seedUser(UID, USER_PROFILE);

    const payload = buildClientWritePayload({
      actor: {
        uid: "wrong-uid",
        ...USER_PROFILE,
      },
    });

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("PASS: Polina Penkova new subscriber path (stale profile managerId ignored)", async () => {
    const UID = "polina-client-uid";
    const EMAIL = "polina.p@crm-school.ru";

    await seedUser(UID, {
      role: "manager",
      managerId: "polina_plamadya",
      name: "Полина Пенькова",
      email: EMAIL,
    });

    const payload = {
      name: "Test Client",
      dialogLink: "https://example.com/dialog",
      course: "Course A",
      tariff: "Tariff 1",
      budget: 10000,
      amount: 0,
      manager: "Полина Пенькова",
      managerId: "polina_penkova",
      dealType: "Доплата ББ",
      paymentDate: "2026-07-01",
      nextPaymentDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUid: UID,
      updatedByUid: UID,
    };

    await assertSucceeds(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("FAIL: ownsManagerRecord — wrong managerId in payload vs auth email", async () => {
    await seedUser(UID, {
      ...USER_PROFILE,
      managerId: "ruslan_romanyuk",
    });

    const payload = {
      ...buildClientWritePayload({
        actor: {
          uid: UID,
          ...USER_PROFILE,
          managerId: "ruslan_romanyuk",
        },
      }),
      managerId: "ruslan_romanyuk",
      manager: "Руслан Романюк",
    };

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("FAIL: hasManagerAttribution — empty managerId", async () => {
    await seedUser(UID, {
      role: "manager",
      name: "Unknown Person",
      email: "unknown@example.com",
    });

    const payload = buildClientWritePayload({
      actor: {
        uid: UID,
        role: "manager",
        name: "Unknown Person",
        email: "unknown@example.com",
      },
      form: { manager: "" },
    });

    await assertFails(
      tryCreateClient(
        authed(
          UID,
          "unknown@example.com"
        ),
        payload
      )
    );
  });

  it("FAIL: isStaffMember — no users/{uid} profile", async () => {
    const payload = buildClientWritePayload({
      actor: {
        uid: UID,
        ...USER_PROFILE,
      },
    });

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("FAIL: manager name fallback — id mismatch and name != ownerManagerName", async () => {
    await seedUser(UID, {
      role: "manager",
      managerId: "ruslan_romanyuk",
      name: "Катя",
      email: EMAIL,
    });

    const payload = {
      ...buildClientWritePayload({
        actor: {
          uid: UID,
          role: "manager",
          managerId: "ruslan_romanyuk",
          name: "Катя",
          email: EMAIL,
        },
      }),
      managerId: "ruslan_romanyuk",
      manager: "Руслан Романюк",
    };

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payload
      )
    );
  });

  it("PASS: admin bypasses managerId match", async () => {
    await seedUser("admin-uid", {
      role: "admin",
      name: "Администратор",
      email: "admin@crm-school.ru",
    });

    const payload = buildClientWritePayload({
      actor: {
        uid: "admin-uid",
        role: "admin",
        name: "Администратор",
      },
      form: {
        manager: "Денис Мануйлов",
      },
    });

    await assertSucceeds(
      tryCreateClient(
        authed(
          "admin-uid",
          "admin@crm-school.ru"
        ),
        payload
      )
    );
  });
});

describe("rule isolation — exact failing predicate", () => {
  it("documents which canCreateManagerData branch fails for production-like actor without uid in userData spread only", async () => {
    const UID = "prod-manager-uid";
    const EMAIL = "katya@crm-school.ru";

    await seedUser(UID, {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    });

    const actorWithoutUidKey = {
      role: "manager",
      managerId: "katya_bakaeva",
      name: "Катя Бакаева",
      email: EMAIL,
    };

    const payloadMissingAudit =
      buildClientWritePayload({
        actor: actorWithoutUidKey,
      });

    const payloadWithAudit = {
      ...payloadMissingAudit,
      createdByUid: UID,
      updatedByUid: UID,
    };

    await assertFails(
      tryCreateClient(
        authed(UID, EMAIL),
        payloadMissingAudit
      ),
      "expected deny when createdByUid missing"
    );

    await assertSucceeds(
      tryCreateClient(
        authed(UID, EMAIL),
        payloadWithAudit
      ),
      "expected allow when only createdByUid added"
    );
  });

  it("records exact emulator denial for missing createdByUid", async () => {
    const UID = "audit-uid";
    const EMAIL = "katya@crm-school.ru";

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

    assert.equal(payload.createdByUid, undefined);

    let denialMessage = "";

    try {
      await tryCreateClient(
        authed(UID, EMAIL),
        payload
      );
      assert.fail("expected permission denied");
    } catch (error) {
      denialMessage = String(error.message || error);
    }

    assert.match(
      denialMessage,
      /createdByUid is undefined/,
      `expected isOwnAuditCreate failure, got: ${denialMessage}`
    );
  });
});

export {
  CLIENTS_CREATE_RULE,
};
