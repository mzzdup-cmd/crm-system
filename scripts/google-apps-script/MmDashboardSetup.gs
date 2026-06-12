/**
 * MM Dashboard — автоматическая установка (Google Apps Script)
 *
 * Как использовать:
 * 1. Откройте таблицу MM Dashboard (где уже есть лист Data с IMPORTRANGE)
 * 2. Extensions → Apps Script
 * 3. Вставьте весь этот файл (удалите код по умолчанию)
 * 4. В CONFIG ниже укажите CRM_SYNC_ID (или оставьте пустым — возьмёт из Data!A1)
 * 5. Выберите функцию setupMmDashboard → Run → Разрешить доступ
 * 6. Если IMPORTRANGE просит «Разрешить доступ» — нажмите в ячейке Data!A1
 *
 * Безопасно для CRM Sync: скрипт работает ТОЛЬКО в MM Dashboard.
 * Лист Data!A:Q не перезаписывается, если IMPORTRANGE уже настроен.
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────

var CONFIG = {
  /** ID таблицы CRM Sync. Пусто = авто из формулы Data!A1 */
  CRM_SYNC_ID: '',

  /** Строки менеджеров в Config / _Calc */
  MANAGER_FIRST_ROW: 2,
  MANAGER_LAST_ROW: 10,

  /** Строки данных на Dashboard */
  DASH_FIRST_ROW: 4,
  DASH_LAST_ROW: 12,
  DASH_TOTAL_ROW: 13,
};

var MANAGERS = [
  ['Денис М', 'Денис Мануйлов', 'denis_manuilov'],
  ['Руслан Р', 'Руслан Романюк', 'ruslan_romanyuk'],
  ['Александр С', 'Александр Симанов', 'alexander_simanov'],
  ['Сергей Г', 'Сергей Гребенщиков', 'sergey_grebenshchikov'],
  ['Андрей В', 'Андрей Волков', 'andrey_volkov'],
  ['Полина Пенькова', 'Полина Пенькова', 'polina_penkova'],
  ['Катя Б', 'Катя Бакаева', 'katya_bakaeva'],
  ['Полина Пламадяла', 'Полина Пламадяла', 'polina_plamadya'],
  ['Виолетта П', 'Виолетта Петрова', 'violeta_petrova'],
];

var SHEET_NAMES = {
  DASHBOARD: 'Dashboard',
  OVERDUE: 'Overdue',
  LEADERBOARD: 'Leaderboard',
  CALC: '_Calc',
  CONFIG: 'Config',
  LEADS: 'Leads',
  DATA: 'Data',
  SCHEDULE: 'Schedule',
  INFO: 'Info',
};

// ─── ENTRY POINT ──────────────────────────────────────────────────────────

function setupMmDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = buildFormulaLocale(ss);
  var crmId = CONFIG.CRM_SYNC_ID || detectCrmSyncId_(ss);

  if (!crmId) {
    SpreadsheetApp.getUi().alert(
      'Не найден CRM Sync ID.\n\n' +
        'Укажите CONFIG.CRM_SYNC_ID в скрипте\n' +
        'или настройте Data!A1:\n' +
        '=IMPORTRANGE("ID"; "Sync!A:Q")'
    );
    return;
  }

  var preservedImport = readDataImportFormula_(ss);
  var sheets = ensureSheets_(ss);
  setupConfig_(sheets.config, fb);
  setupData_(sheets.data, crmId, fb, preservedImport);
  setupSchedule_(sheets.schedule, crmId, fb);
  setupLeads_(sheets.leads, fb);
  setupCalc_(sheets.calc, fb);
  setupDashboard_(sheets.dashboard, sheets.calc, fb);
  setupOverdue_(sheets.overdue, fb);
  setupLeaderboard_(sheets.leaderboard, fb);
  setupInfo_(sheets.info, crmId, fb);
  reorderSheets_(ss);
  hideTechnicalSheets_(ss);

  SpreadsheetApp.getUi().alert(
    'MM Dashboard создана.\n\n' +
      '1. Откройте Data и Schedule → разрешите IMPORTRANGE (если #REF!)\n' +
      '2. Заполните планы на Config (кол. I) и лиды на Leads (кол. B)\n' +
      '3. Overdue: красный = выходной, белый = доля трафика\n' +
      '4. После nightly sync нажмите F5'
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MM Dashboard')
    .addItem('Создать / обновить MM', 'setupMmDashboard')
    .addItem('Обновить только Overdue', 'refreshOverdueOnly')
    .addItem('Починить Data + KPI', 'refreshDataAndCalc')
    .addToUi();
}

