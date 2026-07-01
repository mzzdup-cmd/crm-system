/**
 * Create Firebase Auth users + Firestore users/{uid} profiles.
 *
 * Usage:
 *   cd functions
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\service-account.json
 *   set DEFAULT_PASSWORD=TempPass2026!
 *   node scripts/provisionUsers.js
 *
 * Dry run (no writes):
 *   set DRY_RUN=1
 *   node scripts/provisionUsers.js
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

const DEFAULT_PASSWORD =
  process.env.DEFAULT_PASSWORD || "ChangeMe2026!";
const DRY_RUN =
  process.env.DRY_RUN === "1" ||
  process.env.DRY_RUN === "true";

const USERS = [
  {
    email: "admin@crm-school.ru",
    role: "admin",
    name: "Администратор",
  },
  {
    email: "rop@crm-school.ru",
    role: "rop",
    name: "РОП",
  },
  {
    email: "denis@crm-school.ru",
    role: "manager",
    managerId: "denis_manuilov",
    name: "Денис Мануйлов",
  },
  {
    email: "ruslan@crm-school.ru",
    role: "manager",
    managerId: "ruslan_romanyuk",
    name: "Руслан Романюк",
  },
  {
    email: "alexander@crm-school.ru",
    role: "manager",
    managerId: "alexander_simanov",
    name: "Александр Симанов",
  },
  {
    email: "sergey@crm-school.ru",
    role: "manager",
    managerId: "sergey_grebenshchikov",
    name: "Сергей Гребенщиков",
  },
  {
    email: "andrey@crm-school.ru",
    role: "manager",
    managerId: "andrey_volkov",
    name: "Андрей Волков",
  },
  {
    email: "polina.p@crm-school.ru",
    role: "manager",
    managerId: "polina_penkova",
    name: "Полина Пенькова",
  },
  {
    email: "katya@crm-school.ru",
    role: "manager",
    managerId: "katya_bakaeva",
    name: "Катя Бакаева",
  },
  {
    email: "polina.pl@crm-school.ru",
    role: "manager",
    managerId: "polina_plamadya",
    name: "Полина Пламадяла",
  },
  {
    email: "violeta@crm-school.ru",
    role: "manager",
    managerId: "violeta_petrova",
    name: "Виолетта Петрова",
  },
];

function buildProfile(user, uid) {
  const profile = {
    email: user.email,
    role: user.role,
    name: user.name,
    updatedAt: Date.now(),
  };

  if (user.role === "manager") {
    profile.managerId = user.managerId;
  }

  return profile;
}

async function findAuthUserByEmail(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return null;
    }

    throw error;
  }
}

async function provisionUser(user) {
  let authUser =
    await findAuthUserByEmail(user.email);

  if (!authUser) {
    console.log(`+ Auth: ${user.email}`);

    if (!DRY_RUN) {
      authUser = await auth.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        emailVerified: true,
        displayName: user.name,
      });
    }
  } else {
    console.log(`= Auth exists: ${user.email}`);
  }

  if (!authUser?.uid) {
    return {
      email: user.email,
      skipped: true,
    };
  }

  const profile =
    buildProfile(user, authUser.uid);

  console.log(
    `  Firestore users/${authUser.uid}`,
    profile
  );

  if (!DRY_RUN) {
    await db
      .collection("users")
      .doc(authUser.uid)
      .set(profile, { merge: true });
  }

  return {
    email: user.email,
    uid: authUser.uid,
    role: user.role,
  };
}

async function main() {
  console.log(
    DRY_RUN
      ? "DRY RUN — no changes will be written"
      : "LIVE RUN — creating/updating users"
  );
  console.log(
    `Default password for NEW accounts: ${DEFAULT_PASSWORD}`
  );
  console.log("");

  const results = [];

  for (const user of USERS) {
    results.push(
      await provisionUser(user)
    );
  }

  console.log("");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
