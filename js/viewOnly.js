  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode"); // "view" or undefined
  const isReadOnly = mode === "view";

  // Run this after DOM loads (or wrap in window.onload / DOMContentLoaded)
  function setReadOnlyMode() {
    if (!isReadOnly) return;

    // Disable all form controls
    document.querySelectorAll("input, textarea, select, button").forEach(el => {
      el.disabled = true;
      el.style.pointerEvents = "none"; // disables click
      el.style.opacity = 0.6; // optional: visual cue
    });

    // Hide any editable sections if needed
    const editable = document.querySelectorAll(".editable, .action-button, .upload-section");
    editable.forEach(el => el.style.display = "none");

    // Optional: Add watermark or label
    const tag = document.createElement("div");
    tag.textContent = "🔒 View Only Mode";
    tag.style.position = "fixed";
    tag.style.top = "10px";
    tag.style.right = "10px";
    tag.style.background = "#f8d7da";
    tag.style.color = "#721c24";
    tag.style.padding = "5px 10px";
    tag.style.borderRadius = "5px";
    tag.style.zIndex = "9999";
    document.body.appendChild(tag);
  }

  window.addEventListener("DOMContentLoaded", setReadOnlyMode);