/** Обновить helper-колонки Data и пересчёт _Calc (без полной пересборки) */
function refreshDataAndCalc() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = buildFormulaLocale(ss);
  var data = ss.getSheetByName(SHEET_NAMES.DATA);
  var calc = ss.getSheetByName(SHEET_NAMES.CALC);
  if (!data || !calc) {
    setupMmDashboard();
    return;
  }
  setupConfigAliases_(ss.getSheetByName(SHEET_NAMES.CONFIG));
  setupDataHelpers_(data, fb);
  setupCalc_(calc, fb);
  SpreadsheetApp.getUi().alert(
    'Data и _Calc обновлены.\nПроверьте Dashboard — строка «Катя Б» и колонка «Новые».'
  );
}

/** Быстрое обновление листа Overdue без полной пересборки */
function refreshOverdueOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fb = buildFormulaLocale(ss);
  var crmId = CONFIG.CRM_SYNC_ID || detectCrmSyncId_(ss);
  if (!crmId) {
    SpreadsheetApp.getUi().alert('Не найден CRM Sync ID');
    return;
  }
  var sh = ss.getSheetByName(SHEET_NAMES.OVERDUE);
  if (!sh) {
    setupMmDashboard();
    return;
  }
  var schedule = ss.getSheetByName(SHEET_NAMES.SCHEDULE);
  if (!schedule) {
    schedule = ss.insertSheet(SHEET_NAMES.SCHEDULE);
  }
  setupSchedule_(schedule, crmId, fb);
  sh.clear();
  sh.clearConditionalFormatRules();
  sh.getCharts().forEach(function (c) {
    sh.removeChart(c);
  });
  setupOverdue_(sh, fb);
  schedule.hideSheet();
  SpreadsheetApp.getUi().alert('Overdue обновлён. Разрешите IMPORTRANGE на Schedule при необходимости.');
}

// ─── LOCALE / FORMULA HELPERS ─────────────────────────────────────────────

function buildFormulaLocale(ss) {
  var locale = ss.getSpreadsheetLocale() || 'ru_RU';
  var isRu = locale.indexOf('ru') === 0;
  return {
    isRu: isRu,
    sep: isRu ? ';' : ',',
    arrSep: isRu ? '\\' : ',',
    dec: isRu ? ',' : '.',
  };
}

function f_(fb, body) {
  return (
    '=' +
    body
      .replace(/\{SEP\}/g, fb.sep)
      .replace(/\{ARR\}/g, fb.arrSep)
      .replace(/\{DEC\}/g, fb.dec)
  );
}

// ─── SHEET MANAGEMENT ───────────────────────────────────────────────────────

function ensureSheets_(ss) {
  var names = [
    SHEET_NAMES.DASHBOARD,
    SHEET_NAMES.OVERDUE,
    SHEET_NAMES.LEADERBOARD,
    SHEET_NAMES.CALC,
    SHEET_NAMES.CONFIG,
    SHEET_NAMES.LEADS,
    SHEET_NAMES.DATA,
    SHEET_NAMES.SCHEDULE,
    SHEET_NAMES.INFO,
  ];

  var out = {};
  names.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    } else {
      sh.clear();
      sh.getCharts().forEach(function (c) {
        sh.removeChart(c);
      });
      sh.clearConditionalFormatRules();
    }
    out[camelKey_(name)] = sh;
  });
  return out;
}

function camelKey_(name) {
  if (name === '_Calc') return 'calc';
  return name.charAt(0).toLowerCase() + name.slice(1).replace(/\s/g, '');
}

function reorderSheets_(ss) {
  var order = [
    SHEET_NAMES.DASHBOARD,
    SHEET_NAMES.OVERDUE,
    SHEET_NAMES.LEADERBOARD,
    SHEET_NAMES.CALC,
    SHEET_NAMES.CONFIG,
    SHEET_NAMES.LEADS,
    SHEET_NAMES.DATA,
    SHEET_NAMES.INFO,
  ];
  order.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (sh) {
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(i + 1);
    }
  });
}

function hideTechnicalSheets_(ss) {
  [
    SHEET_NAMES.DATA,
    SHEET_NAMES.CALC,
    SHEET_NAMES.CONFIG,
    SHEET_NAMES.LEADS,
    SHEET_NAMES.SCHEDULE,
  ].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh) sh.hideSheet();
  });
}

