let currentSessionId = null;
let setCount = 1;
let currentTags = [];
let editTags = [];
let editSessionId = null;
let activeFilter = null;

document.addEventListener("DOMContentLoaded", async () => {
  await initConfig();
  loadSessions();
  loadExerciseSuggestions();
  loadTagFilters();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("input-date").value = today;

  document.getElementById("btn-new-session").onclick = () => {
    document.getElementById("form-new-session").classList.toggle("hidden");
  };
  document.getElementById("btn-cancel-session").onclick = cancelNewSession;
  document.getElementById("btn-create-session").onclick = createSession;
  document.getElementById("modal-close").onclick = closeModal;
  document.getElementById("btn-add-set").onclick = addSetRow;
  document.getElementById("btn-save-exercise").onclick = saveExercise;
  document.getElementById("edit-close").onclick = closeEditModal;
  document.getElementById("edit-exercise-close").onclick = closeEditExerciseModal;
  document.getElementById("edit-exercise-add-set").onclick = addEditSetRow;
  document.getElementById("edit-exercise-save").onclick = saveEditExercise;
  document.getElementById("edit-close-2").onclick = closeEditModal;
  document.getElementById("btn-save-edit").onclick = saveEdit;

  document.getElementById("modal-session").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById("modal-edit").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById("modal-edit-exercise").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeEditExerciseModal();
  });

  document.getElementById("input-tag").addEventListener("keydown", onTagKeydown("input-tag", () => currentTags, "tags-selected", renderSelectedTags));
  document.getElementById("edit-tag-input").addEventListener("keydown", onTagKeydown("edit-tag-input", () => editTags, "edit-tags-selected", renderEditTags));

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dot-menu")) {
      document.querySelectorAll(".dot-dropdown").forEach(d => d.classList.add("hidden"));
    }
  });
});

function onTagKeydown(inputId, getTags, selectedId, renderFn) {
  return (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = e.target.value.trim().replace(/,$/, "").toLowerCase();
      const tags = getTags();
      if (val && !tags.includes(val)) { tags.push(val); renderFn(); }
      e.target.value = "";
    }
  };
}

// Sessions list
async function loadSessions() {
  const url = activeFilter ? `${API}/api/sessions?tag=${encodeURIComponent(activeFilter)}` : `${API}/api/sessions`;
  const sessions = await apiFetch(url).then(r => r.json());
  const el = document.getElementById("sessions-list");

  if (!sessions.length) {
    el.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px 0">Aucune séance${activeFilter ? " pour ce tag" : ""}.</p>`;
    return;
  }

  el.innerHTML = sessions.map(s => `
    <div class="session-item" onclick="openSession(${s.id}, '${s.date}', '${(s.notes||'').replace(/'/g,"\\'")}')">
      <div>
        <div class="session-date">${formatDate(s.date)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;align-items:center">
          ${s.notes ? `<span style="color:var(--text-muted);font-size:0.82rem">${escapeHtml(s.notes)}</span>` : ""}
          ${(s.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
      <div class="session-actions">
        <div class="dot-menu">
          <button class="dot-btn" onclick="event.stopPropagation(); toggleMenu(this)">···</button>
          <div class="dot-dropdown hidden">
            <button onclick="event.stopPropagation(); openEditModal(${s.id})">Modifier</button>
            <button class="danger" onclick="event.stopPropagation(); deleteSession(${s.id})">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function toggleMenu(btn) {
  const dd = btn.nextElementSibling;
  const wasHidden = dd.classList.contains("hidden");
  document.querySelectorAll(".dot-dropdown").forEach(d => d.classList.add("hidden"));
  if (wasHidden) dd.classList.remove("hidden");
}

async function loadTagFilters() {
  const tags = await apiFetch(`${API}/api/tags`).then(r => r.json());
  const el = document.getElementById("tag-filters");
  if (!tags.length) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <button class="tag-filter-btn ${!activeFilter ? "active" : ""}" onclick="setFilter(null)">Tout</button>
    ${tags.map(t => `<button class="tag-filter-btn ${activeFilter===t?"active":""}" onclick="setFilter('${escapeHtml(t)}')">${escapeHtml(t)}</button>`).join("")}
  `;
}

function setFilter(tag) {
  activeFilter = tag;
  loadSessions();
  loadTagFilters();
}

// Create session
function cancelNewSession() {
  document.getElementById("form-new-session").classList.add("hidden");
  currentTags = [];
  renderSelectedTags();
}

async function createSession() {
  const date = document.getElementById("input-date").value;
  const notes = document.getElementById("input-notes").value;
  if (!date) return;
  const pending = document.getElementById("input-tag").value.trim().toLowerCase();
  if (pending && !currentTags.includes(pending)) currentTags.push(pending);

  await apiFetch(`${API}/api/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, notes, tags: currentTags })
  });
  document.getElementById("form-new-session").classList.add("hidden");
  document.getElementById("input-notes").value = "";
  document.getElementById("input-tag").value = "";
  currentTags = [];
  renderSelectedTags();
  loadSessions();
  loadTagFilters();
}

async function deleteSession(id) {
  showConfirm("Supprimer cette séance ?", async () => {
    await apiFetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
    loadSessions();
    loadTagFilters();
  });
}

// Edit modal
async function openEditModal(id) {
  closeModal();
  editSessionId = id;
  const sessions = await apiFetch(`${API}/api/sessions`).then(r => r.json());
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  document.getElementById("edit-date").value = s.date;
  document.getElementById("edit-notes").value = s.notes || "";
  editTags = [...(s.tags || [])];
  renderEditTags();
  document.getElementById("modal-edit").classList.remove("hidden");
}

async function saveEdit() {
  const date = document.getElementById("edit-date").value;
  const notes = document.getElementById("edit-notes").value;
  const pending = document.getElementById("edit-tag-input").value.trim().toLowerCase();
  if (pending && !editTags.includes(pending)) editTags.push(pending);

  await apiFetch(`${API}/api/sessions/${editSessionId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, notes, tags: editTags })
  });
  closeEditModal();
  loadSessions();
  loadTagFilters();
}

