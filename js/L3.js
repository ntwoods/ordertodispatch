const API_URL = "https://script.google.com/macros/s/AKfycbxkduAfhEpEtxKXA_HuIm-lZQj62ZPZwXeZ_Fol-v6VrzfhoXY2lffR64pjPahKV2o/exec";
const POST_URL = API_URL;

let globalOrders = [];

// Initialize AOS
AOS.init({
  duration: 1000,
  once: false,
  offset: 100
});

// Create floating particles
function createParticles() {
  const container = document.getElementById('particles');
  // Check if container exists before trying to append
  if (!container) {
  console.error("Particles container not found. Make sure an element with id='particles' exists.");
  return;
  }
  for (let i = 0; i < 20; i++) {
const particle = document.createElement('div');
particle.className = 'particle';
particle.style.left = Math.random() * 100 + '%';
particle.style.animationDelay = Math.random() * 6 + 's';
particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
container.appendChild(particle);
  }
}

async function fetchOrders() {
  try {
const urlParams = new URLSearchParams(window.location.search);
const crmName = urlParams.get('crm');
if (!crmName) {
  throw new Error('CRM name is missing in URL');
}

const response = await fetch(`${API_URL}?crm=${encodeURIComponent(crmName)}`);
const result = await response.json();

if (result.status === "success") {
  // Animate loader out
  anime({
    targets: '#loader',
    opacity: 0,
    scale: 0.8,
    duration: 500,
    easing: 'easeInOutQuad',
    complete: () => {
      document.getElementById("loader").classList.add("hidden");
      document.getElementById("ordersContainer").classList.remove("hidden");
      globalOrders = result.data;
      renderOrders(globalOrders);
      if (typeof setReadOnlyMode === "function") {
        setReadOnlyMode();
      }

    }
  });
} else {
  throw new Error("Invalid response");
}
  } catch (error) {
document.getElementById("loader").innerHTML = `
  <div class="glassmorphism rounded-2xl p-8 text-center">
    <div class="text-6xl mb-4">❌</div>
    <p class='text-red-300 text-xl font-semibold'>Failed to load orders</p>
    <button onclick="fetchOrders()" class="button-3d mt-4">Retry</button>
  </div>
`;
console.error("Fetch error:", error);
  }
}

function renderOrders(orders) {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "";

  if (!orders || orders.length === 0) {
container.innerHTML = `
  <div class="col-span-full" data-aos="fade-up">
    <div class="glassmorphism morphing-card p-12 text-center">
      <div class="text-8xl mb-6 floating">📋</div>
      <h2 class="text-4xl font-bold mb-4 gradient-text">No Pending Orders</h2>
      <p class="text-xl opacity-80">All orders processed! Take a well-deserved break ☕</p>
      <div class="mt-8">
        <button onclick="fetchOrders()" class="button-3d">
          🔄 Refresh Dashboard
        </button>
      </div>
    </div>
  </div>
`;
return;
  }

  orders.forEach((order, index) => {
const deadline = new Date(order.timestamp);
deadline.setHours(18, 0, 0, 0);
const isOverdue = new Date() > deadline;

const card = document.createElement("div");
card.className = "glassmorphism morphing-card card-hover p-6 relative overflow-hidden";
card.setAttribute('data-aos', 'fade-up');
card.setAttribute('data-aos-delay', (index * 100).toString());

const statusColor = isOverdue ? 'from-red-500 to-red-600' : 'from-green-400 to-green-500';
const statusIcon = isOverdue ? '🔥' : '✅';
const statusText = isOverdue ? 'OVERDUE' : 'ACTIVE';

card.innerHTML = `

  <div class="mb-6">
    <h3 class="flex items-center space-x-2">
      🏢 ${order.dealerName}
    </h3>
    <div class="space-y-2">
      <p class="flex items-center space-x-2">
        <span class="font-semibold">👤 Marketing:</span>
        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-lg">${order.marketingPersonName}</span>
      </p>
      <p class="flex items-center space-x-2">
        <span class="font-semibold">📍 Location:</span>
        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-lg">${order.location}</span>
      </p>
      <p class="flex items-center space-x-2">
        <span class="font-semibold">💼 CRM:</span>
        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-lg">${order.crmName}</span>
      </p>
      <p class="flex items-center space-x-2">
        <span class="font-semibold">🧔🏻‍♂️ Con. Owner:</span>
        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-lg">${order.concernedOwner}</span>
      </p>
      <p class="flex items-center space-x-2">
        <span class="font-semibold">⏰ Deadline:</span>
        <span class="bg-white bg-opacity-20 px-2 py-1 rounded-lg text-sm">${deadline.toLocaleString()}</span>
      </p>
      <button onclick="openMultipleDocuments('${order.fileUploadLink ? order.fileUploadLink.replace(/'/g, "\\'") : ''}', ${index})" class="button-3d">Raw Order</button>            
      <button onclick="openMultipleDocuments('${order.finalOrderFile ? order.finalOrderFile.replace(/'/g, "\\'") : ''}', ${index})" class="button-3d">Final Order</button>                        
    </div>
  </div>

  <div class="bg-black bg-opacity-30 rounded-xl p-4 mb-4">
    <p class="font-semibold mb-2">⏱️ Time Remaining:</p>
    <div id="countdown-${index}" class="text-3xl font-mono font-bold countdown-glow text-center"></div>
  </div>
  <div class="editable">        
  <div class="mb-4">
    <label class="block font-semibold mb-2">📅 Tentative Dispatch Date:</label>
    <input type="date" id="dispatch-${index}" 
      class="w-full bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl px-4 py-3 placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all" />
  </div>

  <div class="mb-4">
    <label class="block font-semibold mb-2">📝 Remark:</label>
    <input type="text" id="remark-${index}" 
      class="w-full bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl px-4 py-3 placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all" 
      placeholder="Enter remark here" />
  </div>

  <button onclick="submitOrder(${index})" id="submit-btn-${index}"
    class="w-full button-3d text-lg font-semibold relative overflow-hidden">
    <span class="relative z-10">🚀 Set Dispatch Date</span>
  </button>
  </div>
`;

container.appendChild(card);
startCountdown(deadline, index, isOverdue);
  });

  // Animate cards in
  anime({
targets: '.card-hover',
scale: [0.8, 1],
opacity: [0, 1],
delay: anime.stagger(100),
duration: 800,
easing: 'easeOutElastic(1, .8)'
  });
}