function detectCrmSyncId_(ss) {
  var formula = readDataImportFormula_(ss);
  if (!formula) return '';
  var m = formula.match(/IMPORTRANGE\s*\(\s*"([^"]+)"/i);
  return m ? m[1] : '';
}

function readDataImportFormula_(ss) {
  var data = ss.getSheetByName(SHEET_NAMES.DATA);
  if (!data) return '';
  return data.getRange('A1').getFormula() || '';
}

// ─── CONFIG ─────────────────────────────────────────────────────────────────

function setupConfig_(sh, fb) {
  sh.getRange('A1:C1').setValues([['Короткое', 'Полное имя', 'ID']]);
  sh.getRange('D1').setValue('Константы');
  sh.getRange('H1:I1').setValues([['Менеджер', 'План_выручка']]);

  var rows = MANAGERS.map(function (m) {
    return [m[0], m[1], m[2]];
  });
  sh.getRange(2, 1, rows.length, 3).setValues(rows);

  sh.getRange('H2:H10').setFormulas(
    MANAGERS.map(function (_, i) {
      return ['=B' + (i + 2)];
    })
  );

  sh.getRange('I2:I10').setValues(
    MANAGERS.map(function () {
      return [600000];
    })
  );

  sh.getRange('E1').setFormula(f_(fb, 'TODAY()'));
  sh.getRange('E2').setFormula(f_(fb, 'DATE(YEAR(E1){SEP}MONTH(E1){SEP}1)'));
  sh.getRange('E3').setFormula(f_(fb, 'EOMONTH(E1{SEP}0)'));
  sh.getRange('E4').setFormula(f_(fb, 'DATE(YEAR(E1){SEP}MONTH(E1)-1{SEP}1)'));
  sh.getRange('E5').setFormula(f_(fb, 'EOMONTH(E4{SEP}0)'));

  sh.getRange('F1:F6').setValues([
    [50000],
    [0.05],
    [700000],
    [5000],
    [800000],
    [10000],
  ]);
  sh.getRange('D2:D7').setValues([
    ['Сегодня'],
    ['Начало месяца'],
    ['Конец месяца'],
    ['Начало прош. мес'],
    ['Конец прош. мес'],
    ['Salary config →'],
  ]);

  sh.setColumnWidths(1, 3, 140);
  sh.setColumnWidth(8, 180);
  sh.setColumnWidth(9, 120);

  setupConfigAliases_(sh);
}

function setupConfigAliases_(sh) {
  sh.getRange('K1:L1').setValues([['Алиас', 'Полное имя']]);
  var aliases = [
    ['Катя', 'Катя Бакаева'],
    ['Катя Б', 'Катя Бакаева'],
    ['Денис М', 'Денис Мануйлов'],
    ['Руслан Р', 'Руслан Романюк'],
    ['Александр С', 'Александр Симанов'],
    ['Сергей Г', 'Сергей Гребенщиков'],
    ['Андрей В', 'Андрей Волков'],
    ['Виолетта П', 'Виолетта Петрова'],
  ];
  sh.getRange(2, 11, aliases.length, 2).setValues(aliases);
}

// ─── DATA (helper columns R:W only; A:Q = IMPORTRANGE) ───────────────────

function setupData_(sh, crmId, fb, preservedImport) {
  var importFormula = preservedImport;
  if (!importFormula || importFormula.indexOf('IMPORTRANGE') === -1) {
    importFormula = f_(fb, 'IMPORTRANGE("' + crmId + '"{SEP}"Sync!A:Q")');
  }
  sh.getRange('A1').setFormula(importFormula);
  setupDataHelpers_(sh, fb);
}

