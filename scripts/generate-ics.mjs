#!/usr/bin/env node
/**
 * generate-ics.mjs
 *
 * Reads events.json and emits one .ics file per calendar plus an "all.ics"
 * combined feed. Recurring events use RRULE so subscribed calendar apps
 * (Apple, Google, Outlook) handle expansion natively.
 *
 * Run locally:   node scripts/generate-ics.mjs
 * Runs in CI:    .github/workflows/ics.yml
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const events = JSON.parse(readFileSync(join(ROOT, 'events.json'), 'utf8'));

// ------------------------------------------------------------------
// ICS helpers
// ------------------------------------------------------------------
function pad(n) { return String(n).padStart(2, '0'); }
function escapeICS(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g,  '\\;')
    .replace(/,/g,  '\\,')
    .replace(/\r?\n/g, '\\n');
}
// Fold long lines per RFC 5545 (max 75 octets per line, continuation with CRLF + space)
function foldLine(line) {
  const out = [];
  let s = line;
  while (s.length > 73) {
    out.push(s.slice(0, 73));
    s = ' ' + s.slice(73);
  }
  out.push(s);
  return out.join('\r\n');
}

function dtDate(isoStr) {
  // YYYY-MM-DD -> YYYYMMDD
  return isoStr.replace(/-/g, '');
}
function dtLocal(isoDate, hhmm) {
  // floating local time -> YYYYMMDDTHHMMSS
  return dtDate(isoDate) + 'T' + hhmm.replace(':','') + '00';
}
function nowUTC() {
  const d = new Date();
  return d.getUTCFullYear() +
    pad(d.getUTCMonth()+1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z';
}
function addOneDay(isoDate) {
  const [y,m,d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate()+1);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`;
}

// ------------------------------------------------------------------
// VEVENT builder
// ------------------------------------------------------------------
function buildVEvent(ev) {
  const lines = ['BEGIN:VEVENT'];
  lines.push(`UID:${ev.id}@troop114crew22.github.io`);
  lines.push(`DTSTAMP:${nowUTC()}`);
  lines.push(`SUMMARY:${escapeICS(ev.title)}`);

  const isAllDay = !!ev.allDay || (!ev.startTime);
  if (isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtDate(ev.startDate)}`);
    // DTEND for all-day is exclusive — add 1 day
    const endIso = ev.endDate ? addOneDay(ev.endDate) : addOneDay(ev.startDate);
    lines.push(`DTEND;VALUE=DATE:${dtDate(endIso)}`);
  } else {
    lines.push(`DTSTART:${dtLocal(ev.startDate, ev.startTime)}`);
    lines.push(`DTEND:${dtLocal(ev.startDate, ev.endTime || ev.startTime)}`);
  }

  // Recurrence
  if (ev.recurrence) {
    const rr = buildRRule(ev);
    if (rr) lines.push(rr);
    if (ev.exceptDates && ev.exceptDates.length) {
      // EXDATE format must match DTSTART format
      if (isAllDay) {
        lines.push(`EXDATE;VALUE=DATE:${ev.exceptDates.map(dtDate).join(',')}`);
      } else {
        const formatted = ev.exceptDates.map(d => dtLocal(d, ev.startTime)).join(',');
        lines.push(`EXDATE:${formatted}`);
      }
    }
  }

  if (ev.location)    lines.push(`LOCATION:${escapeICS(ev.location)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
  if (ev.link)        lines.push(`URL:${ev.link}`);
  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

function buildRRule(ev) {
  const r = ev.recurrence;
  if (!r) return null;
  const until = ev.endDate
    ? `;UNTIL=${dtDate(ev.endDate)}T235959`
    : '';

  if (r.type === 'weekly') {
    return `RRULE:FREQ=WEEKLY;BYDAY=${r.weekday}${until}`;
  }
  if (r.type === 'nth-weekday-of-month') {
    const byday = r.weeks.map(w => `${w}${r.weekday}`).join(',');
    return `RRULE:FREQ=MONTHLY;BYDAY=${byday}${until}`;
  }
  return null;
}

// ------------------------------------------------------------------
// Calendar (.ics) builder
// ------------------------------------------------------------------
function buildCalendar(name, eventsList) {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Troop114 & Crew 22//Scout Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(name)}`,
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H'
  ];
  const body = eventsList.map(buildVEvent);
  return [...header, ...body, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

// ------------------------------------------------------------------
// Emit files
// ------------------------------------------------------------------
const byCalendar = {};
for (const ev of events.events) {
  if (!byCalendar[ev.calendar]) byCalendar[ev.calendar] = [];
  byCalendar[ev.calendar].push(ev);
}

for (const [calKey, calMeta] of Object.entries(events.calendars)) {
  const list = byCalendar[calKey] || [];
  const ics = buildCalendar(calMeta.name, list);
  writeFileSync(join(ROOT, calMeta.icsFilename), ics);
  console.log(`✓ ${calMeta.icsFilename}  (${list.length} events)`);
}

// Combined feed
const all = buildCalendar('Troop 114 + Crew 22', events.events);
writeFileSync(join(ROOT, 'all.ics'), all);
console.log(`✓ all.ics  (${events.events.length} events)`);
