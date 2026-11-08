// Shared: which trial client this link is for (?c=key) and its config from n8n.
const TRIAL_API = "https://n8n-ffs0.srv1955533.hstgr.cloud/webhook/flowpal-trial-chat";
const TRIAL_CLIENT = (new URLSearchParams(location.search).get("c") || "yasmeen").toLowerCase().replace(/[^a-z0-9_-]/g, "");
async function trialCall(payload) {
  const res = await fetch(TRIAL_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client: TRIAL_CLIENT, ...payload }) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
function trialLink(path) { return path + "?c=" + encodeURIComponent(TRIAL_CLIENT); }
function h(tag, attrs = {}, ...kids) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); for (const k of kids) e.append(k); return e; }