function setupDataHelpers_(sh, fb) {
  sh.getRange('R1:X1').setValues([
    [
      'Месяц_ключ',
      'Текущий_месяц',
      'Вчера',
      'Сегодня',
      'Категория',
      'Подтип',
      'Менеджер_norm',
    ],
  ]);

  var dateExpr =
    'IF(ISNUMBER(A2:A){SEP}INT(A2:A){SEP}INT(DATEVALUE(A2:A)))';

  sh.getRange('R2').setFormula(
    f_(
      fb,
      'ARRAYFORMULA(IF(A2:A=""{SEP}""{SEP}TEXT(' +
        dateExpr +
        '{SEP}"YYYY-MM")))'
    )
  );
  sh.getRange('S2').setFormula(
    f_(
      fb,
      'ARRAYFORMULA(IF(A2:A=""{SEP}""{SEP}R2:R=TEXT(TODAY(){SEP}"YYYY-MM")))'
    )
  );
  sh.getRange('T2').setFormula(
    f_(fb, 'ARRAYFORMULA(IF(A2:A=""{SEP}""{SEP}' + dateExpr + '=TODAY()-1))')
  );
  sh.getRange('U2').setFormula(
    f_(fb, 'ARRAYFORMULA(IF(A2:A=""{SEP}""{SEP}' + dateExpr + '=TODAY()))')
  );
  sh.getRange('V2').setFormula(
    f_(
      fb,
      'ARRAYFORMULA(IF(B2:B=""{SEP}""{SEP}IFS(' +
        'TRIM(B2:B)="Возврат"{SEP}"return"{SEP}' +
        'LEFT(TRIM(B2:B){SEP}5)="Отказ"{SEP}"refusal"{SEP}' +
        'TRIM(B2:B)="Апсэйл"{SEP}"upsell"{SEP}' +
        'TRIM(B2:B)="Апсейл"{SEP}"upsell"{SEP}' +
        'LEFT(TRIM(B2:B){SEP}7)="Доплата"{SEP}"topup"{SEP}' +
        'TRIM(B2:B)="Новая"{SEP}"new"{SEP}' +
        'TRIM(B2:B)="ББ"{SEP}"new"{SEP}' +
        'TRIM(B2:B)="Рассылка"{SEP}"new"{SEP}' +
        'TRUE{SEP}"other")))'
    )
  );
  sh.getRange('W2').setFormula(
    f_(
      fb,
      'ARRAYFORMULA(IF(B2:B=""{SEP}""{SEP}IFS(' +
        'B2:B="ББ"{SEP}"bb"{SEP}' +
        'B2:B="Рассылка"{SEP}"mailing"{SEP}' +
        'B2:B="Новая"{SEP}"new"{SEP}' +
        'TRUE{SEP}"")))'
    )
  );
  sh.getRange('X2').setFormula(
    f_(fb, 'ARRAYFORMULA(IF(Q2:Q=""{SEP}""{SEP}TRIM(Q2:Q)))')
  );
}

// ─── SCHEDULE (график + traffic из CRM Sync) ────────────────────────────────

function setupSchedule_(sh, crmId, fb) {
  sh.getRange('A1').setFormula(
    f_(
      fb,
      'IFERROR(IMPORTRANGE("' +
        crmId +
        '"{SEP}"Schedule!A:E"){SEP}"Нет листа Schedule в CRM Sync — появится после nightly sync")'
    )
  );
  sh.getRange('A2').setValue(
    'Создайте вкладку Schedule в CRM Sync или дождитесь nightly sync'
  );
}

// ─── LEADS ──────────────────────────────────────────────────────────────────

function setupLeads_(sh, fb) {
  sh.getRange('A1:C1').setValues([
    ['Менеджер', 'Лиды_месяц', 'Лиды_сегодня'],
  ]);
  sh.getRange('A2:A10').setFormulas(
    MANAGERS.map(function (_, i) {
      return ['=Config!B' + (i + 2)];
    })
  );
  sh.getRange('B2:C10').setValues(
    MANAGERS.map(function () {
      return [0, 0];
    })
  );
  sh.getRange('A11').setValue('Итого');
  sh.getRange('B11').setFormula(f_(fb, 'SUM(B2:B10)'));
}

// ─── _CALC ──────────────────────────────────────────────────────────────────

