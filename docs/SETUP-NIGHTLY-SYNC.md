# Полная инструкция: Nightly Sync CRM → Google Sheets

**Для кого:** администратор CRM без опыта DevOps  
**Время на первую настройку:** 1–2 часа (спокойно, с проверками)  
**Стоимость:** бесплатно (GitHub Actions + Google Sheets API, без Cloud Functions billing)

---

## Содержание

1. [Что вы настраиваете — простыми словами](#1-что-вы-настраиваете--простыми-словами)
2. [Что подготовить до начала](#2-что-подготовить-до-начала)
3. [Часть A — Таблица «CRM Sync»](#часть-a--таблица-crm-sync)
4. [Часть B — Таблица «MM Dashboard»](#часть-b--таблица-mm-dashboard)
5. [Часть C — Google Cloud: API и ключ доступа](#часть-c--google-cloud-api-и-ключ-доступа)
6. [Часть D — Доступ к Firebase (Firestore)](#часть-d--доступ-к-firebase-firestore)
7. [Часть E — GitHub Secrets](#часть-e--github-secrets)
8. [Часть F — Первый запуск и проверка](#часть-f--первый-запуск-и-проверка)
9. [Если появилась ошибка — что делать](#9-если-появилась-ошибка--что-делать)
10. [Что НЕ трогать (важно)](#10-что-не-трогать-важно)
11. [Ежедневное использование](#11-ежедневное-использование)
12. [Backup и безопасность](#12-backup-и-безопасность)
13. [Финальный checklist: CRM готова к работе](#13-финальный-checklist-crm-готова-к-работе)

---

## 1. Что вы настраиваете — простыми словами

У вас есть **CRM** (сайт, куда менеджеры вносят оплаты).  
Данные хранятся в **Firebase / Firestore** (облачная база).

Вам нужно, чтобы **раз в сутки** (ночью, после 00:00 по Москве) все продажи автоматически попадали в **Google Таблицу «CRM Sync»**.

Из этой таблицы строится **MM Dashboard** — отдельная Google Таблица с KPI, графиками, выручкой по менеджерам (через формулы `IMPORTRANGE` и `QUERY`).

**Кто что делает:**

| Компонент | Роль |
|-----------|------|
| **Firestore** | Главное хранилище CRM (источник правды для приложения) |
| **GitHub Actions** | «Будильник» — раз в ночь запускает скрипт синхронизации |
| **Service Account (ключ JSON)** | Пропуск: скрипт может читать Firestore и писать в Google Sheets |
| **Таблица CRM Sync** | Экспорт всех продаж (17 колонок) — обновляется целиком каждую ночь |
| **Таблица MM** | Аналитика для руководства — подтягивает данные из CRM Sync формулами |

**Realtime-синхронизация не используется** — только nightly (раз в сутки). Это нормально для pilot.

---

## 2. Что подготовить до начала

Отметьте галочкой, когда готово:

- [ ] Аккаунт **Google** (тот же, что используется для Firebase, если возможно)
- [ ] Доступ **admin** в CRM (вход в приложение под руководителем)
- [ ] Доступ **owner/admin** к репозиторию на **GitHub** (где лежит код `crm-school-v2`)
- [ ] Доступ к **Firebase Console** (console.firebase.google.com)
- [ ] 1–2 часа времени без спешки
- [ ] Блокнот / файл, куда сохраните:
  - ID таблицы CRM Sync
  - ID таблицы MM (если отдельная)
  - Firebase Project ID
  - Email service account (из JSON-ключа)

**Не делайте настройку в последний день перед показом руководству** — сначала пройдите тестовый запуск (Часть F).

---

## Часть A — Таблица «CRM Sync»

Это **первая** Google Таблица. В неё каждую ночь скрипт записывает все продажи.

### Шаг A1. Создать таблицу

1. Откройте браузер → [https://sheets.google.com](https://sheets.google.com)
2. Нажмите **«+ Пустой файл»** (или **Blank spreadsheet**)
3. Вверху нажмите на название «Новая таблица» → переименуйте в: **`CRM Sync`**
4. Сохранение автоматическое (Google Sheets)

### Шаг A2. Создать вкладки (листы)

Внизу окна таблицы видны вкладки листов (по умолчанию «Лист1»).

**Вкладка 1 — `Sync`**

1. Правый клик по «Лист1» → **Переименовать**
2. Введите **точно:** `Sync`  
   (латиница, с большой буквы S — **без пробелов**)
3. Нажмите Enter

**Вкладка 2 — `_Meta`**

1. Нажмите **«+»** слева от вкладок (добавить лист)
2. Переименуйте новый лист в: **`_Meta`**  
   (подчёркивание + Meta, латиница)
3. Лист `_Meta` можно оставить пустым — скрипт сам запишет туда время последней синхронизации

> **Важно:** названия `Sync` и `_Meta` нельзя менять после настройки (см. раздел «Что НЕ трогать»).

### Шаг A3. Записать ID таблицы (SHEETS_SPREADSHEET_ID)

1. Откройте таблицу **CRM Sync**
2. Посмотрите на **адресную строку** браузера. URL выглядит так:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890/edit#gid=0
```

3. Скопируйте **только среднюю часть** между `/d/` и `/edit`:

```
1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

4. Сохраните в блокнот как **`SHEETS_SPREADSHEET_ID`**

**Частые ошибки:**
- ❌ копировать весь URL
- ❌ копировать вместе с `/edit`
- ✅ только длинная строка букв и цифр

### Шаг A4. (Опционально) Заголовки на листе Sync

Скрипт **сам** запишет строку заголовков при первом sync.  
Можно ничего не вводить вручную.

Если хотите видеть заранее, в строке 1 листа `Sync` (колонки A–Q):

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Дата | Тип сделки | Ссылка на диалог | Ссылка VK клиента | Сумма | Бюджет | Когда старт | Дата первого контакта | Номер счета | Откуда | Цикл | Курс | Платежная система | Email | Тариф | Примечания | Менеджер |

После первого nightly sync скрипт **перезапишет** лист целиком (это нормально).

---

## Часть B — Таблица «MM Dashboard»

Отдельная таблица для руководства. **Скрипт в неё не пишет** — она сама подтягивает данные формулами из CRM Sync.

### Шаг B1. Создать вторую таблицу

1. [https://sheets.google.com](https://sheets.google.com) → **+ Пустой файл**
2. Переименуйте в: **`MM Dashboard`**
3. Сохраните её **ID** из URL (так же, как в A3) — пригодится для формул

### Шаг B2. Создать листы

Рекомендуемая структура (можно добавлять постепенно):

| Вкладка | Назначение |
|---------|------------|
| `Data` | Сырые данные из CRM Sync (формула IMPORTRANGE) |
| `KPI` | Выручка месяца, средний чек, сводки |
| `Managers` | Выручка по менеджерам |
| `Traffic` | Разбивка по traffic |
| `Info` | Время последнего sync |

### Шаг B3. Подключить данные CRM Sync (лист Data)

1. Откройте **MM Dashboard** → вкладка **`Data`**
2. Кликните ячейку **`A1`**
3. Вставьте формулу (замените `ВАШ_ID_CRM_SYNC` на ID из шага A3):

```
=IMPORTRANGE("ВАШ_ID_CRM_SYNC"; "Sync!A:Q")
```

> **Примечание:** в русской локали Google Sheets разделитель аргументов — **точка с запятой `;`**.  
> Если у вас английская локаль — используйте запятую `,` вместо `;`.

4. Нажмите **Enter**
5. Появится ошибка **#REF!** и кнопка **«Разрешить доступ»** / **Allow access**  
   → **Нажмите «Разрешить доступ»**
6. Подождите 5–30 секунд — данные появятся (если CRM Sync уже был хотя бы один раз синхронизирован)

Если CRM Sync ещё пустой — `Data` тоже будет пустым до первого успешного sync (Часть F).

### Шаг B4. Время последнего sync (лист Info)

На листе **`Info`**, ячейка **B2**:

```
=IMPORTRANGE("ВАШ_ID_CRM_SYNC"; "_Meta!B2")
```

Колонка B в `_Meta` содержит ISO-время последней синхронизации.  
Колонка C — время по Москве (`lastSyncAtMsk`).

### Шаг B5. Пример: выручка за текущий месяц (лист KPI)

На листе **`KPI`**, после того как `Data` заполнен:

Ячейка для **выручки месяца** (колонка E в Data = «Сумма», колонка A = «Дата»):

```
=SUM(FILTER(Data!E:E; Data!A:A >= DATE(YEAR(TODAY()); MONTH(TODAY()); 1); Data!A:A <= EOMONTH(TODAY(); 0)))
```

### Шаг B6. Пример: выручка по менеджерам (лист Managers)

Колонка Q в Data = «Менеджер»:

```
=QUERY(Data!A:Q; "SELECT Q, SUM(E) WHERE A IS NOT NULL GROUP BY Q LABEL Q 'Менеджер', SUM(E) 'Выручка'"; 0)
```

### Шаг B7. Пример: traffic (лист Traffic)

Колонка J = «Откуда»:

```
=QUERY(Data!A:Q; "SELECT J, SUM(E), COUNT(A) WHERE J IS NOT NULL GROUP BY J LABEL J 'Traffic', SUM(E) 'Выручка', COUNT(A) 'Сделки'"; 0)
```

### Шаг B8. Графики

1. Выделите таблицу на листе `Managers` или `Traffic`
2. Меню **Вставка** → **Диаграмма**
3. Выберите тип (столбчатая / линейная)
4. График будет обновляться, когда обновится `Data` (после nightly sync)

---

## Часть C — Google Cloud: API и ключ доступа

Скрипту нужен **сервисный аккаунт** — это «робот» с ключом JSON.  
Он читает Firestore и пишет в Google Sheets.

### Шаг C1. Узнать Firebase Project ID

1. Откройте [https://console.firebase.google.com](https://console.firebase.google.com)
2. Выберите проект CRM
3. Нажмите **шестерёнку** → **Project settings** / **Настройки проекта**
4. Вкладка **General** → поле **Project ID**  
   Пример: `crm-school-v2-a1b2c`  
5. Сохраните как **`FIREBASE_PROJECT_ID`**

### Шаг C2. Открыть Google Cloud Console того же проекта

1. В Firebase **Project settings** → внизу ссылка **Google Cloud** / **Open in Google Cloud Console**
2. Или: [https://console.cloud.google.com](https://console.cloud.google.com) → выберите **тот же проект** (имя совпадает с Firebase)

### Шаг C3. Включить Google Sheets API

1. В Google Cloud Console слева: **APIs & Services** → **Library**  
   (или **API и сервисы** → **Библиотека**)
2. В поиске введите: **`Google Sheets API`**
3. Откройте **Google Sheets API**
4. Нажмите **Enable** / **Включить**
5. Дождитесь активации (обычно несколько секунд)

> Если API не включить — sync упадёт с ошибкой про API disabled (см. раздел ошибок).

### Шаг C4. Скачать JSON-ключ (рекомендуемый способ — через Firebase)

**Это самый простой путь для non-DevOps:**

1. [Firebase Console](https://console.firebase.google.com) → ваш проект
2. **Project settings** (шестерёнка)
3. Вкладка **Service accounts**
4. Внизу кнопка **Generate new private key** / **Создать новый закрытый ключ**
5. Подтвердите **Generate key**
6. Скачается файл `.json` (например `crm-school-v2-firebase-adminsdk-xxxxx.json`)

**Сохраните файл в безопасное месте:**
- ❌ не отправляйте в Telegram / общий чат
- ❌ не коммитьте в GitHub
- ✅ только GitHub Secret (шаг E) или зашифрованное хранилище

7. Откройте JSON в **Блокноте** / Notepad  
8. Найдите поле **`"client_email"`** — скопируйте email, например:

```
firebase-adminsdk-abc12@crm-school-v2-a1b2c.iam.gserviceaccount.com
```

9. Сохраните email — он нужен для **Share** таблицы (шаг C5)

**Весь текст JSON** (от `{` до `}`) понадобится для GitHub Secret **`GOOGLE_SERVICE_ACCOUNT_JSON`**.

### Шаг C5. Дать доступ к таблице CRM Sync

1. Откройте Google Таблицу **CRM Sync**
2. Нажмите **Share** / **Настройки доступа** (синяя кнопка справа вверху)
3. В поле «Добавить пользователей» вставьте **`client_email`** из JSON
4. Роль: **Editor** / **Редактор**
5. **Снимите галочку** «Notify people» (необязательно уведомлять робота)
6. Нажмите **Share** / **Готово**

Без этого шага sync упадёт с **Permission denied** при записи в Sheets.

---

## Часть D — Доступ к Firebase (Firestore)

JSON-ключ из Firebase (шаг C4) **уже имеет права** читать Firestore — отдельная настройка обычно **не нужна**.

**Проверка:** если ключ создан через Firebase → Service accounts → Generate new private key, всё должно работать.

Если используете **отдельный** service account из Google Cloud IAM (продвинутый путь):

1. Google Cloud → **IAM & Admin** → **IAM**
2. Найдите email service account → роль **Cloud Datastore User** или **Firebase Admin**

Для pilot **используйте Firebase key** (шаг C4) — меньше шансов ошибиться.

---

## Часть E — GitHub Secrets

Секреты — это «сейф» GitHub. Скрипт nightly sync читает их при запуске.

### Шаг E1. Открыть настройки репозитория

1. Откройте GitHub в браузере
2. Перейдите в репозиторий **`crm-school-v2`** (или как он у вас называется)
3. Вверху вкладка **Settings** / **Настройки**  
   (видна только если у вас права admin на repo)
4. Слева: **Secrets and variables** → **Actions**

### Шаг E2. Secret 1 — GOOGLE_SERVICE_ACCOUNT_JSON

1. Нажмите **New repository secret**
2. **Name:** `GOOGLE_SERVICE_ACCOUNT_JSON` (скопируйте точно, регистр важен)
3. **Secret:** откройте скачанный JSON в блокноте → **Ctrl+A** → **Ctrl+C** → вставьте **весь** файл  
   Должен начинаться с `{` и заканчиваться `}`
4. **Add secret**

**Частые ошибки:**
- ❌ вставить только `private_key` — нужен **весь** JSON
- ❌ обернуть JSON в дополнительные кавычки `"..."`  
- ❌ добавить пробелы в начале/конце

### Шаг E3. Secret 2 — SHEETS_SPREADSHEET_ID

1. **New repository secret**
2. **Name:** `SHEETS_SPREADSHEET_ID`
3. **Secret:** ID из шага A3 (только строка между `/d/` и `/edit`)
4. **Add secret**

### Шаг E4. Secret 3 — FIREBASE_PROJECT_ID

1. **New repository secret**
2. **Name:** `FIREBASE_PROJECT_ID`
3. **Secret:** Project ID из шага C1
4. **Add secret**

### Шаг E5. Проверить список секретов

Должны быть **ровно три** secret (имена видны, значения скрыты):

- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON`
- [ ] `SHEETS_SPREADSHEET_ID`
- [ ] `FIREBASE_PROJECT_ID`

---

## Часть F — Первый запуск и проверка

### Шаг F1. Убедиться, что workflow есть в репозитории

1. GitHub → репозиторий → вкладка **Actions**
2. Слева в списке workflows должен быть: **Nightly CRM → Google Sheets**

Если его нет — код с workflow ещё не запушен в GitHub (нужен `git push` от разработчика).

### Шаг F2. Ручной запуск (первый тест)

1. **Actions** → **Nightly CRM → Google Sheets**
2. Справа **Run workflow** (выпадающая кнопка)
3. Branch: **main** (или ваша основная ветка)
4. **Run workflow**
5. Обновите страницу — появится жёлтый / оранжевый run «in progress»
6. Подождите **1–3 минуты**
7. Статус должен стать **зелёная галочка** ✅

### Шаг F3. Проверить CRM Sync

1. Откройте Google Таблицу **CRM Sync**
2. Вкладка **`Sync`** — должны появиться:
   - строка 1: заголовки (Дата, Тип сделки, …)
   - строки 2+: данные оплат из CRM
3. Вкладка **`_Meta`** — должно быть:
   - `lastSyncAt` — время UTC
   - `lastSyncAtMsk` — время по Москве
   - `rowCount` — число строк данных
   - `paymentCount` — число оплат в Firestore

### Шаг F4. Проверить MM Dashboard

1. Откройте **MM Dashboard**
2. Лист **`Data`** — данные должны совпадать с CRM Sync  
   (может потребоваться **обновить страницу** F5)
3. Лист **`Info`** — время sync совпадает с `_Meta`

### Шаг F5. Проверить лог в GitHub (если что-то не так)

1. **Actions** → клик по последнему run
2. **sync** → **Run nightly full sync**
3. В логе в конце должно быть:

```json
"status": "success",
"paymentCount": ...,
"rowCount": ...
```

### Шаг F6. Автоматический nightly запуск

После успешного ручного теста **ничего больше делать не нужно**.

Workflow запускается **каждый день ~00:30 по Москве** (21:30 UTC).

---

## 9. Если появилась ошибка — что делать

### 🔴 Workflow failed (красный крестик в GitHub Actions)

**Что делать:**

1. Actions → failed run → **Run nightly full sync** → прочитать **последние 20–30 строк** лога
2. Найти своё сообщение ниже по тексту ошибки
3. Исправить → **Run workflow** снова

---

### 🔴 `SHEETS_SPREADSHEET_ID is not configured`

**Причина:** не добавлен secret или опечатка в имени.

**Решение:**

1. Settings → Secrets → проверьте имя **`SHEETS_SPREADSHEET_ID`**
2. Значение — только ID, без URL

---

### 🔴 `GOOGLE_SERVICE_ACCOUNT_JSON is not configured`

**Причина:** secret пустой или не создан.

**Решение:** повторите шаг E2 — вставьте **полный** JSON.

---

### 🔴 `Unexpected token` / `JSON.parse` error

**Причина:** JSON в secret повреждён (обрезан, лишние кавычки).

**Решение:**

1. Удалите secret `GOOGLE_SERVICE_ACCOUNT_JSON`
2. Создайте заново — скопируйте JSON файл **целиком** из блокнота

---

### 🔴 `Permission denied` / `The caller does not have permission` (Google Sheets)

**Причина:** service account не добавлен в Share таблицы CRM Sync.

**Решение:**

1. Откройте JSON → скопируйте `client_email`
2. CRM Sync → Share → добавьте email → **Editor**
3. Перезапустите workflow

---

### 🔴 `Google Sheets API has not been used` / `API disabled`

**Причина:** не включён Google Sheets API.

**Решение:** Часть C3 → Enable Google Sheets API → подождать 1–2 мин → retry.

---

### 🔴 `Unable to detect a Project Id` / Firebase project error

**Причина:** неверный `FIREBASE_PROJECT_ID` или JSON от другого проекта.

**Решение:**

1. Firebase Console → Project ID
2. Secret `FIREBASE_PROJECT_ID` должен **совпадать**
3. JSON-ключ должен быть от **того же** проекта

---

### 🔴 `Requested entity was not found` (лист Sync / _Meta)

**Причина:** вкладка переименована или удалена.

**Решение:**

1. CRM Sync → создайте вкладки **`Sync`** и **`_Meta`** (точные имена)
2. Retry workflow

---

### 🔴 Таблица не обновляется, но workflow зелёный

**Проверьте:**

1. Открываете **ту же** таблицу, ID которой в secret?
2. Смотрите вкладку **`Sync`**, не другую?
3. `_Meta` → `lastSyncAtMsk` — обновилось?
4. MM Dashboard → **F5** (IMPORTRANGE не realtime)

---

### 🔴 MM показывает #REF! или #N/A

| Ошибка | Решение |
|--------|---------|
| `#REF!` + «Разрешить доступ» | Нажмите **Allow access** на листе Data |
| `#N/A` | CRM Sync пуст — сначала успешный sync |
| `#ERROR!` в QUERY | Проверьте имена листов (`Data`) и разделитель `;` vs `,` |

---

### 🔴 Invalid service account / 401 / 403 Firestore

**Решение:**

1. Сгенерируйте **новый** ключ: Firebase → Service accounts → Generate new private key
2. Обновите secret `GOOGLE_SERVICE_ACCOUNT_JSON`
3. Share CRM Sync с **новым** `client_email`
4. **Старый ключ** можно удалить в Google Cloud → Service accounts → Keys (после проверки нового)

---

## 10. Что НЕ трогать (важно)

### В Google Таблице CRM Sync

| ❌ Нельзя | Почему |
|----------|--------|
| Переименовать вкладку `Sync` | Скрипт пишет в `Sync!A:Q` |
| Переименовать вкладку `_Meta` | Скрипт пишет метаданные sync |
| Удалять service account из Share | Sync перестанет писать |
| Менять service account email без обновления GitHub Secret | Ошибка доступа |

### Можно (осторожно)

| ✅ Можно | Комментарий |
|----------|-------------|
| Добавлять **другие вкладки** в CRM Sync | Sync и _Meta не трогать |
| Фильтры / цвета на листе Sync | Следующий nightly sync **сотрёт** лист и перезапишет — оформление не сохранится |
| Копировать CRM Sync для backup | Рекомендуется (см. Backup) |

### В GitHub

| ❌ Нельзя | Почему |
|----------|--------|
| Удалять secrets | Sync сломается |
| Переименовывать secrets | Workflow не найдёт значения |
| Удалять файл `.github/workflows/nightly-sheets-sync.yml` | Автозапуск исчезнет |

### В Firebase / CRM

| ❌ Нельзя для sync | |
|--------------------|---|
| Удалять коллекции `payments`, `clients` | Нечего экспортировать |

| ✅ Источник правды | |
|---------------------|---|
| **Firestore** — главная база | Google Sheet — **копия для аналитики**, обновляется nightly |

---

## 11. Ежедневное использование

### Когда обновляются данные

| Что | Когда |
|-----|-------|
| CRM (сайт) | Сразу при внесении оплаты |
| CRM Sync (Google) | ~**00:30 ночи** по Москве |
| MM Dashboard | После обновления CRM Sync (формулы; может нужен F5) |

### Где смотреть последний sync

1. **CRM Sync** → вкладка **`_Meta`** → строка `lastSyncAtMsk`
2. **MM Dashboard** → лист **`Info`** (если настроили формулу)
3. **GitHub** → Actions → последний зелёный run + время

### Как понять, что всё обновилось

- [ ] `_Meta` → `lastSyncAtMsk` — **сегодняшняя** дата (после 00:30)
- [ ] `rowCount` / `paymentCount` выросли (если были новые оплаты)
- [ ] В CRM Sync на `Sync` видны **вчерашние** оплаты
- [ ] MM Dashboard `Data` совпадает после F5

### Как вручную перезапустить sync (днём)

Если нужно обновить таблицу **не дожидаясь ночи**:

1. GitHub → **Actions**
2. **Nightly CRM → Google Sheets**
3. **Run workflow** → **Run workflow**
4. Подождать зелёную галочку
5. Обновить CRM Sync и MM (F5)

**Когда это нужно:** перед показом руководству, после массового внесения оплат.

### Как проверить MM

1. Сравните **сумму за месяц** в MM (KPI) с CRM → Admin analytics / Salary (порядок цифр)
2. Проверьте, что **новая оплата** вчера вечером появилась после nightly sync
3. Графики на `Managers` / `Traffic` — визуально

---

## 12. Backup и безопасность

### Где лежат данные (иерархия)

```
1. Firestore (CRM)     ← ГЛАВНОЕ, не теряется при сбое Sheets
2. CRM Sync (Google)   ← nightly копия для MM
3. MM Dashboard        ← формулы поверх CRM Sync
```

**Если сломался Google Sheets sync — CRM продолжает работать.**  
Менеджеры вносят оплаты как обычно.

### Ручной export (если sync не работает)

1. Войти в CRM как **admin**
2. **Management** → **Export Center**
3. Скачать Excel / CSV с оплатами
4. Вручную вставить в Google Sheet или отправить руководству

### Backup Google Таблиц

**Раз в неделю (рекомендуется):**

1. Открыть **CRM Sync**
2. **File** → **Make a copy** / **Файл** → **Создать копию**
3. Назвать: `CRM Sync backup 2026-06-09`

То же для **MM Dashboard**.

### Backup GitHub Secrets

- JSON-ключ храните в **менеджере паролей** (1Password, Bitwarden) или зашифрованной папке
- Запишите `SHEETS_SPREADSHEET_ID` и `FIREBASE_PROJECT_ID` в тот же блокнот

### Если workflow сломался — быстрый recovery

| Шаг | Действие |
|-----|----------|
| 1 | CRM работает? → да, продолжаем работу |
| 2 | Export Center → ручной export для руководства |
| 3 | Actions → прочитать лог ошибки (раздел 9) |
| 4 | Исправить secrets / Share / API |
| 5 | Run workflow вручную |
| 6 | Проверить `_Meta` |

### Потеря JSON-ключа

1. Firebase → Service accounts → **Generate new private key**
2. Обновить GitHub Secret
3. Share CRM Sync с новым email
4. Старый ключ удалить (Google Cloud → Keys)

---

## 13. Финальный checklist: CRM готова к работе

Пройдите **перед показом руководству**. Отмечайте ✅.

### A. CRM приложение

- [ ] Менеджеры могут войти и внести оплату
- [ ] Admin видит Dashboard, Analytics, Management
- [ ] Traffic sources работают
- [ ] Legacy client mode (старые клиенты) работает
- [ ] Запросы на выходные / отпуск доступны
- [ ] База знаний доступна команде

### B. Google Sheets — CRM Sync

- [ ] Таблица **CRM Sync** создана
- [ ] Вкладки **`Sync`** и **`_Meta`** с правильными именами
- [ ] Service account добавлен в **Share** как Editor
- [ ] Ручной workflow run — **успешный** ✅
- [ ] На `Sync` есть заголовки и строки оплат
- [ ] `_Meta` показывает `lastSyncAtMsk`

### C. GitHub

- [ ] Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON`, `SHEETS_SPREADSHEET_ID`, `FIREBASE_PROJECT_ID`
- [ ] Workflow **Nightly CRM → Google Sheets** виден в Actions
- [ ] Один успешный manual run

### D. MM Dashboard

- [ ] Отдельная таблица создана
- [ ] `IMPORTRANGE` на листе `Data` — **Allow access** нажато
- [ ] KPI / Managers / Traffic формулы работают
- [ ] Время sync на `Info` совпадает с `_Meta`

### E. Google Cloud

- [ ] **Google Sheets API** — Enabled
- [ ] JSON-ключ сохранён в безопасном месте (не в GitHub коде)

### F. Команда знает

- [ ] Менеджеры: данные в CRM — **сразу**; Google Sheets — **утром после sync**
- [ ] Admin: как **Run workflow** вручную перед отчётом
- [ ] Admin: **Export Center** как запасной план
- [ ] Никто не переименовывает `Sync` / `_Meta`

### G. После первой ночи

- [ ] На следующее утро: `_Meta` обновился автоматически (без manual run)
- [ ] MM Dashboard показывает актуальные данные

---

## Краткая шпаргалка (распечатать)

```
CRM Sync ID:     _________________________________
MM Dashboard ID: _________________________________
Firebase Project: ________________________________
Service email:   _________________________________

GitHub Secrets (Settings → Actions):
  GOOGLE_SERVICE_ACCOUNT_JSON  ✅
  SHEETS_SPREADSHEET_ID        ✅
  FIREBASE_PROJECT_ID          ✅

Ручной sync: GitHub → Actions → Nightly CRM → Google Sheets → Run workflow

Проверка: CRM Sync → _Meta → lastSyncAtMsk

SOS: Management → Export Center → Excel
```

---

## Нужна помощь

1. Скриншот **GitHub Actions** log (последние 30 строк)
2. Скриншот **`_Meta`** вкладки
3. Что именно не совпадает (CRM vs Sheet vs MM)

---

*Документ соответствует workflow `.github/workflows/nightly-sheets-sync.yml` и скрипту `functions/scripts/nightlySheetsSync.js`.*