function closeEditModal() {
  document.getElementById("modal-edit").classList.add("hidden");
  editSessionId = null;
}

// Session detail
async function openSession(id, date, notes) {
  currentSessionId = id;
  document.getElementById("modal-title").textContent = `${formatDate(date)}${notes ? " — " + notes : ""}`;
  document.getElementById("modal-session").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("add-exercise-panel").classList.add("hidden");
  document.getElementById("delete-confirm-panel").classList.add("hidden");
  document.getElementById("modal-session-actions").classList.remove("hidden");
  resetSetsBuilder();
  loadExerciseSuggestionsAdd();
  await loadLogs();
}

function closeModal() {
  document.getElementById("modal-session").classList.add("hidden");
  document.body.style.overflow = "";
  currentSessionId = null;
}

function toggleAddExercise() {
  const panel = document.getElementById("add-exercise-panel");
  const isOpening = panel.classList.contains("hidden");
  panel.classList.toggle("hidden");
  document.getElementById("modal-session-actions").classList.toggle("hidden", isOpening);
}

function deleteCurrentSession() {
  const title = document.getElementById("modal-title").textContent;
  const exercises = Object.keys(_logGroups);
  const summary = exercises.length
    ? `${exercises.length} exercice${exercises.length > 1 ? "s" : ""} : ${exercises.join(", ")}`
    : "Aucun exercice enregistré";
  document.getElementById("delete-confirm-text").textContent =
    `Supprimer « ${title} » ? ${summary}.`;
  document.getElementById("delete-confirm-panel").classList.remove("hidden");
  document.getElementById("modal-session-actions").classList.add("hidden");
}

function cancelDeleteSession() {
  document.getElementById("delete-confirm-panel").classList.add("hidden");
  document.getElementById("modal-session-actions").classList.remove("hidden");
}

async function confirmDeleteSession() {
  await apiFetch(`${API}/api/sessions/${currentSessionId}`, { method: "DELETE" });
  closeModal();
  loadSessions();
  loadTagFilters();
}

async function loadLogs() {
  const logs = await apiFetch(`${API}/api/sessions/${currentSessionId}/logs`).then(r => r.json());
  const el = document.getElementById("logs-list");

  if (!logs.length) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px">Aucun exercice enregistré.</p>`;
    return;
  }

  const grouped = {};
  for (const l of logs) {
    if (!grouped[l.exercise]) grouped[l.exercise] = [];
    grouped[l.exercise].push(l);
  }

  _logGroups = grouped;

  el.innerHTML = Object.entries(grouped).map(([name, sets]) => {
    const key = encodeURIComponent(name);
    return `
    <div class="log-exercise">
      <div class="log-exercise-name">
        <span style="color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(110,231,183,0.4)" onclick="event.stopPropagation();location.href='progress.html?ex=${encodeURIComponent(name)}'">${escapeHtml(name)}</span>
        <div class="dot-menu">
          <button class="dot-btn" onclick="event.stopPropagation(); toggleMenu(this)">···</button>
          <div class="dot-dropdown hidden">
            <button onclick="openEditExerciseModal('${key}')">Modifier</button>
            <button class="danger" onclick="deleteExerciseLogs('${key}')">Supprimer</button>
          </div>
        </div>
      </div>
      <table class="sets-table">
        <tr><th></th><th>Reps</th><th>Poids</th></tr>
        ${sets.map((s, i) => `
          <tr>
            <td><span class="set-index">${i + 1}</span></td>
            <td>${s.reps ?? "—"}</td>
            <td>${s.weight ? s.weight + " kg" : "PC"}</td>
          </tr>
        `).join("")}
      </table>
    </div>`;
  }).join("");
}

async function loadExerciseSuggestions() {
  const exercises = await apiFetch(`${API}/api/exercises`).then(r => r.json());
  const dl = document.getElementById("exercise-suggestions");
  if (dl) dl.innerHTML = exercises.map(e => `<option value="${e}">`).join("");
}