function setupCalc_(sh, fb) {
  var headers = [
    'Менеджер_полное',
    'Менеджер',
    'Лиды',
    'Сделки_вчера',
    'Сделки_сегодня',
    'База',
    'VIP',
    'Новые',
    'ББ',
    'Проба',
    'Скидка',
    'Рассылка',
    'Апсейл',
    'Всего_сделок',
    'CV1',
    'Ср_чек_сумма',
    'Ср_чек_бюджет',
    'Выручка_вчера',
    'Выручка_сегодня',
    'Выручка_новые',
    'Выручка_доплаты',
    'Выручка_месяц',
    'Выручка_прош_мес',
    'План_%',
    'Вознаграждение',
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  sh.getRange('A2').setFormula(f_(fb, 'ARRAYFORMULA(Config!B2:B10)'));
  sh.getRange('B2').setFormula(f_(fb, 'ARRAYFORMULA(Config!A2:A10)'));

  var first = CONFIG.MANAGER_FIRST_ROW;
  var last = CONFIG.MANAGER_LAST_ROW;
  var total = last + 1;

  for (var r = first; r <= last; r++) {
    var mgr = '$A' + r;
    sh.getRange(r, 3).setFormula(
      f_(fb, 'IFERROR(VLOOKUP(' + mgr + '{SEP}Leads!A:B{SEP}2{SEP}FALSE){SEP}0)')
    );
    sh.getRange(r, 4).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$T:$T{SEP}TRUE{SEP}Data!$B:$B{SEP}"<>")'
      )
    );
    sh.getRange(r, 5).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$U:$U{SEP}TRUE{SEP}Data!$B:$B{SEP}"<>")'
      )
    );
    sh.getRange(r, 6).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$O:$O{SEP}"Базовый")'
      )
    );
    sh.getRange(r, 7).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$O:$O{SEP}"VIP")'
      )
    );
    sh.getRange(r, 8).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$W:$W{SEP}"new")'
      )
    );
    sh.getRange(r, 9).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$W:$W{SEP}"bb")'
      )
    );
    sh.getRange(r, 10).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$W:$W{SEP}"trial")'
      )
    );
    sh.getRange(r, 11).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$W:$W{SEP}"discount")'
      )
    );
    sh.getRange(r, 12).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$W:$W{SEP}"mailing")'
      )
    );
    sh.getRange(r, 13).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$V:$V{SEP}"upsell")'
      )
    );
    sh.getRange(r, 14).setFormula(
      f_(
        fb,
        'COUNTIFS(Data!$X:$X' +
          '{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$B:$B{SEP}"<>"{SEP}Data!$V:$V{SEP}"<>return")'
      )
    );
    sh.getRange(r, 15).setFormula(f_(fb, 'IF(C' + r + '=0{SEP}""{SEP}N' + r + '/C' + r + ')'));
    sh.getRange(r, 16).setFormula(
      f_(
        fb,
        'IF(N' +
          r +
          '=0{SEP}""{SEP}ROUND(SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE)/N' +
          r +
          '{SEP}0))'
      )
    );
    sh.getRange(r, 17).setFormula(
      f_(
        fb,
        'IFERROR(ROUND(SUMIFS(Data!$F:$F{SEP}Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$F:$F{SEP}">0")/COUNTIFS(Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$F:$F{SEP}">0"){SEP}0){SEP}"")'
      )
    );
    sh.getRange(r, 18).setFormula(
      f_(fb, 'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' + mgr + '{SEP}Data!$T:$T{SEP}TRUE)')
    );
    sh.getRange(r, 19).setFormula(
      f_(fb, 'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' + mgr + '{SEP}Data!$U:$U{SEP}TRUE)')
    );
    sh.getRange(r, 20).setFormula(
      f_(
        fb,
        'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$V:$V{SEP}"new")'
      )
    );
    sh.getRange(r, 21).setFormula(
      f_(
        fb,
        'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$V:$V{SEP}"topup")'
      )
    );
    sh.getRange(r, 22).setFormula(
      f_(fb, 'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' + mgr + '{SEP}Data!$S:$S{SEP}TRUE)')
    );
    sh.getRange(r, 23).setFormula(
      f_(
        fb,
        'SUMIFS(Data!$E:$E{SEP}Data!$X:$X{SEP}' +
          mgr +
          '{SEP}Data!$A:$A{SEP}">="&Config!$E$4{SEP}Data!$A:$A{SEP}"<="&Config!$E$5)'
      )
    );
    sh.getRange(r, 24).setFormula(
      f_(fb, 'IFERROR(V' + r + '/VLOOKUP(' + mgr + '{SEP}Config!H:I{SEP}2{SEP}FALSE){SEP}0)')
    );
    sh.getRange(r, 25).setFormula(
      f_(
        fb,
        'LET(rev{SEP}V' +
          r +
          '{SEP}base{SEP}Config!$F$1{SEP}pct{SEP}ROUND(rev*Config!$F$2{SEP}0){SEP}bonus{SEP}IF(rev>=Config!$F$5{SEP}Config!$F$6{SEP}IF(rev>=Config!$F$3{SEP}Config!$F$4{SEP}0)){SEP}base+pct+bonus)'
      )
    );
  }

  sh.getRange(total, 2).setValue('Итого');
  for (var c = 3; c <= 14; c++) {
    sh.getRange(total, c).setFormula(
      f_(fb, 'SUM(' + columnLetter_(c) + first + ':' + columnLetter_(c) + last + ')')
    );
  }
  sh.getRange(total, 15).setFormula(f_(fb, 'IF(C' + total + '=0{SEP}""{SEP}N' + total + '/C' + total + ')'));
  sh.getRange(total, 16).setFormula(
    f_(fb, 'IF(N' + total + '=0{SEP}""{SEP}ROUND(V' + total + '/N' + total + '{SEP}0))')
  );
  sh.getRange(total, 17).setFormula(
    f_(
      fb,
      'IF(N' +
        total +
        '=0{SEP}""{SEP}IFERROR(ROUND(SUMIFS(Data!$F:$F{SEP}Data!$S:$S{SEP}TRUE{SEP}Data!$F:$F{SEP}">0")/COUNTIFS(Data!$S:$S{SEP}TRUE{SEP}Data!$F:$F{SEP}">0"){SEP}0){SEP}"")'
    )
  );
  for (var c2 = 18; c2 <= 23; c2++) {
    sh.getRange(total, c2).setFormula(
      f_(fb, 'SUM(' + columnLetter_(c2) + first + ':' + columnLetter_(c2) + last + ')')
    );
  }
  sh.getRange(total, 24).setFormula(
    f_(fb, 'IFERROR(V' + total + '/SUM(Config!$I$2:$I$10){SEP}0)')
  );
  sh.getRange(total, 25).setFormula(
    f_(fb, 'SUM(' + columnLetter_(25) + first + ':' + columnLetter_(25) + last + ')')
  );

  sh.getRange('AA1').setValue('Traffic (месяц)');
  sh.getRange('AA2').setFormula(
    f_(
      fb,
      'QUERY(Data!A:X{SEP}' +
        '"SELECT J, COUNT(A), SUM(E) WHERE S = TRUE AND J IS NOT NULL AND J <> \'\' GROUP BY J ORDER BY SUM(E) DESC LABEL J \'Traffic\', COUNT(A) \'Сделки\', SUM(E) \'Выручка\'"{SEP}0)'
    )
  );
}

