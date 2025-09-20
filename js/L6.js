const API_URL = 'https://script.google.com/macros/s/AKfycbyJ1CdfyAhTOhvxCYrE16rBYAfdVlrYpBLHMJj1UBB_xJvdcrUE3RBwNC9TDNMJpaZlWg/exec';
let ordersData = [];
let completedToday = 0;
let countdownIntervals = {};

// Get CRM name from URL parameters
function getCrmFromUrl() {
const urlParams = new URLSearchParams(window.location.search);
return urlParams.get('crm');
}

// Format timestamp for display
function formatTimestamp(isoString) {
const date = new Date(isoString);
return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
}

let orderCounter = 0; // This resets every time page reloads

function generateOrderId() {
orderCounter++;
return `Order-${orderCounter}`;
}

// Calculate deadline (6 PM on the expected delivery date)
function calculateDeadline(expectedDeliveryDate) {
const deliveryDate = new Date(expectedDeliveryDate);
const deadline = new Date(deliveryDate);
deadline.setHours(18, 0, 0, 0); // Set to 6:00 PM
return deadline;
}

// Format countdown display
function formatCountdown(timeDiff) {
if (timeDiff <= 0) {
    return "OVERDUE";
}

const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const minutes = Math.floor((timeDiff % (1000 * 60)) / (1000 * 60));
const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
} else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
} else {
    return `${minutes}m ${seconds}s`;
}
}

// Update countdown for a specific order
function updateCountdown(orderId, deadline, countdownElement, statusElement, cardElement) {
const now = new Date().getTime();
const timeDiff = deadline.getTime() - now;

const countdownText = formatCountdown(timeDiff);
countdownElement.querySelector('.countdown-timer').textContent = countdownText;

if (timeDiff <= 0) {
    // Order is overdue
    countdownElement.classList.add('overdue');
    statusElement.textContent = 'Overdue';
    statusElement.classList.add('overdue');
    cardElement.classList.add('overdue');

    // Clear the interval for this order
    if (countdownIntervals[orderId]) {
        clearInterval(countdownIntervals[orderId]);
        delete countdownIntervals[orderId];
    }
} else if (timeDiff <= 2 * 60 * 60 * 1000) { // Less than 2 hours
    countdownElement.classList.add('warning');
}
}

// Start countdown timer for an order
function startCountdown(orderId, expectedDeliveryDate, countdownElement, statusElement, cardElement) {
const deadline = calculateDeadline(expectedDeliveryDate);

// Update immediately
updateCountdown(orderId, deadline, countdownElement, statusElement, cardElement);

// Update every second
countdownIntervals[orderId] = setInterval(() => {
    updateCountdown(orderId, deadline, countdownElement, statusElement, cardElement);
}, 1000);
}

// Show success message
function showSuccess(message) {
const successDiv = document.getElementById('successDiv');
successDiv.textContent = message;
successDiv.classList.add('show');
setTimeout(() => {
    successDiv.classList.remove('show');
}, 3000);
}

// Mark order as received
async function markAsReceived(timestampForMap, orderElement) {
const button = orderElement.querySelector('.btn-primary');
const originalText = button.innerHTML;

button.disabled = true;
button.innerHTML = '<span class="btn-icon">⏳</span>Processing...';

try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `timestampForMap=${encodeURIComponent(timestampForMap)}`
    });

    const result = await response.json();

    if (result.status === 'success') {
        // Clear countdown interval for this order
        const orderId = orderElement.querySelector('.order-id').textContent;
        if (countdownIntervals[orderId]) {
            clearInterval(countdownIntervals[orderId]);
            delete countdownIntervals[orderId];
        }

        orderElement.style.transition = 'all 0.5s ease';
        orderElement.style.opacity = '0.5';
        orderElement.style.transform = 'scale(0.95)';

        setTimeout(() => {
            orderElement.remove();
            completedToday++;
            // No updateStats call needed here as totalOrders/overdueOrders removed.

            if (document.querySelectorAll('.order-card').length === 0) {
                showEmptyState();
            }
        }, 500);

        showSuccess('✅ Order marked as received successfully!');
    } else {
        throw new Error(result.message || 'Failed to update order');
    }
} catch (error) {
    console.error('Error:', error);
    button.disabled = false;
    button.innerHTML = originalText;
    showError('Failed to mark order as received. Please try again.');
}
}

