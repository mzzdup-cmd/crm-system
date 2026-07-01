# Доступы в CRM — настройка пользователей

**Проект Firebase:** `crm-school-v2`  
**Сайт:** https://crm-school-v2.web.app

---

## Роли

| Роль | `role` в Firestore | Что видит |
|---|---|---|
| **Admin** | `admin` | Всё + управление пользователями |
| **РОП** | `rop` | Как руководитель: аналитика, управление, зарплата команды, согласование запросов. В меню подпись **«РОП»** |
| **Менеджер** | `manager` | Только свои клиенты и оплаты |

---

## Список аккаунтов (шаблон)

| Email | Роль | managerId | Имя |
|---|---|---|---|
| admin@crm-school.ru | admin | — | Администратор |
| rop@crm-school.ru | rop | — | РОП |
| denis@crm-school.ru | manager | denis_manuilov | Денис Мануйлов |
| ruslan@crm-school.ru | manager | ruslan_romanyuk | Руслан Романюк |
| alexander@crm-school.ru | manager | alexander_simanov | Александр Симанов |
| sergey@crm-school.ru | manager | sergey_grebenshchikov | Сергей Гребенщиков |
| andrey@crm-school.ru | manager | andrey_volkov | Андрей Волков |
| polina.p@crm-school.ru | manager | polina_penkova | Полина Пенькова |
| katya@crm-school.ru | manager | katya_bakaeva | Катя Бакаева |
| polina.pl@crm-school.ru | manager | polina_plamadya | Полина Пламадяла |
| violeta@crm-school.ru | manager | violeta_petrova | Виолетта Петрова |

> Emails можно заменить на реальные рабочие — главное, чтобы **role** и **managerId** совпадали.

---

## Способ 1 — вручную в Firebase Console

### Шаг A. Authentication → пользователи

Для каждого человека: **Add user** → email + временный пароль.

### Шаг B. Firestore → коллекция `users`

Создать документ с **ID = UID** из Authentication (не email!).

**Admin:**
```
email: admin@...
role: admin
name: Администратор
```

**РОП:**
```
email: rop@...
role: rop
name: РОП
```

**Менеджер (пример Кати):**
```
email: katya@...
role: manager
managerId: katya_bakaeva
name: Катя Бакаева
```

### Проверка

1. Войти под менеджером → видны только **свои** продажи  
2. Войти под РОП → в меню **MM Аналитика**, **Управление**, подпись **РОП**  
3. Войти под admin → всё + может править `users`

---

## Способ 2 — скрипт (быстрее)

```powershell
cd functions
$env:GOOGLE_APPLICATION_CREDENTIALS="путь\к\service-account.json"
$env:DEFAULT_PASSWORD="ВременныйПароль2026!"
node scripts/provisionUsers.js
```

Пробный запуск без записи:
```powershell
$env:DRY_RUN="1"
node scripts/provisionUsers.js
```

Скрипт: `functions/scripts/provisionUsers.js`

---

## После создания аккаунтов

1. **Deploy Production** — чтобы роль РОП работала на сайте  
2. **Deploy Firestore rules** — `firebase deploy --only firestore:rules`  
3. Раздайте менеджерам email + временный пароль  
4. Попросите сменить пароль при первом входе (Firebase → Reset password)

---

## Важно

- Без документа в **`users/{uid}`** человек войдёт, но CRM не покажет данные  
- **`managerId`** должен совпадать с `constants/managers.js`  
- РОП **не привязан** к managerId — видит всю команду  
- Текущие тестовые аккаунты (`katya@test.ru` и т.д.) можно оставить или удалить