async function loadExerciseSuggestionsAdd() {
  const exercises = await apiFetch(`${API}/api/exercises`).then(r => r.json());
  const dl = document.getElementById("exercise-suggestions-add");
  if (dl) dl.innerHTML = exercises.map(e => `<option value="${e}">`).join("");
}

function resetSetsBuilder() {
  document.getElementById("sets-builder").innerHTML = setRowHTML(1, null, null);
}

function addSetRow() {
  const rows = document.querySelectorAll("#sets-builder .set-row");
  document.getElementById("sets-builder").insertAdjacentHTML("beforeend", setRowHTML(rows.length + 1, null, null));
}

async function saveExercise() {
  const exercise = document.getElementById("input-exercise").value.trim();
  if (!exercise) return alert("Nom de l'exercice requis");
  const rows = document.querySelectorAll("#sets-builder .set-row");
  const sets = Array.from(rows).map(row => ({
    reps: parseInt(row.querySelector(".input-reps").value) || null,
    weight: parseFloat(row.querySelector(".input-weight").value) || null,
  })).filter(s => s.reps || s.weight);
  if (!sets.length) return alert("Ajoute au moins un set");

  await apiFetch(`${API}/api/sessions/${currentSessionId}/logs`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise, sets })
  });
  document.getElementById("input-exercise").value = "";
  resetSetsBuilder();
  document.getElementById("add-exercise-panel").classList.add("hidden");
  document.getElementById("modal-session-actions").classList.remove("hidden");
  loadLogs();
  loadExerciseSuggestionsAdd();
}

// Edit exercise
let editExerciseLogIds = [];
let editExerciseSetCount = 1;
let _logGroups = {};

function setRowHTML(n, reps, weight, container) {
  return `
    <div class="set-row">
      <span class="set-num">${n}</span>
      <input type="number" placeholder="Reps" class="input-reps" min="1" value="${reps || ""}">
      <input type="number" placeholder="Poids (kg)" class="input-weight" step="0.5" min="0" value="${weight || ""}">
      <button class="btn-ghost" onclick="this.parentElement.remove()">✕</button>
    </div>`;
}

function openEditExerciseModal(key) {
  const name = decodeURIComponent(key);
  const sets = _logGroups[name];
  editExerciseLogIds = sets.map(s => s.id);
  editExerciseSetCount = sets.length;
  document.getElementById("edit-exercise-name").value = name;
  document.getElementById("edit-exercise-sets").innerHTML =
    sets.map((s, i) => setRowHTML(i + 1, s.reps, s.weight)).join("");
  loadExerciseSuggestions();
  document.getElementById("modal-edit-exercise").classList.remove("hidden");
}

function closeEditExerciseModal() {
  document.getElementById("modal-edit-exercise").classList.add("hidden");
  editExerciseLogIds = [];
}

function addEditSetRow() {
  editExerciseSetCount++;
  document.getElementById("edit-exercise-sets").insertAdjacentHTML("beforeend", setRowHTML(editExerciseSetCount, null, null));
}

async function saveEditExercise() {
  const exercise = document.getElementById("edit-exercise-name").value.trim();
  if (!exercise) return alert("Nom de l'exercice requis");
  const rows = document.querySelectorAll("#edit-exercise-sets .set-row");
  const sets = Array.from(rows).map(row => ({
    reps: parseInt(row.querySelector(".input-reps").value) || null,
    weight: parseFloat(row.querySelector(".input-weight").value) || null,
  })).filter(s => s.reps || s.weight);
  if (!sets.length) return alert("Ajoute au moins un set");

  await Promise.all(editExerciseLogIds.map(id =>
    apiFetch(`${API}/api/logs/${id}`, { method: "DELETE" })
  ));
  await apiFetch(`${API}/api/sessions/${currentSessionId}/logs`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercise, sets })
  });
  closeEditExerciseModal();
  loadLogs();
}

async function deleteExerciseLogs(key) {
  showConfirm("Supprimer cet exercice ?", async () => {
    const name = decodeURIComponent(key);
    const ids = _logGroups[name].map(s => s.id);
    await Promise.all(ids.map(id =>
      apiFetch(`${API}/api/logs/${id}`, { method: "DELETE" })
    ));
    loadLogs();
  });
}

// Tags rendering
function renderSelectedTags() {
  document.getElementById("tags-selected").innerHTML =
    currentTags.map((t, i) => `<span class="tag tag-removable" onclick="removeTag(${i})">✕ ${escapeHtml(t)}</span>`).join("");
}

function removeTag(i) { currentTags.splice(i, 1); renderSelectedTags(); }

function renderEditTags() {
  document.getElementById("edit-tags-selected").innerHTML =
    editTags.map((t, i) => `<span class="tag tag-removable" onclick="removeEditTag(${i})">✕ ${escapeHtml(t)}</span>`).join("");
}

function removeEditTag(i) { editTags.splice(i, 1); renderEditTags(); }

// Utils
function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}