// Create order card HTML
function createOrderCard(order, index) {
const orderId = generateOrderId();
const deadline = calculateDeadline(order.expectedDeliveryDate);
const orderCard = document.createElement('div');
orderCard.className = 'order-card';
orderCard.style.animationDelay = `${index * 0.1}s`;

// Dealer Type Badge HTML Logic
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
        <div class="dealer-type-badge ${badgeColorClass}">
            ${order.dealerType}
        </div>
    `;
}

orderCard.innerHTML = `
    <div class="order-header">
        <div class="order-id">${orderId}</div>
        <div class="order-status">Pending</div>
    </div>
    <div class="countdown-container">
        <div class="countdown-label">⏰ Time to Deadline</div>
        <div class="countdown-timer">Calculating...</div>
        <div class="countdown-deadline">Deadline: ${deadline.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })}</div>
    </div>
    <div class="order-details">
        <div class="detail-row">
            <div class="detail-label">👤 Dealer:</div>
            <div class="detail-value dealer-name">${order.dealerName} ${dealerTypeBadge}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">🏢 Marketing:</div>
            <div class="detail-value">${order.marketingPersonName}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">📍 Location:</div>
            <div class="detail-value location">${order.location}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">📦 Expected:</div>
            <div class="detail-value">
                <div class="timestamp">${formatTimestamp(order.expectedDeliveryDate)}</div>
            </div>
        </div>
    <span class="text-m text-black-600">Final Order:</span>
    <button onclick="openMultipleDocuments('${order.finalOrder.replace(/'/g, "\\'")}', ${index})" class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">Final Order File</button>
    <span class="text-m text-black-600">Dispatch Details:</span>
    <button onclick="openMultipleDocuments('${order.dispatchDetails.replace(/'/g, "\\'")}', ${index})" class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">Dispatch Details</button>
    <span class="text-m text-black-600">Invoice:</span>
    <button onclick="openMultipleDocuments('${order.invoiceURL.replace(/'/g, "\\'")}', ${index})" class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">View Invoice</button>                

    ${order.rawOrder ? `
      <span class="text-m text-red-600">Raw Order:</span>
      <button onclick="openMultipleDocuments('${order.rawOrder.replace(/'/g, "\\'")}', ${index})" 
              class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">
        Click for Raw
      </button>
    ` : ''}

    ${order.additionalOrder ? `
      <span class="text-m text-red-600">Additional Order:</span>
      <button onclick="openMultipleDocuments('${order.additionalOrder.replace(/'/g, "\\'")}', ${index})" 
              class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">
        Additional Order File
      </button>
    ` : ''}                
    </div>

    <div class="editable">
    <div class="order-actions">
        <button class="btn btn-primary" onclick="markAsReceived('${order.timestampForMap}', this.closest('.order-card'))">
            <span class="btn-icon">✅</span>Mark as Received
        </button>
    </div>
    </div>
`;

// Start countdown after the card is added to DOM
setTimeout(() => {
    const countdownElement = orderCard.querySelector('.countdown-container');
    const statusElement = orderCard.querySelector('.order-status');
    startCountdown(orderId, order.expectedDeliveryDate, countdownElement, statusElement, orderCard);
}, 100);

return orderCard;
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

// Removed updateStats function as stats are removed from UI
/*
function updateStats() {
const totalOrders = document.querySelectorAll('.order-card').length;
const overdueOrders = document.querySelectorAll('.order-card.overdue').length;

document.getElementById('totalOrders').textContent = totalOrders;
document.getElementById('completedToday').textContent = completedToday;
document.getElementById('overdueOrders').textContent = overdueOrders;
}
*/

// Show error message
function showError(message) {
const errorDiv = document.getElementById('errorDiv');
errorDiv.textContent = message;
errorDiv.style.display = 'block';
document.getElementById('loadingDiv').style.display = 'none';
}

// Show empty state
function showEmptyState() {
document.getElementById('ordersContainer').style.display = 'none';
document.getElementById('emptyState').style.display = 'block';
}

// Fetch and display orders
async function fetchOrders() {
const crmName = getCrmFromUrl();

if (!crmName) {
    showError('❌ CRM name not found in URL. Please check the URL parameters.');
    return;
}

document.getElementById('crmName').textContent = `Welcome, ${decodeURIComponent(crmName)}`;

try {
    const response = await fetch(`${API_URL}?crm=${encodeURIComponent(crmName)}`);
    const result = await response.json();

    document.getElementById('loadingDiv').style.display = 'none';

    if (result.status === 'success') {
        ordersData = result.data;

        if (ordersData.length === 0) {
            showEmptyState();
        } else {
            const container = document.getElementById('ordersContainer');
            container.style.display = 'grid';

            ordersData.forEach((order, index) => {
                const orderCard = createOrderCard(order, index);
                container.appendChild(orderCard);
            if (typeof setReadOnlyMode === "function") {
              setReadOnlyMode();
            }
            });

            // Removed call to updateStats
            // setTimeout(updateStats, 200);

            // Removed interval for updateStats
            // setInterval(updateStats, 30000);
        }
    } else {
        showError('❌ Failed to fetch orders. Please try again later.');
    }
} catch (error) {
    console.error('Error fetching orders:', error);
    showError('❌ Network error. Please check your connection and try again.');
}
}

// Initialize the application
document.addEventListener('DOMContentLoaded', fetchOrders);

// Clean up intervals when page is about to unload
window.addEventListener('beforeunload', () => {
Object.values(countdownIntervals).forEach(interval => {
    clearInterval(interval);
});
});