function columnLetter_(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

function setupDashboard_(sh, calcSh, fb) {
  var r0 = CONFIG.DASH_FIRST_ROW;
  var r1 = CONFIG.DASH_LAST_ROW;
  var rt = CONFIG.DASH_TOTAL_ROW;

  sh.getRange('C1:AJ1').merge().setValue('MM Dashboard');
  sh.getRange('C1')
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  mergeHeader_(sh, 'D2:D3', 'Лиды', '#f4cccc');
  mergeHeader_(sh, 'F2:U2', 'Сделки с трафика', '#d9ead3');
  mergeHeader_(sh, 'V2:W2', 'Средний чек', '#d9d2e9');
  mergeHeader_(sh, 'X2:AA2', 'Ещё сделки', '#d9ead3');
  mergeHeader_(sh, 'AC2:AC3', 'Все\nМесяц', '#93c47d');
  mergeHeader_(sh, 'AE2:AJ2', 'Выручка', '#cfe2f3');

  var h3 = {
    B3: 'Менеджер',
    D3: 'Лиды',
    F3: 'Вчера',
    G3: 'Сегодня',
    H3: 'База',
    I3: 'VIP',
    J3: 'Новые',
    K3: '%',
    L3: 'ББ',
    M3: '%',
    N3: 'Проба',
    O3: '%',
    P3: 'Скидка',
    Q3: '%',
    T3: 'Всего',
    U3: 'CV1',
    V3: 'по сумме',
    W3: 'по бюджету',
    X3: 'Рассылка',
    Y3: '%',
    Z3: 'Апсейл',
    AA3: '%',
    AC3: 'Всего',
    AE3: 'Вчера',
    AF3: 'Сегодня',
    AG3: 'Новые',
    AH3: 'Доплаты',
    AI3: 'Всего',
    AJ3: 'Прошлый мес',
  };
  Object.keys(h3).forEach(function (addr) {
    sh.getRange(addr).setValue(h3[addr]).setFontWeight('bold');
  });
  sh.getRange('U3').setBackground('#fce5cd');

  var calcMap = {
    B: 'B',
    D: 'C',
    F: 'D',
    G: 'E',
    H: 'F',
    I: 'G',
    J: 'H',
    L: 'I',
    N: 'J',
    P: 'K',
    T: 'N',
    U: 'O',
    V: 'P',
    W: 'Q',
    X: 'L',
    Z: 'M',
    AC: 'N',
    AE: 'R',
    AF: 'S',
    AG: 'T',
    AH: 'U',
    AI: 'V',
    AJ: 'W',
  };

  for (var dr = r0; dr <= r1; dr++) {
    var cr = dr - 2;
    Object.keys(calcMap).forEach(function (col) {
      sh.getRange(col + dr).setFormula("='_Calc'!" + calcMap[col] + cr);
    });
    sh.getRange('K' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}J' + dr + '/$T' + dr + ')'));
    sh.getRange('M' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}L' + dr + '/$T' + dr + ')'));
    sh.getRange('O' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}N' + dr + '/$T' + dr + ')'));
    sh.getRange('Q' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}P' + dr + '/$T' + dr + ')'));
    sh.getRange('Y' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}X' + dr + '/$T' + dr + ')'));
    sh.getRange('AA' + dr).setFormula(f_(fb, 'IF($T' + dr + '=0{SEP}""{SEP}Z' + dr + '/$T' + dr + ')'));
  }

  sh.getRange('B' + rt).setValue('Итого').setFontWeight('bold');
  var totalCalcRow = CONFIG.MANAGER_LAST_ROW + 1;
  ['D', 'F', 'G', 'H', 'I', 'J', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Z', 'AC', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ'].forEach(
    function (col) {
      var calcCol = calcMap[col] || null;
      if (calcCol) {
        sh.getRange(col + rt).setFormula("='_Calc'!" + calcCol + totalCalcRow);
      }
    }
  );

  sh.getRange('B' + rt + ':AJ' + rt)
    .setBackground('#38761d')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  sh.getRange('D3').setBackground('#f4cccc');
  sh.getRange('F2:U2').setBackground('#d9ead3');
  sh.getRange('V2:W2').setBackground('#d9d2e9');
  sh.getRange('X2:AA2').setBackground('#d9ead3');
  sh.getRange('AC2:AC3').setBackground('#93c47d');
  sh.getRange('AE2:AJ2').setBackground('#cfe2f3');

  sh.setColumnWidth(1, 20);
  sh.setColumnWidth(2, 120);
  sh.setColumnWidths(3, 34, 72);

  var moneyCols = ['D', 'V', 'W', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ'];
  moneyCols.forEach(function (col) {
    sh.getRange(col + r0 + ':' + col + rt).setNumberFormat('# ##0');
  });
  ['K', 'M', 'O', 'Q', 'U', 'Y', 'AA'].forEach(function (col) {
    sh.getRange(col + r0 + ':' + col + rt).setNumberFormat('0%');
  });

  sh.setFrozenRows(3);
  try {
    sh.setFrozenColumns(2);
  } catch (e) {
    // Если Google Sheets не даёт закрепить столбцы из‑за merge — только строки
  }

  createRewardsChart_(sh, fb);
}

