/**
 * Email → Firestore users/{uid} profile (mirrors functions/scripts/provisionUsers.js).
 */
export const PROVISION_PROFILES = {
  "admin@crm-school.ru": {
    role: "admin",
    name: "Администратор",
  },
  "rop@crm-school.ru": {
    role: "rop",
    name: "РОП",
  },
  "denis@crm-school.ru": {
    role: "manager",
    managerId: "denis_manuilov",
    name: "Денис Мануйлов",
  },
  "ruslan@crm-school.ru": {
    role: "manager",
    managerId: "ruslan_romanyuk",
    name: "Руслан Романюк",
  },
  "alexander@crm-school.ru": {
    role: "manager",
    managerId: "alexander_simanov",
    name: "Александр Симанов",
  },
  "sergey@crm-school.ru": {
    role: "manager",
    managerId: "sergey_grebenshchikov",
    name: "Сергей Гребенщиков",
  },
  "andrey@crm-school.ru": {
    role: "manager",
    managerId: "andrey_volkov",
    name: "Андрей Волков",
  },
  "polina.p@crm-school.ru": {
    role: "manager",
    managerId: "polina_penkova",
    name: "Полина Пенькова",
  },
  "katya@crm-school.ru": {
    role: "manager",
    managerId: "katya_bakaeva",
    name: "Катя Бакаева",
  },
  "polina.pl@crm-school.ru": {
    role: "manager",
    managerId: "polina_plamadya",
    name: "Полина Пламадяла",
  },
  "vilu@crm-school.ru": {
    role: "manager",
    managerId: "vilu_petrova",
    name: "Виолетта Петрова",
  },
  "violeta@crm-school.ru": {
    role: "manager",
    managerId: "vilu_petrova",
    name: "Виолетта Петрова",
  },
};

export function getProvisionProfileForEmail(
  email
) {
  if (!email) {
    return null;
  }

  return (
    PROVISION_PROFILES[
      email.trim().toLowerCase()
    ] ?? null
  );
}
