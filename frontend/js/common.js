// Shared utilities — loaded before every page script
const API = "";
let API_KEY = "";

async function initConfig() {
  const cfg = await fetch(`${API}/config`).then(r => r.json()).catch(() => ({}));
  API_KEY = cfg.api_key || "";
}

// Loading indicator (#24)
let _loadingCount = 0;
function _setLoading(on) {
  _loadingCount += on ? 1 : -1;
  let bar = document.getElementById("loading-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "loading-bar";
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:3px;background:var(--accent,#6ee7b7);z-index:10000;transition:opacity 0.2s;pointer-events:none;";
    document.body.prepend(bar);
  }
  bar.style.opacity = _loadingCount > 0 ? "1" : "0";
}

async function apiFetch(url, opts = {}) {
  _setLoading(true);
  try {
    const resp = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...(opts.headers || {}) }
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      showError(data.detail || `Erreur serveur (${resp.status})`);
    }
    return resp;
  } catch (err) {
    showError("Erreur réseau — vérifiez votre connexion.");
    throw err;
  } finally {
    _setLoading(false);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(msg) {
  let banner = document.getElementById("error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "error-banner";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;background:#f87171;color:#000;padding:12px 16px;font-size:0.875rem;z-index:9999;text-align:center;cursor:pointer;";
    banner.onclick = () => { banner.style.display = "none"; };
    document.body.prepend(banner);
  }
  banner.textContent = msg;
  banner.style.display = "block";
  setTimeout(() => { if (banner) banner.style.display = "none"; }, 5000);
}

// Inline confirmation panel — replaces browser confirm() (#23)
function showConfirm(msg, onConfirm) {
  let panel = document.getElementById("confirm-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "confirm-panel";
    panel.style.cssText = [
      "position:fixed;bottom:24px;left:50%;transform:translateX(-50%)",
      "background:var(--surface2,#1f2937);border:1px solid var(--border,#374151)",
      "border-radius:12px;padding:16px 24px;display:none;flex-direction:column",
      "gap:12px;align-items:center;z-index:9999",
      "box-shadow:0 4px 24px rgba(0,0,0,0.5);min-width:260px;max-width:90vw",
    ].join(";");
    document.body.appendChild(panel);
  }
  panel.innerHTML = `
    <p style="color:var(--text,#f9fafb);text-align:center;margin:0;font-size:0.9rem">${escapeHtml(msg)}</p>
    <div style="display:flex;gap:10px;width:100%">
      <button id="confirm-yes" style="flex:1;padding:8px;border-radius:8px;background:#ef4444;color:#fff;border:none;cursor:pointer;font-weight:600">Supprimer</button>
      <button id="confirm-no" style="flex:1;padding:8px;border-radius:8px;background:transparent;color:var(--text,#f9fafb);border:1px solid var(--border,#374151);cursor:pointer">Annuler</button>
    </div>`;
  panel.style.display = "flex";
  document.getElementById("confirm-yes").onclick = () => { panel.style.display = "none"; onConfirm(); };
  document.getElementById("confirm-no").onclick  = () => { panel.style.display = "none"; };
}
