const JAPANESE_ERA_MAP = {
  '令和': 2018,
  '平成': 1988,
  '昭和': 1925
};

const MONTH_MAP = {
  'january': 1, 'jan': 1,
  'february': 2, 'feb': 2,
  'march': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'may': 5,
  'june': 6, 'jun': 6,
  'july': 7, 'jul': 7,
  'august': 8, 'aug': 8,
  'september': 9, 'sep': 9, 'sept': 9,
  'october': 10, 'oct': 10,
  'november': 11, 'nov': 11,
  'december': 12, 'dec': 12
};

function normalizeText(text) {
  return text
    .replace(/[\u2013\u2014\u2015\u301C\uFF5E]/g, '~')
    .replace(/\uff5e/g, '~')
    .replace(/\u3000/g, ' ')
    .replace(/[（\(]/g, '(')
    .replace(/[）\)]/g, ')')
    .replace(/～/g, '~')
    .replace(/〜/g, '~')
    .trim();
}

function parseJapaneseEra(text) {
  for (const [era, offset] of Object.entries(JAPANESE_ERA_MAP)) {
    const regex = new RegExp(`${era}(\\d{1,2})年`);
    const match = text.match(regex);
    if (match) {
      return offset + parseInt(match[1]);
    }
  }
  return null;
}

function parseTime(timeStr) {
  timeStr = timeStr.trim();

  const ampmMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1]);
    const min = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
    const period = ampmMatch[3].toLowerCase();
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return { hour, minute: min };
  }

  const jaTimeMatch = timeStr.match(/(\d{1,2})時(?:(\d{1,2})分)?/);
  if (jaTimeMatch) {
    return {
      hour: parseInt(jaTimeMatch[1]),
      minute: jaTimeMatch[2] ? parseInt(jaTimeMatch[2]) : 0
    };
  }

  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return { hour: parseInt(timeMatch[1]), minute: parseInt(timeMatch[2]) };
  }

  return null;
}

function extractDateComponents(text) {
  const normalized = normalizeText(text);
  let year = null, month = null, day = null;
  let startTime = null, endTime = null;

  year = parseJapaneseEra(normalized);

  if (!year) {
    const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
      year = parseInt(isoMatch[1]);
      month = parseInt(isoMatch[2]);
      day = parseInt(isoMatch[3]);
      if (isoMatch[4]) {
        startTime = { hour: parseInt(isoMatch[4]), minute: parseInt(isoMatch[5]) };
      }
    }
  }

  if (!month) {
    const jaDateMatch = normalized.match(/(\d{4})[年\/](\d{1,2})[月\/](\d{1,2})日?/);
    if (jaDateMatch) {
      year = parseInt(jaDateMatch[1]);
      month = parseInt(jaDateMatch[2]);
      day = parseInt(jaDateMatch[3]);
    }
  }

  if (!month) {
    const jaShortMatch = normalized.match(/(\d{1,2})月(\d{1,2})日/);
    if (jaShortMatch) {
      month = parseInt(jaShortMatch[1]);
      day = parseInt(jaShortMatch[2]);
    }
  }

  if (!month) {
    const enDatePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
    const enMatch = normalized.match(enDatePattern);
    if (enMatch) {
      const monthName = enMatch[1].toLowerCase();
      if (MONTH_MAP[monthName]) {
        month = MONTH_MAP[monthName];
        day = parseInt(enMatch[2]);
        if (enMatch[3]) year = parseInt(enMatch[3]);
      }
    }
  }

  if (!month) {
    const enDate2 = /(\d{1,2})\s+(\w+)\s+(\d{4})/i;
    const enMatch2 = normalized.match(enDate2);
    if (enMatch2) {
      const monthName = enMatch2[2].toLowerCase();
      if (MONTH_MAP[monthName]) {
        day = parseInt(enMatch2[1]);
        month = MONTH_MAP[monthName];
        year = parseInt(enMatch2[3]);
      }
    }
  }

  if (!month) {
    const slashDate = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (slashDate) {
      if (slashDate[3]) {
        month = parseInt(slashDate[1]);
        day = parseInt(slashDate[2]);
        year = parseInt(slashDate[3]);
      } else {
        month = parseInt(slashDate[1]);
        day = parseInt(slashDate[2]);
      }
    }
  }

  if (!year) {
    const now = new Date();
    year = now.getFullYear();
    if (month && month < now.getMonth() + 1) {
      year = now.getFullYear() + 1;
    }
  }

  const timeParts = normalized.split(/[-~to\u3000]|から|まで/i);
  if (timeParts.length >= 1) {
    startTime = startTime || parseTime(timeParts[0]);
  }

  if (!startTime) {
    for (const part of timeParts) {
      const t = parseTime(part);
      if (t) {
        if (!startTime) {
          startTime = t;
        } else if (!endTime) {
          endTime = t;
          break;
        }
      }
    }
  }

  if (!endTime && timeParts.length >= 2) {
    for (let i = 1; i < timeParts.length; i++) {
      const t = parseTime(timeParts[i]);
      if (t) {
        endTime = t;
        break;
      }
    }
  }

  return { year, month, day, startTime, endTime };
}

function parseDateTimeFromText(text) {
  if (!text || text.trim() === '') {
    return { startDate: null, endDate: null };
  }

  const { year, month, day, startTime, endTime } = extractDateComponents(text);

  if (!month || !day) {
    return { startDate: null, endDate: null };
  }

  let startDate = null;
  let endDate = null;

  if (startTime) {
    startDate = new Date(year, month - 1, day, startTime.hour, startTime.minute);
  } else {
    startDate = new Date(year, month - 1, day);
  }

  if (endTime) {
    endDate = new Date(year, month - 1, day, endTime.hour, endTime.minute);
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
  } else if (startTime) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  return { startDate, endDate };
}

function formatDateTimeLocal(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDateOnly(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export { parseDateTimeFromText, formatDateTimeLocal, formatDateOnly };
