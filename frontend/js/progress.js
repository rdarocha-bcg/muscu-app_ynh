const API = "";
let API_KEY = "";
let chart = null;
let currentData = [];
let currentTab = "weight";

async function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...(opts.headers || {}) }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const cfg = await fetch(`${API}/config`).then(r => r.json()).catch(() => ({}));
  API_KEY = cfg.api_key || "";
  loadExercises();
  loadFrequent();
  document.getElementById("select-exercise").onchange = onExerciseChange;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      renderChart(currentData);
    };
  });
});

async function loadFrequent() {
  const frequent = await apiFetch(`${API}/api/exercises/frequent`).then(r => r.json());
  const el = document.getElementById("frequent-exercises");
  if (!frequent.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="frequent-list">${frequent.map(e =>
    `<button class="frequent-btn" onclick="selectExercise('${e.name.replace(/'/g, "\\'")}')">${e.name}</button>`
  ).join("")}</div>`;
}

function selectExercise(name) {
  document.getElementById("select-exercise").value = name;
  onExerciseChange();
}

async function loadExercises() {
  const res = await apiFetch(`${API}/api/exercises`);
  const exercises = await res.json();
  const sel = document.getElementById("select-exercise");
  exercises.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e;
    opt.textContent = e;
    sel.appendChild(opt);
  });

  // Pre-select from URL param
  const params = new URLSearchParams(location.search);
  const paramEx = params.get("ex");
  if (paramEx) {
    const strip = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const match = exercises.find(e => strip(e) === strip(paramEx)) || exercises.find(e => e === paramEx);
    if (match) {
      sel.value = match;
      onExerciseChange();
    }
  }
}

async function onExerciseChange() {
  const exercise = document.getElementById("select-exercise").value;
  if (!exercise) return;
  document.getElementById("frequent-exercises").classList.add("hidden");
  history.replaceState(null, "", `?ex=${encodeURIComponent(exercise)}`);

  const res = await apiFetch(`${API}/api/progress/${encodeURIComponent(exercise)}`);
  currentData = await res.json();

  document.getElementById("progress-content").classList.remove("hidden");
  renderStats(currentData);
  renderChart(currentData);
  renderHistory(currentData);
}

function groupByDate(data) {
  const map = {};
  for (const row of data) {
    if (!map[row.date]) map[row.date] = [];
    map[row.date].push(row);
  }
  return map;
}

function renderStats(data) {
  if (!data.length) return;
  const maxWeight = Math.max(...data.map(d => d.weight || 0));
  const maxReps = Math.max(...data.map(d => d.reps || 0));
  const sessions = new Set(data.map(d => d.date)).size;
  // Epley 1RM estimate: w * (1 + r/30)
  const best = data.reduce((best, d) => {
    const rm = (d.weight || 0) * (1 + (d.reps || 0) / 30);
    return rm > best ? rm : best;
  }, 0);

  document.getElementById("stat-max-weight").textContent = maxWeight ? maxWeight + " kg" : "—";
  document.getElementById("stat-max-reps").textContent = maxReps || "—";
  document.getElementById("stat-sessions").textContent = sessions;
  document.getElementById("stat-1rm").textContent = best ? Math.round(best) + " kg" : "—";
}

function renderChart(data) {
  const grouped = groupByDate(data);
  const labels = Object.keys(grouped).map(d => {
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  });

  let values;
  if (currentTab === "weight") {
    values = Object.values(grouped).map(sets => Math.max(...sets.map(s => s.weight || 0)));
  } else if (currentTab === "volume") {
    values = Object.values(grouped).map(sets => sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight || 0), 0));
  } else {
    values = Object.values(grouped).map(sets => Math.max(...sets.map(s => s.reps || 0)));
  }

  const ctx = document.getElementById("progress-chart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#6ee7b7",
        backgroundColor: "rgba(110,231,183,0.08)",
        borderWidth: 2,
        pointBackgroundColor: "#6ee7b7",
        pointRadius: 4,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (currentTab === "volume") return `${v.toFixed(0)} kg·reps`;
              if (currentTab === "reps") return `${v} reps`;
              return `${v} kg`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: "#2e2e2e" }, ticks: { color: "#888" } },
        y: { grid: { color: "#2e2e2e" }, ticks: { color: "#888" }, beginAtZero: true }
      }
    }
  });
}

function renderHistory(data) {
  const grouped = groupByDate(data);
  const el = document.getElementById("history-table");
  const dates = Object.keys(grouped).reverse();

  el.innerHTML = dates.map(date => {
    const sets = grouped[date];
    const dt = new Date(date + "T12:00:00");
    const label = dt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
    const tags = sets.map(s => {
      const parts = [];
      if (s.reps) parts.push(`${s.reps} reps`);
      if (s.weight) parts.push(`${s.weight} kg`);
      return `<span class="history-set-tag">${parts.join(" × ")}</span>`;
    }).join("");
    return `
      <div class="history-row">
        <span class="history-date">${label}</span>
        <div class="history-sets">${tags}</div>
      </div>
    `;
  }).join("");
}
