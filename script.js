// --- Splash/Loading Page (index.html) ---
if (window.location.pathname.endsWith("index.html")) {
  setTimeout(() => {
    window.location.href = "branch-select.html";
  }, 5000);
}

// --- Branch Selection Page (branch-select.html) ---
if (window.location.pathname.endsWith("branch-select.html")) {
  // This section is already managed in branch-select.html inline <script>
  // (see previous code: function selectBranch(branch) {...} )
  // If you want it centralized in script.js, use:
  window.selectBranch = function(branch) {
    localStorage.setItem('branch', branch);
    window.location.href = "dashboard.html";
  };
}

// --- Dashboard Page (dashboard.html) ---
if (window.location.pathname.endsWith("dashboard.html")) {
  document.addEventListener('DOMContentLoaded', function() {
    const branch = localStorage.getItem('branch') || 'BRANCH';
    document.getElementById('branch-name').textContent = branch;
  });
}
const hasWhatsappBox = document.getElementById('hasWhatsapp');
const whatsappVal = hasWhatsappBox && hasWhatsappBox.checked ? document.getElementById('whatsapp').value : "";
// use whatsappVal in your save logic instead of directly reading whatsapp input's value
