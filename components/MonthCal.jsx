'use client';

import { useMemo, useState } from 'react';

// Lesson-type colours — the map both portal calendars used in the legacy
// build (rebuild spec §1): gcse gold, alevel purple, group blue, trial green.
const TYPE_COLOUR = {
  gcse: '#C8A15A',
  alevel: '#7B5EA7',
  group: '#4A90D9',
  trial: '#2D7A4F',
  consultation: '#C8A15A',
};

export const lessonColour = (type) => TYPE_COLOUR[type] || TYPE_COLOUR.gcse;

export const TYPE_LABEL = {
  gcse: 'GCSE 1:1',
  alevel: 'A-Level 1:1',
  group: 'Group',
  trial: 'Free trial',
  consultation: 'Consultation',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The month calendar the old portals each had a hand-rolled copy of
 * (calRender for students, tpCalRender for tutors — same engine twice).
 * One component now: cells are navy when a day has lessons, the lesson
 * label inside picks up its type colour, and today gets the gold border.
 *
 * `lessons`     — anything with a startTime; lessonType drives the colour.
 * `onDayClick`  — optional (dayLessons, date) handler, only wired on days
 *                 that actually have lessons, as in legacy.
 * `renderLesson`— optional per-lesson cell renderer; the default shows
 *                 "Subject HH:MM" in the type colour.
 *
 * Styles live in app/student/student-extras.css (cal-* classes, legacy names).
 */
export default function MonthCal({ lessons = [], onDayClick, renderLesson }) {
  const [view, setView] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const year = view.getFullYear();
  const month = view.getMonth();

  // day-of-month → lessons, for the viewed month only.
  const byDay = useMemo(() => {
    const map = {};
    for (const l of lessons) {
      if (!l.startTime) continue;
      const d = new Date(l.startTime);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() === year && d.getMonth() === month) {
        (map[d.getDate()] ||= []).push(l);
      }
    }
    return map;
  }, [lessons, year, month]);

  const now = new Date();
  const isThisMonth = now.getFullYear() === year && now.getMonth() === month;

  // Monday-based offset: getDay() is 0=Sunday, so shift by 6.
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ empty: true, num: daysInPrev - startOffset + 1 + i, key: `p${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      num: d,
      lessons: byDay[d] || [],
      today: isThisMonth && d === now.getDate(),
      key: `d${d}`,
    });
  }
  const remaining = cells.length % 7 ? 7 - (cells.length % 7) : 0;
  for (let i = 1; i <= remaining; i++) cells.push({ empty: true, num: i, key: `n${i}` });

  const nav = (dir) => setView(new Date(year, month + dir, 1));

  return (
    <div>
      <div className="cal-head">
        <div className="cal-month">
          {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-xs ghost" onClick={() => nav(-1)}>◂ Prev</button>
          <button type="button" className="btn-xs ghost" onClick={() => nav(1)}>Next ▸</button>
        </div>
      </div>

      <div className="cal-grid-p">
        {WEEKDAYS.map((d) => <div key={d} className="cal-lbl">{d}</div>)}
      </div>

      <div className="cal-grid-p" style={{ marginTop: 0 }}>
        {cells.map((c) => {
          if (c.empty) {
            return (
              <div key={c.key} className="cal-d cal-empty">
                <div className="cal-d-num">{c.num}</div>
              </div>
            );
          }
          const has = c.lessons.length > 0;
          return (
            <div
              key={c.key}
              className={`cal-d${has ? ' cal-has' : ''}${c.today ? ' cal-today' : ''}`}
              style={{ cursor: has && onDayClick ? 'pointer' : 'default' }}
              onClick={has && onDayClick
                ? () => onDayClick(c.lessons, new Date(year, month, c.num))
                : undefined}
            >
              <div className="cal-d-num">{c.num}</div>
              {c.lessons.slice(0, 2).map((l, i) => (
                renderLesson ? renderLesson(l, i) : (
                  <div
                    key={l.id || i}
                    className="cal-d-lbl"
                    style={{ color: lessonColour(l.lessonType) }}
                  >
                    {(l.subject || 'Lesson')}{' '}
                    {new Date(l.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )
              ))}
              {c.lessons.length > 2 && (
                <div className="cal-d-lbl">+{c.lessons.length - 2} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
