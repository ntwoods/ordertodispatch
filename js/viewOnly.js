const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode"); // "view" or undefined
const isReadOnly = mode === "view";
const forced = typeof window !== 'undefined' && window.__FORCE_VIEW__;


// Run this after DOM loads (or wrap in window.onload / DOMContentLoaded)
function applyReadOnlyOnce(root = document) {
  // 1) Form controls
  root.querySelectorAll("input, textarea, select, button").forEach(el => {
    if (el.id === 'refreshBtn' || el.id === 'autoRefreshBtn') return;
    el.disabled = true;
    el.style.pointerEvents = "none";
    el.style.opacity = 0.6;
  });

  // 2) Editable/action areas hide
  root.querySelectorAll(".editable, .action-button, .upload-section").forEach(el => {
    el.style.display = "none";
  });

  // 3) Modals (just in case)
  ["stockModal", "proceedModal"].forEach(id => {
    const m = root.getElementById ? root.getElementById(id) : null;
    if (m) m.classList.add("hidden");
  });
}

// Public API (called from L1 as well)
function setReadOnlyMode() {
  if (!isReadOnly) return;
  applyReadOnlyOnce(document);

  // Catch dynamically added nodes too
  if (!window.__NTW_RO_OBS__) {
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) applyReadOnlyOnce(node);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.__NTW_RO_OBS__ = obs;
  }

  // Global click kill-switch for safety inside editable areas
  document.addEventListener('click', (e) => {
    if (!isReadOnly) return;
    const t = e.target;
    if (t.closest && t.closest('.editable')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

window.addEventListener("DOMContentLoaded", setReadOnlyMode);
window.setReadOnlyMode = setReadOnlyMode;
