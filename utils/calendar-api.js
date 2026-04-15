import { getAuthToken, removeCachedToken } from './auth.js';

const API_BASE = 'https://www.googleapis.com/calendar/v3';

function buildAuthRequiredError() {
  return new Error('Google 認証が必要です。保存時にログインを許可してください。');
}

async function resolveToken(interactiveOnAuthError) {
  try {
    return await getAuthToken(false);
  } catch {
    if (!interactiveOnAuthError) {
      throw buildAuthRequiredError();
    }
    return getAuthToken(true);
  }
}

async function apiRequest(url, options = {}, interactiveOnAuthError = false) {
  let token = await resolveToken(interactiveOnAuthError);

  let response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    await removeCachedToken(token);
    token = await resolveToken(interactiveOnAuthError);
    response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  return response.json();
}

async function getCalendarList() {
  const data = await apiRequest(`${API_BASE}/users/me/calendarList`, {}, false);
  return data.items.filter(cal => cal.accessRole === 'owner' || cal.accessRole === 'writer');
}

async function createEvent(calendarId, event, interactiveOnAuthError = true) {
  return apiRequest(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event)
  }, interactiveOnAuthError);
}

export { getCalendarList, createEvent };
