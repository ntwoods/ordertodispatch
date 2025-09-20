const API_URL = "https://script.google.com/macros/s/AKfycbxMxIzOQmHv3LPTh6ca6i5uuguyH615cnjA5emEGNT0rmWpJlnrcg-KWNVP1DORkkcX/exec";

let globalOrders = [];

async function fetchOrders() {
  try {
const urlParams = new URLSearchParams(window.location.search);
const crmName = urlParams.get('crm');

if (!crmName) {
  console.error('CRM name is missing in URL. Please provide a CRM name in the URL (e.g., ?crm=YourCRMName).');
  document.getElementById("loader").innerHTML = `
    <div class="loader-container rounded-3xl p-12 max-w-md mx-auto">
      <div class="mb-6">
        <i class="fas fa-exclamation-circle text-4xl text-red-500"></i>
      </div>
      <div class="text-2xl text-red-700 font-semibold mb-2">CRM Name Missing!</div>
      <div class="text-red-500 mt-2">Please provide a CRM name in the URL (e.g., ?crm=YourCRMName).</div>
    </div>
  `;
  return; // Stop execution if CRM name is missing
}

const response = await fetch(`${API_URL}?crm=${encodeURIComponent(crmName)}`);
const result = await response.json();

if (result.status === "success") {
  document.getElementById("loader").classList.add("hidden");
  document.getElementById("ordersContainer").classList.remove("hidden");
  document.getElementById("metricsContainer").classList.remove("hidden");
  globalOrders = result.data;
  updateMetrics(globalOrders);
  renderOrders(globalOrders);
  if (typeof setReadOnlyMode === "function") {
    setReadOnlyMode();
  }
} else {
  throw new Error("Invalid response");
}
  } catch (err) {
document.getElementById("loader").innerHTML = `
  <div class="loader-container rounded-3xl p-12 max-w-md mx-auto">
    <div class="mb-6">
      <i class="fas fa-exclamation-triangle text-4xl text-red-400"></i>
    </div>
    <div class="text-2xl text-blue-700 font-semibold mb-2">Failed to load orders</div>
    <div class="text-blue-500/60">Please check your connection and try again</div>
  </div>
`;
console.error(err);
  }
}

function updateMetrics(orders) {
  const total = orders.length;
  let active = 0;
  let overdue = 0;

  orders.forEach(order => {
const deadline = getDeadline(order.timestamp);
if (new Date() > deadline) {
  overdue++;
} else {
  active++;
}
  });

  document.getElementById('totalOrders').textContent = total;
  document.getElementById('activeOrders').textContent = active;
  document.getElementById('overdueOrders').textContent = overdue;
}

