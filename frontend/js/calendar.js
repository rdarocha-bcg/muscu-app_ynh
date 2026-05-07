let allSessions = [];
let current = new Date();
current.setDate(1);

document.addEventListener("DOMContentLoaded", async () => {
  await initConfig();
  const sessionsData = await apiFetch(`${API}/api/sessions`).then(r => r.json());
  allSessions = sessionsData.data ?? sessionsData;
  document.getElementById("btn-prev").onclick = () => { current.setMonth(current.getMonth() - 1); render(); };
  document.getElementById("btn-next").onclick = () => { current.setMonth(current.getMonth() + 1); render(); };
  document.getElementById("btn-today").onclick = () => { current = new Date(); current.setDate(1); render(); };
  render();
});

function render() {
  const year = current.getFullYear();
  const month = current.getMonth();

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  document.getElementById("btn-today").classList.toggle("hidden", isCurrentMonth);

  document.getElementById("cal-title").textContent =
    new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      .replace(/^\w/, c => c.toUpperCase());

  const monthSessions = allSessions.filter(s => {
    const d = new Date(s.date + "T12:00:00");
    return d.getFullYear() === year && d.getMonth() === month;
  });

  renderStats(monthSessions, year, month);

  const firstIdByDate = {};
  monthSessions.forEach(s => {
    if (firstIdByDate[s.date] === undefined) firstIdByDate[s.date] = s.id;
  });

  renderGrid(year, month, monthSessions, firstIdByDate);
  renderSessionList(monthSessions);
}

function renderStats(sessions, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const uniqueDays = new Set(sessions.map(s => s.date)).size;
  const tags = sessions.flatMap(s => s.tags || []);
  const topTag = tags.length ? [...tags.reduce((m, t) => m.set(t, (m.get(t)||0)+1), new Map())].sort((a,b)=>b[1]-a[1])[0][0] : "—";

  document.getElementById("month-stats").innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Séances</div>
      <div class="stat-value">${uniqueDays}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fréquence</div>
      <div class="stat-value">${Math.round(uniqueDays / daysInMonth * 7 * 10) / 10}×/sem</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Tag dominant</div>
      <div class="stat-value" style="font-size:1rem">${escapeHtml(topTag)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Exos logués</div>
      <div class="stat-value">${sessions.reduce((n,s) => n + (s.exercise_count || 0), 0)}</div>
    </div>
  `;
}

function renderGrid(year, month, monthSessions, firstIdByDate) {
  const sessionDates = new Set(monthSessions.map(s => s.date));
  const today = new Date().toISOString().split("T")[0];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based: 0=Mon … 6=Sun
  let startDow = (firstDay.getDay() + 6) % 7;

  const cells = [];

  // Padding from previous month
  const prevLast = new Date(year, month, 0);
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ day: prevLast.getDate() - i, current: false, date: null });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ day: d, current: true, date: dateStr, hasSession: sessionDates.has(dateStr), isToday: dateStr === today });
  }

  // Fill remaining
  const remaining = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false, date: null });
  }

  document.getElementById("cal-grid").innerHTML = cells.map(c => {
    let cls = "cal-day";
    if (!c.current) cls += " other-month";
    if (c.hasSession) cls += " has-session";
    if (c.isToday) cls += " today";
    if (c.hasSession && c.current && c.date) {
      const sid = firstIdByDate[c.date];
      const label = `Ouvrir la séance du ${c.day}`;
      return `<a href="index.html?session=${sid}" class="${cls}" aria-label="${escapeHtml(label)}">${c.day}</a>`;
    }
    return `<div class="${cls}">${c.day}</div>`;
  }).join("");
}

function renderSessionList(sessions) {
  const el = document.getElementById("month-sessions");
  if (!sessions.length) {
    el.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:24px 0">Aucune séance ce mois-ci.</p>`;
    return;
  }

  const sorted = [...sessions].sort((a,b) => a.date.localeCompare(b.date));

  el.innerHTML = sorted.map(s => `
    <a class="month-session-item" id="session-${s.date}" href="index.html?session=${s.id}">
      <div>
        <div class="session-date">${formatDate(s.date)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          ${s.notes ? `<span style="color:var(--text-muted);font-size:0.82rem">${escapeHtml(s.notes)}</span>` : ""}
          ${(s.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
    </a>
  `).join("");
}

  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
}
