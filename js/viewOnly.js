// -------- viewOnly.js -----------
const forced = typeof window !== 'undefined' && window.__FORCE_VIEW__;
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get("mode");
const isReadOnly = (forced === true) || (mode === "view");

// core function
function applyReadOnlyOnce(root = document) {
  root.querySelectorAll("input, textarea, select, button").forEach(el => {
    if (el.id === 'refreshBtn' || el.id === 'autoRefreshBtn') return;
    el.disabled = true;
    el.style.pointerEvents = "none";
    el.style.opacity = 0.6;
  });

  // Hide known action elements
  root.querySelectorAll(".proceed-btn, .action-button, .upload-section").forEach(el => {
    el.style.display = "none";
  });

  // Disable links (like View Document)
  root.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", e => e.preventDefault());
    a.style.pointerEvents = "none";
    a.style.opacity = 0.6;
  });
}

// main entry
function setReadOnlyMode() {
  if (!isReadOnly) return;
  applyReadOnlyOnce(document);

  // Observe DOM for new elements (dynamic cards)
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
}

window.addEventListener("DOMContentLoaded", setReadOnlyMode);
window.setReadOnlyMode = setReadOnlyMode;