function mergeHeader_(sh, range, text, color) {
  sh.getRange(range).merge();
  sh.getRange(range.split(':')[0]).setValue(text);
  sh.getRange(range).setBackground(color).setFontWeight('bold').setHorizontalAlignment('center');
}

function createRewardsChart_(sh, fb) {
  var r0 = CONFIG.DASH_FIRST_ROW;
  var r1 = CONFIG.DASH_LAST_ROW;
  var chartCol = 37;

  for (var dr = r0; dr <= r1; dr++) {
    sh.getRange(dr, chartCol).setFormula('=B' + dr);
    sh.getRange(dr, chartCol + 1).setFormula("='_Calc'!Y" + (dr - 2));
  }
  sh.hideColumns(chartCol, 2);

  var chart = sh
    .newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sh.getRange(r0, chartCol, r1 - r0 + 1, 1))
    .addRange(sh.getRange(r0, chartCol + 1, r1 - r0 + 1, 1))
    .setPosition(CONFIG.DASH_TOTAL_ROW + 2, 1, 0, 0)
    .setOption('title', 'Вознаграждения')
    .setOption('legend', { position: 'none' })
    .setOption('chartArea', { backgroundColor: '#e2f0d9' })
    .setOption('vAxis', { format: '# ##0' })
    .setNumHeaders(0)
    .build();

  sh.insertChart(chart);
}

// ─── OVERDUE (график: выходной = красный 1%, работа = доля traffic) ────────