function startCountdown(deadline, index, isOverdue) {
  const countdownEl = document.getElementById(`countdown-${index}`);

  function updateCountdown() {
const now = new Date();
const diff = deadline - now;

if (diff <= 0) {
  countdownEl.innerHTML = `
    <span class="text-red-400 animate-pulse">
      ⚠️ EXPIRED ⚠️
    </span>
  `;
  return;
}

const days = Math.floor(diff / (1000 * 60 * 60 * 24));
const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
const seconds = Math.floor((diff % (1000 * 60)) / 1000);

const timeString = days > 0 
  ? `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

const color = diff < 3600000 ? 'text-red-400' : diff < 7200000 ? 'text-yellow-400' : 'text-green-400';

countdownEl.innerHTML = `<span class="${color}">${timeString}</span>`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

async function submitOrder(index) {
  const dispatchDate = document.getElementById(`dispatch-${index}`).value;
  const remark = document.getElementById(`remark-${index}`).value; // Get the remark value
  const button = document.getElementById(`submit-btn-${index}`);

  if (!dispatchDate) {
// Animate error
anime({
  targets: `#dispatch-${index}`,
  scale: [1, 1.05, 1],
  duration: 300,
  easing: 'easeInOutQuad'
});

// Show custom alert
showAlert("Please select a tentative dispatch date! 📅", "warning");
return;
  }

  const order = globalOrders[index];
  const originalHTML = button.innerHTML;

  // Animate button
  button.innerHTML = `
<div class="flex items-center justify-center space-x-2">
  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  <span>Launching...</span>
</div>
  `;
  button.disabled = true;

  const payload = {
timestamp: order.timestamp,
dispatchDate: dispatchDate,
remark: remark // Add remark to the payload
  };

  try {
const response = await fetch(POST_URL, {
  method: "POST",
  mode: "no-cors",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

setTimeout(() => {
  showSuccessModal();
  button.innerHTML = `
    <span class="flex items-center justify-center space-x-2">
      <span>🎉</span>
      <span>Launched Successfully!</span>
    </span>
  `;
  button.style.background = "linear-gradient(45deg, #10B981, #059669)";

  // Animate card out
  anime({
    targets: button.closest('.card-hover'),
    scale: 0.9,
    opacity: 0.7,
    duration: 500
  });

  setTimeout(() => fetchOrders(), 2000);
}, 1500);

  } catch (err) {
console.error('Submit error:', err);
button.innerHTML = originalHTML;
button.disabled = false;
showAlert("Launch failed! Please try again 🚀", "error");
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  const bgColor = type === 'error' ? 'from-red-500 to-red-600' : 'from-yellow-500 to-yellow-600';

  alertDiv.className = `fixed top-6 right-6 bg-gradient-to-r ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate__animated animate__bounceInRight`;
  alertDiv.innerHTML = `
<div class="flex items-center space-x-3">
  <span class="text-2xl">${type === 'error' ? '❌' : '⚠️'}</span>
  <span class="font-semibold">${message}</span>
</div>
  `;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
alertDiv.classList.remove('animate__bounceInRight');
alertDiv.classList.add('animate__bounceOutRight');
setTimeout(() => alertDiv.remove(), 500);
  }, 3000);
}

function showSuccessModal() {
  document.getElementById('successModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('successModal').classList.add('hidden');
}

  function openMultipleDocuments(urlString, index) {
  // Split the URLs by comma and trim whitespace
  const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);

  if (urls.length === 0) {
      alert('No valid URLs found');
      return;
  }

  // Show a confirmation if there are multiple URLs
  if (urls.length > 1) {
      const confirmed = confirm(`This will open ${urls.length} documents in separate tabs. Continue?`);
      if (!confirmed) {
          return;
      }
  }

  // Open each URL in a new tab with a small delay to prevent popup blocker
  urls.forEach((url, urlIndex) => {
      setTimeout(() => {
          window.open(url, '_blank');
      }, urlIndex * 100); // 100ms delay between each tab opening
  });
  }  

// Initialize everything
createParticles();
fetchOrders();

// Add some interactive cursor effects
document.addEventListener('mousemove', (e) => {
  const cursor = document.createElement('div');
  cursor.className = 'fixed w-2 h-2 bg-white bg-opacity-50 rounded-full pointer-events-none z-50';
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  document.body.appendChild(cursor);

  anime({
targets: cursor,
scale: [1, 0],
opacity: [1, 0],
duration: 1000,
easing: 'easeOutQuad',
complete: () => cursor.remove()
  });
});