function renderOrders(orders) {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "";

  if (!orders || orders.length === 0) {
container.innerHTML = `
  <div class="md:col-span-3 flex justify-center">
    <div class="no-orders rounded-3xl p-12 text-center max-w-lg w-full float-animation">
      <i class="fas fa-box-open text-6xl text-blue-400 mb-4"></i>
      <h2 class="text-3xl font-bold text-blue-700 mb-2">No Pending Dispatches!</h2>
      <p class="text-blue-500/70">All orders are up-to-date. Great job, team!</p>
      <button onclick="fetchOrders()" class="btn-primary px-6 py-3 rounded-xl mt-6">
        <i class="fas fa-sync-alt mr-2"></i> Refresh Dashboard
      </button>
    </div>
  </div>
`;
return;
  }

  orders.forEach((order, index) => {
const deadline = getDeadline(order.timestamp);
const isOverdue = new Date() > deadline;

const card = document.createElement("div");
card.className = "glass-morphism rounded-3xl p-6 flex flex-col card-hover stagger-animation";
card.style.animationDelay = `${index * 0.1}s`; // Stagger animation

const statusClass = isOverdue ? 'status-overdue' : 'status-active';
const countdownClass = isOverdue ? 'countdown-danger' : 'countdown-active';
const statusText = isOverdue ? 'OVERDUE' : 'ACTIVE';

// --- NEW: Dealer Type Badge HTML Logic ---
let dealerTypeBadge = '';
if (order.dealerType) {
    let badgeColorClass = '';
    switch (order.dealerType.toLowerCase()) {
        case 'red':
            badgeColorClass = 'bg-red-500';
            break;
        case 'yellow':
            badgeColorClass = 'bg-yellow-500';
            break;
        case 'green':
            badgeColorClass = 'bg-green-500';
            break;
        default:
            badgeColorClass = 'bg-gray-500'; // Fallback color
    }
    dealerTypeBadge = `
        <div class="dealer-type-badge ${badgeColorClass} text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center justify-center ml-2">
            ${order.dealerType}
        </div>
    `;
}
// --- END NEW ---

card.innerHTML = `
  <div class="flex-grow">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-2xl font-bold text-blue-800 flex items-center">
        ${order.dealerName} ${dealerTypeBadge}
      </h3>
      <span class="text-xs font-semibold px-3 py-1 rounded-full text-white ${statusClass}">
        ${statusText}
      </span>
    </div>

    <p class="text-blue-700/80 mb-2"><i class="fas fa-user mr-2 text-blue-500/70"></i>Marketing: <span class="text-blue-900 font-medium">${order.marketingPersonName}</span></p>
    <p class="text-blue-700/80 mb-2"><i class="fas fa-map-marker-alt mr-2 text-blue-500/70"></i>Location: <span class="text-blue-900 font-medium">${order.location}</span></p>
    <p class="text-blue-700/80 mb-2"><i class="fas fa-id-card mr-2 text-blue-500/70"></i>CRM Name: <span class="text-blue-900 font-medium">${order.crmName}</span></p>
    <p class="text-blue-700/80 mb-4"><i class="fas fa-user-tie mr-2 text-blue-500/70"></i>Concerned Owner: <span class="text-blue-900 font-medium">${order.concernedOwner}</span></p>

    <div class="flex justify-between items-center mb-4">
      <span class="text-blue-700/80"><i class="fas fa-calendar-alt mr-2 text-blue-500/70"></i>Tentative Dispatch:</span>
      <span class="text-blue-900 font-medium">${order.dispatchDate || 'N/A'}</span>
    </div>

    <div class="flex justify-between items-center bg-blue-500/10 rounded-xl p-3 mb-4">
      <span class="text-blue-700 font-semibold"><i class="fas fa-hourglass-half mr-2 text-blue-600"></i>Time Left:</span>
      <span id="countdown-${index}" class="text-2xl font-mono ${countdownClass}"></span>
    </div>
    <div class="editable">
    <div class="flex justify-center space-x-4 mb-4">
      <button onclick="openMultipleDocuments('${order.fileUploadLink ? order.fileUploadLink.replace(/'/g, "\\'") : ''}', ${index})" class="btn-primary px-4 py-2 rounded-lg text-sm">
        <i class="fas fa-file-alt mr-2"></i>Raw Order
      </button>
      <button onclick="openMultipleDocuments('${order.finalOrderFile ? order.finalOrderFile.replace(/'/g, "\\'") : ''}', ${index})" class="btn-primary px-4 py-2 rounded-lg text-sm">
        <i class="fas fa-file-invoice mr-2"></i>Final Order
      </button>
    </div>

    <div class="mb-4">
        <label for="remark-${index}" class="block text-blue-700/80 font-semibold mb-2">
            <i class="fas fa-comment-alt mr-2 text-blue-500/70"></i>Remark:
        </label>
        <input type="text" id="remark-${index}" 
               class="w-full p-3 rounded-lg bg-blue-500/10 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-blue-900" 
               placeholder="Add a remark (e.g., 'Called customer')" />
    </div>

    <div class="radio-section mb-4">
      <label class="block text-blue-700/80 font-semibold mb-2">
        <i class="fas fa-check-circle mr-2 text-blue-500/70"></i>Status Update:
      </label>
      <div class="flex flex-wrap gap-4">
        <label class="inline-flex items-center group cursor-pointer">
          <input type="radio" name="status-${index}" value="Dispatch informed" class="radio-custom" onchange="enableSubmit(${index})">
          <span class="ml-2 text-blue-800 font-medium group-hover:text-blue-900">Dispatch department informed</span>
        </label>
      </div>
    </div>

    <button id="submit-btn-${index}" onclick="submitOrder(${index})" 
      class="btn-primary w-full py-3 rounded-xl text-lg font-semibold flex items-center justify-center transition-all duration-300 ease-in-out" disabled>
      <i class="fas fa-paper-plane mr-3"></i> Submit Update
    </button>
    </div>
  </div>
`;
container.appendChild(card);
startCountdown(deadline, `countdown-${index}`);
  });
}