function setupOverdue_(sh, fb) {
  var maxDays = 31;
  var firstDayCol = 2;
  var lastDayCol = firstDayCol + maxDays - 1;
  var sep = fb.sep;

  sh.getRange('A1').setFormula(f_(fb, 'TEXT(Config!E1{SEP}"MMMM")'));

  // Служебная ячейка на этом листе (CF не может ссылаться на Config)
  sh.getRange('AG1').setFormula(
    f_(fb, 'DAY(EOMONTH(DATE(YEAR(Config!$E$1){SEP}MONTH(Config!$E$1){SEP}1)))')
  );
  sh.hideColumns(33, 1);

  for (var d = 1; d <= maxDays; d++) {
    sh.getRange(1, firstDayCol + d - 1).setValue(d);
  }

  for (var r = 2; r <= 10; r++) {
    sh.getRange('A' + r).setFormula('=Config!A' + r);

    for (var d = 1; d <= maxDays; d++) {
      var col = firstDayCol + d - 1;
      var formula =
        'IFERROR(IF(' +
        d +
        '>$AG$1' +
        sep +
        '""' +
        sep +
        'LET(dayDate' +
        sep +
        'DATE(YEAR(Config!$E$1)' +
        sep +
        'MONTH(Config!$E$1)' +
        sep +
        d +
        ')' +
        sep +
        'isOff' +
        sep +
        'COUNTIFS(Schedule!$A:$A' +
        sep +
        'dayDate' +
        sep +
        'Schedule!$C:$C' +
        sep +
        'Config!$B' +
        r +
        sep +
        'Schedule!$D:$D' +
        sep +
        'TRUE)' +
        sep +
        'IF(isOff>0' +
        sep +
        '"1%"' +
        sep +
        'IFERROR(TEXT(SUMIFS(Schedule!$E:$E' +
        sep +
        'Schedule!$A:$A' +
        sep +
        'dayDate' +
        sep +
        'Schedule!$C:$C' +
        sep +
        'Config!$B' +
        r +
        ')' +
        sep +
        '"0%")' +
        sep +
        '""))){SEP}"")';

      sh.getRange(r, col).setFormula('=' + formula);
    }
  }

  sh.getRange(1, 1, 1, lastDayCol).setBackground('#fce5cd').setFontWeight('bold');
  sh.getRange('A2:A10').setBackground('#fce5cd');
  sh.getRange('B2:AF10').setBackground('#ffffff').setHorizontalAlignment('center');

  var monthEndFormula = 'COLUMN(B$1)-1>$AG$1';

  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('1%')
      .setBackground('#f4cccc')
      .setFontColor('#990000')
      .setRanges([sh.getRange('B2:AF10')])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + monthEndFormula)
      .setBackground('#e0e0e0')
      .setRanges([sh.getRange('B1:AF1')])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + monthEndFormula)
      .setBackground('#e0e0e0')
      .setRanges([sh.getRange('B2:AF10')])
      .build(),
  ]);

  sh.setColumnWidth(1, 130);
  sh.setColumnWidths(firstDayCol, maxDays, 48);
  sh.setFrozenColumns(1);
  sh.setFrozenRows(1);
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────────

function setupLeaderboard_(sh, fb) {
  sh.getRange('A1').setValue('Leaderboard — выручка месяца').setFontWeight('bold');
  sh.getRange('A2').setFormula(
    f_(
      fb,
      'QUERY({_Calc!B2:B10{ARR}_Calc!V2:V10{ARR}_Calc!N2:N10{ARR}_Calc!Y2:Y10}{SEP}' +
        '"SELECT Col1, Col2, Col3, Col4 WHERE Col2 IS NOT NULL ORDER BY Col2 DESC ' +
        'LABEL Col1 \'Менеджер\', Col2 \'Выручка\', Col3 \'Сделки\', Col4 \'Вознаграждение\'"{SEP}0)'
    )
  );

  sh.setColumnWidths(1, 4, 140);
  sh.getRange('B2:B').setNumberFormat('# ##0');
  sh.getRange('D2:D').setNumberFormat('# ##0');
}

// ─── INFO ───────────────────────────────────────────────────────────────────

function setupInfo_(sh, crmId, fb) {
  sh.getRange('A1:B4').setValues([
    ['Последний sync (UTC)', ''],
    ['Последний sync (MSK)', ''],
    ['Строк в Data', ''],
    ['MM setup', Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd HH:mm')],
  ]);
  sh.getRange('B1').setFormula(
    f_(fb, 'IMPORTRANGE("' + crmId + '"{SEP}"_Meta!B2")')
  );
  sh.getRange('B2').setFormula(
    f_(fb, 'IMPORTRANGE("' + crmId + '"{SEP}"_Meta!C2")')
  );
  sh.getRange('B3').setFormula(f_(fb, 'COUNTA(Data!A:A)-1'));
  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 220);
}
