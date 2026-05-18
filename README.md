# Troop 114 · Crew 22 Calendar

A static, GitHub-Pages-hosted committee calendar for **Troop 114** and **Crew 22** in Charlottesville, VA. School holidays from Albemarle County Public Schools are baked in. Parents subscribe via `.ics` URLs and get automatic updates whenever the committee edits `events.json`.

---

## What's in this repo

```
.
├── index.html              ← the calendar UI (lives at the site root)
├── events.json             ← edit this to add/change events
├── holidays.json           ← ACPS 2026-27 school dates
├── scripts/
│   └── generate-ics.mjs    ← converts events.json → .ics feeds
├── .github/workflows/
│   └── ics.yml             ← regenerates .ics on every push to main
├── troop114.ics            ← generated; do not edit by hand
├── crew22.ics              ← generated
└── all.ics                 ← generated (both calendars combined)
```

## First-time setup

1. Push this repo to GitHub (`Settings → Pages → Source: GitHub Actions`).
2. The first push to `main` triggers the workflow, which:
   - regenerates the three `.ics` files
   - deploys the site to `https://<user>.github.io/<repo>/`
3. Share the three subscription URLs with parents:

   | Calendar | Subscribe URL |
   |---|---|
   | Troop 114 only | `https://<user>.github.io/<repo>/troop114.ics` |
   | Crew 22 only   | `https://<user>.github.io/<repo>/crew22.ics`   |
   | Both           | `https://<user>.github.io/<repo>/all.ics`      |

**Important:** parents must *subscribe* to the URL, not *download* the file. In Apple Calendar: `File → New Calendar Subscription`. In Google Calendar: `Other calendars → + → From URL`. Subscribed calendars auto-refresh (Google ≈ every 24 hours, Apple is configurable down to hourly), so any committee edit propagates without anyone re-downloading.

## Adding or editing events

All events live in `events.json`. You can edit it directly in the GitHub web UI (✏️ pencil icon → commit), or locally via PR. Pushing to `main` triggers the workflow that regenerates the `.ics` feeds.

### Event schema

```json
{
  "id": "unique-id-string",              // required, used as ICS UID
  "calendar": "troop114" | "crew22",     // which calendar this belongs to
  "title": "Event Title",
  "location": "Where it happens",        // optional
  "description": "Details for the modal",// optional
  "link": "https://signup-or-info-url",  // optional; renders the "Info & Sign-Up" button
  "startDate": "2026-10-16",             // YYYY-MM-DD (local Eastern time)
  "endDate":   "2026-10-18",             // optional (multi-day events)
  "startTime": "19:00",                  // 24-hr HH:MM, omit for all-day
  "endTime":   "20:30",                  // optional
  "allDay":    true,                     // for multi-day campouts etc.
  "recurrence": { ... },                 // see below
  "exceptDates": ["2026-09-07"]          // skip these specific dates (holidays, etc.)
}
```

### Recurrence patterns

**Every Monday** (typical troop meeting):
```json
"recurrence": { "type": "weekly", "weekday": "MO" },
"startDate": "2026-08-17",
"endDate":   "2027-05-24"
```

**1st and 3rd Wednesdays** (typical crew cadence):
```json
"recurrence": { "type": "nth-weekday-of-month", "weekday": "WE", "weeks": [1, 3] }
```

**2nd and 4th Tuesdays:**
```json
"recurrence": { "type": "nth-weekday-of-month", "weekday": "TU", "weeks": [2, 4] }
```

Weekday codes follow iCalendar: `SU MO TU WE TH FR SA`.

The .ics output uses native `RRULE` so Apple/Google/Outlook handle expansion natively (no thousand-event spam in their feeds).

### One-off events

Just omit `recurrence`:
```json
{
  "id": "fall-campout-2026",
  "calendar": "troop114",
  "title": "Fall Campout — Sherando Lake",
  "location": "Sherando Lake Recreation Area",
  "startDate": "2026-10-16",
  "endDate":   "2026-10-18",
  "allDay": true,
  "description": "Patrol cooking. Departure Friday 6pm.",
  "link": "https://signup-genius-link"
}
```

### Skipping a single occurrence

To skip a meeting (school holiday, conflict, etc.), add the date to `exceptDates`:

```json
"exceptDates": ["2026-09-07", "2026-11-23", "2026-12-21"]
```

## Editing the school calendar

`holidays.json` is keyed off the ACPS 2026-27 calendar (revised March 12, 2026). When the next school-year calendar is approved (typically March each year), update this file. Three `type` values:

- `holiday` — shown in yellow (no school for anyone)
- `no-school` — orange stripe (teacher workday / PL; no students)
- `school-event` — blue stripe (first/last day, half day)

## Running locally

```bash
node scripts/generate-ics.mjs   # rebuild .ics feeds
python3 -m http.server 8000     # serve the site
# open http://localhost:8000
```

No dependencies, no build step.

## Design notes

- **Colors:** BSA 2026 National Jamboree palette — Jambo Red `#DA2128` for Troop 114, Jambo Blue `#2778AE` for Crew 22.
- **Typography:** Nunito + Nunito Sans (the World Scouting brand font family), loaded from Google Fonts.
- **Topo-map background:** subtle SVG line texture, per the BSA brand guidance on the topo asset.
- **Modal / sidebar:** click any event chip to open details with location, description, recurrence summary, and an "Info & Sign-Up" button that follows the event's `link`.

## License / credits

School calendar data: Albemarle County Public Schools, public domain.  
2026 National Jamboree brand assets © Scouting America.
