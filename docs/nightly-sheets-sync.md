# Nightly CRM → Google Sheets (краткая справка)

> **Полная пошаговая инструкция для настройки с нуля:**  
> **[SETUP-NIGHTLY-SYNC.md](./SETUP-NIGHTLY-SYNC.md)** — onboarding «для человека без DevOps», с ошибками, checklist и daily usage.

Ежедневная синхронизация **без Cloud Functions billing**:

- **GitHub Actions** cron (00:30 MSK)
- **Firestore** read via service account
- **Google Sheets API** full replace листа `Sync`

## Архитектура

```
Firestore (payments + clients)
        ↓
GitHub Actions (nightly)
        ↓
Google Sheet «CRM Sync» / tab Sync   ← source of truth
        ↓
Google Sheet «MM» via IMPORTRANGE + QUERY + charts
```

Realtime append через Cloud Functions **не нужен** для pilot.

---

## 1. Google Cloud: Service Account

1. [Google Cloud Console](https://console.cloud.google.com/) → IAM → Service Accounts
2. Create service account, e.g. `crm-sheets-sync`
3. Keys → Add key → JSON → сохранить файл
4. **Firestore**: Firebase Console → Project settings → Service accounts →  
   «Generate new private key» **или** добавить SA email в Firebase с ролью **Cloud Datastore User** / Editor
5. **Sheets**: открыть таблицу **CRM Sync** → Share → добавить email SA  
   `xxx@xxx.iam.gserviceaccount.com` → **Editor**

Создайте вкладки в CRM Sync spreadsheet:

| Tab | Назначение |
|-----|------------|
| `Sync` | 17 колонок продаж (заполняется автоматически) |
| `_Meta` | lastSyncAt, rowCount (автоматически) |

---

## 2. GitHub Secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Значение |
|--------|----------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Весь JSON service account (одной строкой) |
| `SHEETS_SPREADSHEET_ID` | ID из URL таблицы CRM Sync |
| `FIREBASE_PROJECT_ID` | Firebase project id |

Optional **Variables**:

| Variable | Default |
|----------|---------|
| `SHEETS_SYNC_TAB` | `Sync` |
| `SHEETS_META_TAB` | `_Meta` |

---

## 3. Ручной запуск

**GitHub**: Actions → «Nightly CRM → Google Sheets» → Run workflow

**Локально**:

```bash
cd functions
cp .env.example .env
# заполнить переменные
npm run nightly-sync
```

---

## 4. Колонки CRM Sync (17)

Дата · Тип сделки · Ссылка на диалог · VK · Сумма · Бюджет ·  
Когда старт · Первый контакт · Счёт · Откуда · Цикл · Курс ·  
Платежка · Email · Тариф · Примечания · Менеджер

Все типы оплат включая legacy client.

---

## 5. MM таблица (отдельный spreadsheet)

Создайте вторую Google таблицу **MM Dashboard**.

### Импорт сырых данных

В ячейку A1 листа `Data`:

```
=IMPORTRANGE("CRM_SYNC_SPREADSHEET_ID"; "Sync!A:Q")
```

При первом подключении нажмите **Allow access**.

### Пример KPI за месяц (лист `KPI`)

Выручка:

```
=SUM(FILTER(IMPORTRANGE("ID"; "Sync!A:Q"); 
  IMPORTRANGE("ID"; "Sync!A:A") >= DATE(YEAR(TODAY()); MONTH(TODAY()); 1);
  IMPORTRANGE("ID"; "Sync!A:A") <= EOMONTH(TODAY(); 0)))
```

*(колонка E = Сумма — уточните индекс после импорта)*

Проще: на листе `Data` колонка A = дата, E = сумма:

```
=SUM(FILTER(E:E; A:A >= DATE(YEAR(TODAY()); MONTH(TODAY()); 1); A:A <= EOMONTH(TODAY(); 0)))
```

### Выручка по менеджерам

```
=QUERY(Data!A:Q; 
  "SELECT Q, SUM(E) 
   WHERE A >= date '"&TEXT(DATE(YEAR(TODAY());MONTH(TODAY());1);"yyyy-mm-dd")&"' 
   GROUP BY Q 
   LABEL Q 'Менеджер', SUM(E) 'Выручка'"; 0)
```

### Traffic breakdown

```
=QUERY(Data!A:Q; 
  "SELECT J, SUM(E), COUNT(A) 
   GROUP BY J 
   LABEL J 'Traffic', SUM(E) 'Выручка', COUNT(A) 'Сделки'"; 0)
```

### Свежесть данных

```
=IMPORTRANGE("CRM_SYNC_SPREADSHEET_ID"; "_Meta!B2")
```

---

## 6. Стоимость

| Компонент | Стоимость |
|-----------|-----------|
| GitHub Actions (public repo) | Free tier достаточно |
| Google Sheets API | Free (квоты generous) |
| Firestore reads (1×/day) | Минимально |
| Cloud Functions | **Не используется** |

---

## 7. Логи

Каждый nightly run пишет документ в Firestore `syncLog` с `type: "nightly_full"`.

Admin → Management → Sync logs (если подключено в UI).
