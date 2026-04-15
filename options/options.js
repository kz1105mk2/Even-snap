import { getAuthToken, logout } from '../utils/auth.js';
import { getCalendarList } from '../utils/calendar-api.js';

const $ = (sel) => document.querySelector(sel);

async function init() {
  fillOAuthDebugInfo();
  await checkAuth();
  await loadSettings();

  $('#login-btn').addEventListener('click', handleLogin);
  $('#logout-btn').addEventListener('click', handleLogout);
  $('#save-btn').addEventListener('click', saveSettings);
}

function fillOAuthDebugInfo() {
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest?.oauth2?.client_id || '(未設定)';
  const extensionId = chrome.runtime?.id || '(取得失敗)';
  const redirectUrl = chrome.identity?.getRedirectURL?.() || '(取得失敗)';

  $('#extension-id').textContent = extensionId;
  $('#redirect-url').textContent = redirectUrl;
  $('#manifest-client-id').textContent = clientId;
}

async function checkAuth() {
  try {
    const token = await getAuthToken(false);
    if (token) {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = await res.json();
      $('#account-info').textContent = `${user.email} でログイン中`;
      $('#logout-btn').style.display = 'inline-block';
      $('#login-btn').style.display = 'none';
      await loadCalendars();
    } else {
      showLoggedOut();
    }
  } catch {
    showLoggedOut();
  }
}

function showLoggedOut() {
  $('#account-info').textContent = 'ログインしていません';
  $('#login-btn').style.display = 'inline-block';
  $('#logout-btn').style.display = 'none';
}

async function handleLogin() {
  try {
    await getAuthToken(true);
    await checkAuth();
  } catch (e) {
    $('#account-info').textContent = e?.message || 'ログインに失敗しました';
  }
}

async function handleLogout() {
  await logout();
  showLoggedOut();
}

async function loadCalendars() {
  try {
    const calendars = await getCalendarList();
    const select = $('#default-calendar');
    select.innerHTML = '';

    calendars.forEach(cal => {
      const option = document.createElement('option');
      option.value = cal.id;
      option.textContent = cal.summary;
      if (cal.primary) option.selected = true;
      select.appendChild(option);
    });
  } catch {
    // keep default
  }
}

async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'defaultCalendar', 'defaultReminder', 'defaultDuration',
    'defaultStatus', 'defaultVisibility'
  ]);

  if (settings.defaultCalendar) $('#default-calendar').value = settings.defaultCalendar;
  if (settings.defaultReminder) $('#default-reminder').value = settings.defaultReminder;
  if (settings.defaultDuration) $('#default-duration').value = settings.defaultDuration;
  if (settings.defaultStatus) $('#default-status').value = settings.defaultStatus;
  if (settings.defaultVisibility) $('#default-visibility').value = settings.defaultVisibility;
}

async function saveSettings() {
  await chrome.storage.local.set({
    defaultCalendar: $('#default-calendar').value,
    defaultReminder: $('#default-reminder').value,
    defaultDuration: $('#default-duration').value,
    defaultStatus: $('#default-status').value,
    defaultVisibility: $('#default-visibility').value
  });

  const status = $('#save-status');
  status.textContent = '保存しました';
  setTimeout(() => { status.textContent = ''; }, 2000);
}

init();
