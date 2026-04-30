// Shared utilities — loaded before every page script
const API = "";
let API_KEY = "";

async function initConfig() {
  const cfg = await fetch(`${API}/config`).then(r => r.json()).catch(() => ({}));
  API_KEY = cfg.api_key || "";
}

function apiFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY, ...(opts.headers || {}) }
  });
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
