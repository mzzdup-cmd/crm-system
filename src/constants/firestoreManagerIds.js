/**
 * Exact users/{uid}.managerId values from Firestore (source of truth for security rules).
 */
export const FIRESTORE_MANAGER_ID_BY_EMAIL = {
  "denis@crm-school.ru": "denis_manuilov",
  "ruslan@crm-school.ru": "ruslan_romanyuk",
  "alexander@crm-school.ru": "alexander_simanov",
  "sergey@crm-school.ru": "sergey_grebenshchikov",
  "andrey@crm-school.ru": "andrey_volkov",
  "polina.p@crm-school.ru": "polina_penkova",
  "katya@crm-school.ru": "katya_bakaeva",
  "polina.pl@crm-school.ru": "polina_plamadya",
  "vilu@crm-school.ru": "vilu_petrova",
  "violeta@crm-school.ru": "vilu_petrova",
};

export function getFirestoreManagerIdByEmail(
  email
) {
  if (!email) {
    return null;
  }

  return (
    FIRESTORE_MANAGER_ID_BY_EMAIL[
      email.trim().toLowerCase()
    ] ?? null
  );
}
