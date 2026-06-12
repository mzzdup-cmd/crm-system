# Выгрузка CRM → ТТ таблицы менеджеров

**Режим:** append новых оплат (старые строки в ТТ не трогаем)  
**Расписание:** 01:00, 13:00, 20:00 МСК (GitHub Actions)  
**Тест:** только таблица «Копия ТТ Академия Катя Б» → менеджер `katya_bakaeva`

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

## Шаг 1 — доступ service account к тестовой ТТ

1. GitHub → Settings → Secrets → скопируйте email из `GOOGLE_SERVICE_ACCOUNT_JSON`  
   (поле `"client_email": "....@....iam.gserviceaccount.com"`)
2. Откройте [Копия ТТ Академия Катя Б](https://docs.google.com/spreadsheets/d/1B1IBqS3hdpBSv6Ge8l8poWqS-YIHTv_UF4yFIoBPDCc/edit)
3. **Поделиться** → email service account → **Редактор**

---

## Шаг 2 — GitHub Secret (опционально)

По умолчанию в коде уже прописан ID тестовой таблицы Кати.  
Можно добавить secret для явности:

| Secret | Значение |
|--------|----------|
| `TT_KATYA_BAKAEVA_SPREADSHEET_ID` | `1B1IBqS3hdpBSv6Ge8l8poWqS-YIHTv_UF4yFIoBPDCc` |

Остальные secrets без изменений:
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_PROJECT_ID`

`SHEETS_SPREADSHEET_ID` больше **не нужен**.

---

## Шаг 3 — push и первый запуск

```bash
git add .
git commit -m "TT sheets sync: append to manager tables"
git push origin main
```

GitHub → **Actions** → **CRM → TT Sheets Sync** → **Run workflow**

---

## Шаг 4 — проверка

1. В CRM создайте **тестовую оплату** от имени **Кати Бакаевой**
2. Запустите workflow вручную (или дождитесь ближайшего слота)
3. В таблице «Копия ТТ» на вкладке **TT** внизу должна появиться **новая строка**
4. Старые строки (1104+) **не изменились**
5. Дата в колонке A — формат `08.06.2026`

В Firestore у оплаты: `syncedToSheets: true`, `syncedToTt: true`.

---

## Шаг 5 — после успешного теста

1. Добавить spreadsheet ID для остальных 8 менеджеров
2. Выдать service account доступ к каждой оригинальной ТТ
3. Обновить secret `MANAGER_TT_SPREADSHEETS_JSON`:

```json
{
  "katya_bakaeva": {
    "spreadsheetId": "ID_ОРИГИНАЛЬНОЙ_ТТ_КАТИ",
    "sheetName": "TT",
    "label": "ТТ Академия Катя Б"
  },
  "violeta_petrova": {
    "spreadsheetId": "...",
    "sheetName": "TT",
    "label": "ТТ Виолетты"
  }
}
```

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
| 01:00 | 22:00 (пред. день) | `0 22 * * *` |
| 13:00 | 10:00 | `0 10 * * *` |
| 20:00 | 17:00 | `0 17 * * *` |

---

## Если ошибка

| Симптом | Решение |
|---------|---------|
| Permission denied | Service account → Редактор в ТТ |
| Оплата skipped | Менеджер не в конфиге (тест: только Катя) |
| Дата не тот формат | Проверить колонку A в новой строке |
| Workflow не виден | `git push` с новым workflow файлом |