function getDeadline(timestamp) {
  const orderTime = new Date(timestamp);
  const deadline = new Date(orderTime);
  deadline.setHours(18, 0, 0, 0); // Set deadline to 6 PM on the same day
  return deadline;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
hour12: true
  });
}

function startCountdown(deadline, elementId) {
  const countdownElement = document.getElementById(elementId);

  function update() {
const now = new Date();
const timeLeft = deadline - now;

if (timeLeft <= 0) {
  countdownElement.textContent = "EXPIRED!";
  countdownElement.classList.remove('countdown-active');
  countdownElement.classList.add('countdown-danger');
  return;
}

const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

countdownElement.textContent = 
  `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  update();
  setInterval(update, 1000);
}

function enableSubmit(index) {
  const submitBtn = document.getElementById(`submit-btn-${index}`);
  submitBtn.disabled = false;
}

async function submitOrder(index) {
  const order = globalOrders[index];
  const selectedStatus = document.querySelector(`input[name="status-${index}"]:checked`);
  const remark = document.getElementById(`remark-${index}`).value; // Get remark value
  const button = document.getElementById(`submit-btn-${index}`);
  const originalText = button.innerHTML;

  if (!selectedStatus) {
showNotification('Please select a status!', 'warning');
return;
  }

  button.innerHTML = `
<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...
  `;
  button.disabled = true;

  const payload = {
timestamp: order.timestamp,
timestampForMap: order.timestampForMap,        
status: selectedStatus.value,
remark: remark // Add remark to the payload
  };

  try {
const response = await fetch(API_URL, {
  method: 'POST',
  mode: 'no-cors', // Required for Google Apps Script as a web app
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
});

// Simulate success feedback since no-cors prevents reading response
setTimeout(() => {
  showNotification('Order updated successfully!', 'success');

  button.innerHTML = `
    <i class="fas fa-check mr-2"></i>
    Submitted ✓
  `;
  button.className = button.className.replace('btn-primary', 'btn-success');
  fetchOrders();
}, 1000);

  } catch (err) {
console.error('Submit error:', err);
button.innerHTML = originalText;
button.disabled = false;
showNotification('Submission failed. Please try again.', 'error');
  }
}

function showNotification(message, type) {
  const notificationDiv = document.createElement('div');
  let bgColorClass = '';
  let iconClass = '';

  if (type === 'success') {
bgColorClass = 'bg-green-500';
iconClass = 'fas fa-check-circle';
  } else if (type === 'error') {
bgColorClass = 'bg-red-500';
iconClass = 'fas fa-exclamation-circle';
  } else if (type === 'warning') {
bgColorClass = 'bg-yellow-500';
iconClass = 'fas fa-exclamation-triangle';
  }

  notificationDiv.className = `fixed top-4 right-4 ${bgColorClass} text-white px-6 py-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
  notificationDiv.innerHTML = `
<div class="flex items-center gap-3">
  <i class="${iconClass}"></i>
  <span>${message}</span>
</div>
  `;
  document.body.appendChild(notificationDiv);

  setTimeout(() => notificationDiv.classList.remove('translate-x-full'), 100);
  setTimeout(() => {
notificationDiv.classList.add('translate-x-full');
setTimeout(() => document.body.removeChild(notificationDiv), 300);
  }, 3000);
}

function openMultipleDocuments(urlString, index) {
// Split the URLs by comma and trim whitespace
const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);

if (urls.length === 0) {
    // Use a custom message box instead of alert
    showNotification('No valid URLs found for this order.', 'warning');
    return;
}

// Show a confirmation if there are multiple URLs using a custom modal/notification
if (urls.length > 1) {
    // For simplicity, we'll just open them. In a real app, you'd show a custom confirmation dialog.
    showNotification(`Opening ${urls.length} documents in separate tabs.`, 'info');
}

// Open each URL in a new tab with a small delay to prevent popup blocker
urls.forEach((url, urlIndex) => {
    setTimeout(() => {
        window.open(url, '_blank');
    }, urlIndex * 100); // 100ms delay between each tab opening
});
}

// Initial fetch on page load
document.addEventListener('DOMContentLoaded', fetchOrders);
