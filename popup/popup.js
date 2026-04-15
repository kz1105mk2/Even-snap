import { parseDateTimeFromText, formatDateTimeLocal, formatDateOnly } from '../utils/date-parser.js';
import { getCalendarList, createEvent } from '../utils/calendar-api.js';

const $ = (sel) => document.querySelector(sel);

/** ウィンドウ高さをドキュメント内容にぴったり合わせる（scrollHeight はビューポートより大きいと余白を誤認するため .container で計測） */
function fitWindowToContent() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const container = document.querySelector('.container');
      if (!container) return;
      const padY =
        parseFloat(getComputedStyle(document.body).paddingTop) +
        parseFloat(getComputedStyle(document.body).paddingBottom);
      const contentH = container.offsetHeight + padY;
      const frame = window.outerHeight - window.innerHeight;
      chrome.windows.getCurrent((win) => {
        if (chrome.runtime.lastError || win?.id == null) return;
        chrome.windows.update(win.id, { height: Math.ceil(contentH + frame) });
      });
    });
  });
}

const params = new URLSearchParams(window.location.search);
const selectedText = params.get('text') || '';
const pageUrl = params.get('url') || '';

async function init() {
  showForm();
}

async function showForm() {
  $('#auth-message').style.display = 'none';
  $('#event-form').style.display = 'flex';

  const { startDate, endDate } = parseDateTimeFromText(selectedText);

  if (startDate) {
    $('#start').value = formatDateTimeLocal(startDate);
  }
  if (endDate) {
    $('#end').value = formatDateTimeLocal(endDate);
  } else if (startDate) {
    const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
    $('#end').value = formatDateTimeLocal(defaultEnd);
  }

  if (pageUrl) {
    $('#description').value = pageUrl;
  }

  await loadDefaults();
  await loadCalendars();

  $('#all-day').addEventListener('change', toggleAllDay);
  $('#start').addEventListener('change', onStartChange);
  $('#event-form').addEventListener('submit', handleSubmit);
  $('#cancel-btn').addEventListener('click', () => window.close());

  fitWindowToContent();
}

async function loadDefaults() {
  try {
    const settings = await chrome.storage.local.get([
      'defaultCalendar', 'defaultReminder', 'defaultDuration',
      'defaultStatus', 'defaultVisibility'
    ]);

    if (settings.defaultReminder) {
      $('#reminder').value = settings.defaultReminder;
    }
    if (settings.defaultStatus) {
      $('#status').value = settings.defaultStatus;
    }
    if (settings.defaultVisibility) {
      $('#visibility').value = settings.defaultVisibility;
    }

    if (settings.defaultDuration && !$('#end').value && $('#start').value) {
      const start = new Date($('#start').value);
      const duration = parseInt(settings.defaultDuration) * 60 * 1000;
      const end = new Date(start.getTime() + duration);
      $('#end').value = formatDateTimeLocal(end);
    }
  } catch {
    // use defaults
  }
}

async function loadCalendars() {
  try {
    const calendars = await getCalendarList();
    const select = $('#calendar');
    select.innerHTML = '';

    const settings = await chrome.storage.local.get(['defaultCalendar']);

    calendars.forEach(cal => {
      const option = document.createElement('option');
      option.value = cal.id;
      option.textContent = cal.summary;
      if (settings.defaultCalendar === cal.id || cal.primary) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    if (settings.defaultCalendar) {
      select.value = settings.defaultCalendar;
    }
  } catch {
    // keep default option
  }
}

function toggleAllDay() {
  const isAllDay = $('#all-day').checked;
  if (isAllDay) {
    const startVal = $('#start').value;
    const endVal = $('#end').value;

    if (startVal) {
      const startDate = new Date(startVal);
      $('#start').type = 'date';
      $('#start').value = formatDateOnly(startDate);
    } else {
      $('#start').type = 'date';
    }
    if (endVal) {
      const endDate = new Date(endVal);
      $('#end').type = 'date';
      $('#end').value = formatDateOnly(endDate);
    } else {
      $('#end').type = 'date';
    }
  } else {
    const startVal = $('#start').value;
    const endVal = $('#end').value;

    $('#start').type = 'datetime-local';
    $('#end').type = 'datetime-local';

    if (startVal) {
      $('#start').value = startVal + 'T09:00';
    }
    if (endVal) {
      $('#end').value = endVal + 'T10:00';
    }
  }
}

function onStartChange() {
  const startVal = $('#start').value;
  const endVal = $('#end').value;

  if (startVal && !endVal) {
    if ($('#all-day').checked) {
      $('#end').value = startVal;
    } else {
      const start = new Date(startVal);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      $('#end').value = formatDateTimeLocal(end);
    }
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const saveBtn = $('#save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  hideError();

  try {
    const isAllDay = $('#all-day').checked;
    const calendarId = $('#calendar').value || 'primary';

    const event = {
      summary: $('#title').value || '(タイトルなし)',
      location: $('#location').value || undefined,
      description: $('#description').value || undefined,
      transparency: $('#status').value,
      visibility: $('#visibility').value === 'default' ? undefined : $('#visibility').value
    };

    if (isAllDay) {
      const startVal = $('#start').value;
      const endVal = $('#end').value;

      event.start = { date: startVal || new Date().toISOString().split('T')[0] };

      if (endVal) {
        const endDate = new Date(endVal);
        endDate.setDate(endDate.getDate() + 1);
        event.end = { date: formatDateOnly(endDate) };
      } else {
        const startDate = new Date(event.start.date);
        startDate.setDate(startDate.getDate() + 1);
        event.end = { date: formatDateOnly(startDate) };
      }
    } else {
      const startVal = $('#start').value;
      const endVal = $('#end').value;

      const startDate = startVal ? new Date(startVal) : new Date();
      const endDate = endVal ? new Date(endVal) : new Date(startDate.getTime() + 60 * 60 * 1000);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      event.start = { dateTime: startDate.toISOString(), timeZone };
      event.end = { dateTime: endDate.toISOString(), timeZone };
    }

    const reminderVal = $('#reminder').value;
    if (reminderVal !== 'default') {
      if (reminderVal === '0') {
        event.reminders = { useDefault: false, overrides: [] };
      } else {
        event.reminders = {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: parseInt(reminderVal) }]
        };
      }
    }

    await createEvent(calendarId, event);
    window.close();
  } catch (err) {
    showError(err.message || 'カレンダーへの登録に失敗しました');
    saveBtn.disabled = false;
    saveBtn.textContent = '保存';
  }
}

function showError(msg) {
  const el = $('#error-message');
  el.textContent = msg;
  el.style.display = 'block';
  fitWindowToContent();
}

function hideError() {
  $('#error-message').style.display = 'none';
  fitWindowToContent();
}

init();
