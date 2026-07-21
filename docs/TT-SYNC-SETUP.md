# Выгрузка CRM → ТТ таблицы менеджеров

**Режим:** append новых оплат (старые строки в ТТ не трогаем)  
**Расписание:** 00:00, 10:00, 16:00 МСК (GitHub Actions, 3 раза в день)  
**Конфиг:** `functions/src/sync/managerTtSpreadsheets.json` — все 9 менеджеров

---

## Таблицы менеджеров

| Менеджер | managerId | Google ТТ |
|----------|-----------|-----------|
| Денис Мануйлов | `denis_manuilov` | [ТТ](https://docs.google.com/spreadsheets/d/1q7zkVCRYkughAxE8iEk0MLWuQ-QhSVDGyQtDc0QHHbw/edit) |
| Руслан Романюк | `ruslan_romanyuk` | [ТТ](https://docs.google.com/spreadsheets/d/12eWNx1tF2ZncwZMHOQI_jACQ53-fA82BezLfEkWAbJ8/edit) |
| Александр Симанов | `alexander_simanov` | [ТТ](https://docs.google.com/spreadsheets/d/1_lKowx0s7R5ZsqBMsCh5kbfnXzRHKlmJVjZwqpK_K74/edit) |
| Сергей Гребенщиков | `sergey_grebenshchikov` | [ТТ](https://docs.google.com/spreadsheets/d/1gPXV--XRzniy6CjGTO0RPW_UMPrLsIO-qvV9vGM2NtU/edit) |
| Андрей Волков | `andrey_volkov` | [ТТ](https://docs.google.com/spreadsheets/d/1FgbmdiRIMmvDbSZRl5b9vN_9AUpGzLXWZAQdEtXif4k/edit) |
| Полина Пенькова | `polina_penkova` | [ТТ](https://docs.google.com/spreadsheets/d/1oobn5YDhpbA-6dLBU8H7jvn4zcJSC_cETaDfXkL5IOI/edit) |
| Катя Бакаева | `katya_bakaeva` | [ТТ](https://docs.google.com/spreadsheets/d/11tKQbI23PnvlQbTg_BwI2Q6HaMB5rBQqcRy99YIcpns/edit) |
| Полина Пламадяла | `polina_plamadya` | [ТТ](https://docs.google.com/spreadsheets/d/1VrdSedDxatTqzmSn5ULompwgTbmn52syTHC0_9CbOt0/edit) |
| Виолетта Петрова | `violeta_petrova` | [ТТ](https://docs.google.com/spreadsheets/d/1Eo76RuN0vYrsqa89l_B9nS8QlfsAFpA4_azgrzgC8IU/edit) |

---

## Как это работает

```
CRM (новая оплата, syncedToSheets=false)
        ↓
GitHub Actions (3 раза в день)
        ↓
ТТ таблица менеджера / вкладка TT  ← append строки A:P
        ↓
Общая ММ (как у вас уже настроено)
```

MM Sync (полная перезапись) **отключена**.

---

## Шаг 1 — доступ service account ко **всем 9 ТТ**

1. GitHub → Settings → Secrets → `GOOGLE_SERVICE_ACCOUNT_JSON`  
   Скопируйте `"client_email"` (…@…iam.gserviceaccount.com)
2. В **каждой** таблице из таблицы выше: **Поделиться** → email service account → **Редактор**

Без этого выгрузка для конкретного менеджера будет падать с Permission denied.

---

## Шаг 2 — GitHub Secrets

| Secret | Нужен? |
|--------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Да** |
| `FIREBASE_PROJECT_ID` | **Да** (`crm-school-v2`) |
| `MANAGER_TT_SPREADSHEETS_JSON` | **Нет** — конфиг в репозитории |
| `TT_KATYA_BAKAEVA_SPREADSHEET_ID` | **Нет** — устарело |
| `SHEETS_SPREADSHEET_ID` | **Нет** — MM sync отключена |

Если secret `MANAGER_TT_SPREADSHEETS_JSON` задан в GitHub — он **перебивает** файл из репо. Для продакшена лучше **удалить** его или обновить на полный JSON.

---

## Шаг 3 — запуск

После push:

GitHub → **Actions** → **CRM → TT Sheets Sync** → **Run workflow**

Или локально (нужен `.env` в `functions/`):

```bash
cd functions
npm run tt-sync
```

---

## Шаг 4 — проверка

1. В CRM создайте **тестовую оплату** от имени менеджера
2. Запустите workflow вручную (или дождитесь ближайшего слота)
3. В **его** Google ТТ на вкладке **TT** / **ТТ** внизу — **новая строка**
4. Старые строки **не изменились**
5. Дата в колонке A — формат `08.06.2026`

В Firestore у оплаты: `syncedToSheets: true`, `syncedToTt: true`.

В CRM: **Управление → Выгрузить новые оплаты сейчас** — ручной запуск (если настроен Cloud Function).

---

## Колонки A–P

| Col | Поле |
|-----|------|
| A | Дата (DD.MM.YYYY) |
| B | Тип сделки |
| C | Имя лида / ссылка на диалог |
| D | Ссылка VK |
| E | Сумма |
| F | Бюджет |
| G | Когда старт |
| H | Дата первого контакта |
| I | Номер счета |
| J | Откуда? |
| K | Цикл |
| L | Курс |
| M | Платежная система |
| N | Эл. почта |
| O | Тариф |
| P | Примечания |

---

## Расписание cron

| МСК | UTC | cron |
|-----|-----|------|
| 00:00 | 21:00 | `0 21 * * *` |
| 10:00 | 07:00 | `0 7 * * *` |
| 16:00 | 13:00 | `0 13 * * *` |

---

## Если ошибка

| Симптом | Решение |
|---------|---------|
| Permission denied | Service account → Редактор в **этой** ТТ |
| Оплата skipped | `managerId` оплаты не в конфиге |
| Дата не тот формат | Проверить колонку A в новой строке |
| `Unable to parse range: TT!A:P` | Вкладка **ТТ** (кириллица) — код определяет автоматически |
| Secret перебивает конфиг | Удалить `MANAGER_TT_SPREADSHEETS_JSON` в GitHub |
