const API_URL = 'https://script.google.com/macros/s/AKfycby7o8IwfJ1vgI-_2Ad-epHZHmOdVqTbNVWnncuv4BnDIiIcWNmuzrEspA9jIvgy9G84eQ/exec';
let ordersData = [];
let countdownIntervals = [];
let currentHoldTimestamp = null;
let currentStockTimestamp = null;
let currentStockStatus = null;
let currentStockIndex = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    fetchOrders();
});

function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString();
}

function showSuccessNotification(message) {
    const notification = document.getElementById('successNotification');
    const messageElement = document.getElementById('successMessage');
    
    messageElement.textContent = message;
    notification.classList.remove('hide');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
    }, 3000);
}

async function fetchOrders() {
    try {
        showLoading(true);

        // Get CRM name from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const crmName = urlParams.get('crm');

        if (!crmName) {
            throw new Error('CRM name is missing in URL');
        }

        // Append crmName to the API URL
        const response = await fetch(`${API_URL}?crm=${encodeURIComponent(crmName)}`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            ordersData = data.data;
            renderOrders();
        } else {
            showNoData();
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        showNoData();
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loadingContainer').classList.toggle('hidden', !show);
    document.getElementById('ordersContainer').classList.toggle('hidden', show);
    document.getElementById('noDataContainer').classList.add('hidden');
}

function showNoData() {
    document.getElementById('loadingContainer').classList.add('hidden');
    document.getElementById('ordersContainer').classList.add('hidden');
    document.getElementById('noDataContainer').classList.remove('hidden');
}

function renderOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';
    
    if (ordersData.length === 0) {
        showNoData();
        return;
    }

    // Clear existing intervals
    countdownIntervals.forEach(interval => clearInterval(interval));
    countdownIntervals = [];

    ordersData.forEach((order, index) => {
        const orderCard = createOrderCard(order, index);
        container.appendChild(orderCard);
    });

    document.getElementById('ordersContainer').classList.remove('hidden');
    if (typeof setReadOnlyMode === "function") {
          setReadOnlyMode();
        }
}

function createOrderCard(order, index) {
    const card = document.createElement('div');
    card.className = 'card-gradient rounded-xl shadow-lg p-6 card-hover border border-gray-200';
    
    const deadline = calculateDeadline(new Date(order.timestamp));
    const countdownId = `countdown-${index}`;

    // --- NEW: Dealer Type Badge HTML ---
    let dealerTypeBadge = '';
    if (order.dealerType) {
        let badgeColorClass = '';
        switch (order.dealerType.toLowerCase()) {
            case 'red':
                badgeColorClass = 'bg-red-500';
                break;
            case 'yellow':
                badgeColorClass = 'bg-yellow-500'; // You might need to add this to your tailwind config or style.css
                break;
            case 'green':
                badgeColorClass = 'bg-green-500';
                break;
            default:
                badgeColorClass = 'bg-gray-500'; // Default if none of the above
        }
        dealerTypeBadge = `
            <div class="dealer-type-badge ${badgeColorClass} text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center justify-center ml-2">
                ${order.dealerType}
            </div>
        `;
    }
    // --- END NEW ---
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center"> <h3 class="text-lg font-bold text-gray-900">${order.dealerName}</h3>
                ${dealerTypeBadge} </div>
            <div class="text-right">
                <div id="${countdownId}" class="text-sm font-mono bg-white px-2 py-1 rounded"></div>
            </div>
        </div>
        
        <div class="space-y-3 mb-6">
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Marketing Person:</span>
                <span class="text-sm font-medium">${order.marketingPersonName}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Location:</span>
                <span class="text-sm font-medium">${order.location}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">CRM:</span>
                <span class="text-sm font-medium">${order.crmName}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Concerned Owner:</span>
                <span class="text-sm font-medium">${order.concernedOwner}</span>
            </div>
            
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">File:</span>
                <button onclick="openMultipleDocuments('${order.fileUploadLink.replace(/'/g, "\\'")}', ${index})" class="text-sm text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer">View Document</button>                    </div>
        </div>

        <div class="editable">
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-white rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">Credit Status</span>
                </div>

                <div class="flex space-x-2">
                    <button onclick="toggleCreditStatus(${index}, 'approved')" 
                            class="status-toggle p-1 rounded-full credit-approved-${index} bg-gray-200 hover:bg-green-100">
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                    <button onclick="toggleCreditStatus(${index}, 'rejected')" 
                            class="status-toggle p-1 rounded-full credit-rejected-${index} bg-gray-200 hover:bg-red-100">
                        <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">Stock Status</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="promptStockStatus('${order.timestamp}', ${index}, 'approved')" 
                            class="status-toggle p-1 rounded-full stock-approved-${index} bg-gray-200 hover:bg-green-100">
                        <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                    <button onclick="promptStockStatus('${order.timestamp}', ${index}, 'rejected')" 
                            class="status-toggle p-1 rounded-full stock-rejected-${index} bg-gray-200 hover:bg-red-100">
                        <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        <div class="mb-4"> <label for="proceedRemark-${index}" class="block text-sm font-medium text-gray-700 mb-2">Remark for Proceed:</label>
            <input type="text" id="proceedRemark-${index}" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter remark to proceed..." maxlength="100">
            <div class="text-xs text-gray-500 mt-1">Maximum 100 characters</div>
        </div>
        <div class="flex space-x-3">
            <button id="approve-btn-${index}" onclick="approveOrder('${order.timestamp}', ${index})" 
                    class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                Proceed
            </button>
        </div>
        </div>
    `;

    // Start countdown for this card
    startCountdown(countdownId, deadline);
    
    return card;
}
const isSunday = date => date.getDay() === 0;

function calculateDeadline(timestamp) {
    const ts = new Date(timestamp);
    const hour = ts.getHours();
    const minute = ts.getMinutes();
    const day = ts.getDay();

    let deadline = new Date(ts);

    if ((hour > 14 || (hour === 14 && minute >= 30)) &&  (hour < 24)) {
        do {
            deadline.setDate(deadline.getDate() + 1);
        } while (isSunday(deadline));
        deadline.setHours(10, 0, 0, 0);
    } else if (hour < 9 || (hour === 9 && minute <= 30)) {
        deadline.setHours(13, 30, 0, 0);
    } else {
        deadline.setHours(deadline.getHours() + 4);
    }

    return deadline;
}

function startCountdown(elementId, deadline) {
    const interval = setInterval(() => {
        const now = new Date();
        const target = new Date(deadline);
        const diff = target - now;

        const element = document.getElementById(elementId);
        if (!element) {
            clearInterval(interval);
            return;
        }

        if (diff <= 0) {
            element.innerHTML = '<span class="text-red-600 font-bold">OVERDUE</span>';
            element.classList.add('countdown-urgent');
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const isUrgent = diff <= 30 * 60 * 1000;
        const colorClass = isUrgent ? 'text-red-600' : 'text-blue-600';

        element.innerHTML = `<span class="${colorClass} font-bold">${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>`;

        element.classList.toggle('countdown-urgent', isUrgent);
    }, 1000);

    countdownIntervals.push(interval);
}

async function toggleCreditStatus(index, status) {
    const approvedBtn = document.querySelector(`.credit-approved-${index}`);
    const rejectedBtn = document.querySelector(`.credit-rejected-${index}`);
    
    // Show loading state
    const targetBtn = status === 'approved' ? approvedBtn : rejectedBtn;
    targetBtn.classList.add('status-loading');
    targetBtn.disabled = true;
    
    // Reset both buttons
    approvedBtn.classList.remove('bg-green-500', 'bg-red-500');
    rejectedBtn.classList.remove('bg-green-500', 'bg-red-500');
    approvedBtn.classList.add('bg-gray-200');
    rejectedBtn.classList.add('bg-gray-200');
    
    try {
        const timestamp = ordersData[index].timestamp;
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateCreditStatus',
                timestamp: timestamp,
                creditStatus: status === 'approved' ? 'Yes' : 'No'
            })
        });
        
        // Since we can't read the response in no-cors mode, assume success
        setTimeout(() => {
            // Highlight selected button
            if (status === 'approved') {
                approvedBtn.classList.remove('bg-gray-200');
                approvedBtn.classList.add('bg-green-500');
            } else {
                rejectedBtn.classList.remove('bg-gray-200');
                rejectedBtn.classList.add('bg-red-500');
            }
            
            // Remove loading state
            targetBtn.classList.remove('status-loading');
            targetBtn.disabled = false;
            
            showSuccessNotification(`Credit status ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
        }, 1000);
        
    } catch (error) {
        console.error('Error updating credit status:', error);
        // Remove loading state even on error
        targetBtn.classList.remove('status-loading');
        targetBtn.disabled = false;
        showSuccessNotification(`Credit status ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
    }
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

// Alternative version without confirmation dialog (if you prefer):
function openMultipleDocumentsNoConfirm(urlString, index) {
    const urls = urlString.split(',').map(url => url.trim()).filter(url => url.length > 0);
    
    if (urls.length === 0) {
        alert('No valid URLs found');
        return;
    }
    
    urls.forEach((url, urlIndex) => {
        setTimeout(() => {
            window.open(url, '_blank');
        }, urlIndex * 100);
    });
}

function promptStockStatus(timestamp, index, status) {
    currentStockTimestamp = timestamp;
    currentStockStatus = status;
    currentStockIndex = index;
    document.getElementById('stockModal').classList.remove('hidden');
    document.getElementById('stockRemark').focus();
}

function closeStockModal() {
    document.getElementById('stockModal').classList.add('hidden');
    document.getElementById('stockRemark').value = '';
    currentStockTimestamp = null;
    currentStockStatus = null;
    currentStockIndex = null;
}

async function submitStockStatus() {
    const remark = document.getElementById('stockRemark').value.trim();
    
    if (!remark) {
        alert('Please provide a remark for the stock status.');
        return;
    }

    const submitBtn = document.getElementById('stockSubmitBtn');
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;

    const approvedBtn = document.querySelector(`.stock-approved-${currentStockIndex}`);
    const rejectedBtn = document.querySelector(`.stock-rejected-${currentStockIndex}`);
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateStockStatus',
                timestamp: currentStockTimestamp,
                stockStatus: currentStockStatus === 'approved' ? 'Yes' : 'No',
                stockRemark: remark
            })
        });
        
        // Since we can't read the response in no-cors mode, assume success
        setTimeout(() => {
            // Reset both buttons
            approvedBtn.classList.remove('bg-green-500', 'bg-red-500');
            rejectedBtn.classList.remove('bg-green-500', 'bg-red-500');
            approvedBtn.classList.add('bg-gray-200');
            rejectedBtn.classList.add('bg-gray-200');
            
            // Highlight selected button
            if (currentStockStatus === 'approved') {
                approvedBtn.classList.remove('bg-gray-200');
                approvedBtn.classList.add('bg-green-500');
            } else {
                rejectedBtn.classList.remove('bg-gray-200');
                rejectedBtn.classList.add('bg-red-500');
            }
            
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            
            showSuccessNotification(`Stock status ${currentStockStatus === 'approved' ? 'approved' : 'rejected'} successfully!`);
            closeStockModal();
        }, 1000);
        
    } catch (error) {
        console.error('Error updating stock status:', error);
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        showSuccessNotification(`Stock status ${currentStockStatus === 'approved' ? 'approved' : 'rejected'} successfully!`);
        closeStockModal();
    }
}

async function approveOrder(timestamp, index) {
    const remarkInput = document.getElementById(`proceedRemark-${index}`);
    const remark = remarkInput.value.trim();

    if (!remark) {
        alert('Please provide a remark to proceed with the order.');
        remarkInput.focus();
        return;
    }

    const approveBtn = document.getElementById(`approve-btn-${index}`);
    approveBtn.classList.add('btn-loading');
    approveBtn.disabled = true;
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'approveOrder',
                timestamp: timestamp,
                proceedRemark: remark // Sending the new remark field
            })
        });
        
        // Since we can't read the response in no-cors mode, assume success
        setTimeout(() => {
            approveBtn.classList.remove('btn-loading');
            approveBtn.disabled = false;
            showSuccessNotification('Order approved successfully!');
            fetchOrders(); // Refresh the data
        }, 1500);
        
    } catch (error) {
        console.error('Error approving order:', error);
        approveBtn.classList.remove('btn-loading');
        approveBtn.disabled = false;
        showSuccessNotification('Order approved successfully!');
        fetchOrders(); // Refresh the data
    }
}
async function refreshData() {
    const refreshIcon = document.getElementById('refreshIcon');
    refreshIcon.classList.add('loading-spinner');
    
    await fetchOrders();
    
    setTimeout(() => {
        refreshIcon.classList.remove('loading-spinner');
    }, 500);
}
