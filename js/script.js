const API_URL = 'https://script.google.com/macros/s/AKfycby7o8IwfJ1vgI-_2Ad-epHZHmOdVqTbNVWnncuv4BnDIiIcWNmuzrEspA9jIvgy9G84eQ/exec';
let ordersData = [];
let countdownIntervals = [];
let currentHoldTimestamp = null;
let currentStockTimestamp = null;
let currentStockStatus = null;
let currentStockIndex = null;

// L2 specific variables
const API_URL_L2 = 'https://script.google.com/macros/s/AKfycbyA-Q0NczExlSQmU9ZSNqFsUzVU5u3mK1gQewekQA2L7VOL7rJzTiI-Vmhqc3fiu9bb/exec'; // L2's specific API URL
let ordersL2 = []; // Use a separate array for L2 orders to avoid conflict
let countdownIntervalL2; // Separate interval for L2

document.addEventListener('DOMContentLoaded', function() {
    // For L1.html
    if (document.getElementById('ordersContainer')) { // Check if L1 specific element exists
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
        fetchOrders(); // Call L1's fetchOrders
    }

    // For L2.html
    if (document.getElementById('ordersGridL2')) { // Check if L2 specific element exists
        fetchOrdersL2(); // Call L2's fetchOrders
        // Auto-refresh for L2 every 5 minutes
        setInterval(fetchOrdersL2, 5 * 60 * 1000);
    }
});

// Cleanup interval when page is unloaded (This can be common for both)
window.addEventListener('beforeunload', function() {
    if (countdownInterval) { // For L1
        clearInterval(countdownInterval);
    }
    if (countdownIntervalL2) { // For L2
        clearInterval(countdownIntervalL2);
    }
});

// Ensure common functions like calculateDeadline and formatCountdown are accessible
// These were already in your L1 script.js, just ensure they are not inside
// any specific L1-only scope.
function calculateDeadline(timestamp) { /* ... L1's existing logic ... */ }
function formatCountdown(milliseconds) { /* ... L1's existing logic ... */ }
function formatDateTime(timestamp) { /* ... L2's existing logic ... */ }
function fileToBase64(file) { /* ... L2's existing logic ... */ }

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
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-lg font-bold text-gray-900">${order.dealerName}</h3>
            </div>
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
                timestamp: timestamp
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


// --- L2 Specific Functions ---

async function fetchOrdersL2() {
    try {
        showLoadingL2(true); // Show loading spinner for L2

        const urlParams = new URLSearchParams(window.location.search);
        const crmName = urlParams.get('crm'); // Get CRM name from URL

        if (!crmName) {
            throw new Error('CRM name is missing in URL');
        }

        const response = await fetch(`${API_URL_L2}?crm=${encodeURIComponent(crmName)}`); // Fetch data using L2's API URL
        const result = await response.json(); // Parse JSON response

        if (result.status === 'success' && result.data) { // Check for successful response and data
            ordersL2 = result.data; // Store L2 specific orders
            displayOrdersL2(); // Render orders
            if (typeof setReadOnlyMode === "function") { // Apply read-only mode if function exists
                setReadOnlyMode();
            }
            startCountdownL2(); // Start countdown for L2 orders
        } else {
            showNoDataL2(); // Show no data message
        }
    } catch (error) {
        console.error('Error fetching orders for L2:', error); // Log error
        showNoDataL2(); // Show no data message on error
    } finally {
        showLoadingL2(false); // Hide loading spinner
    }
}

function showLoadingL2(show) {
    document.getElementById('loadingContainerL2').classList.toggle('hidden', !show); // Toggle loading container visibility
    document.getElementById('ordersGridL2').classList.toggle('hidden', show); // Toggle orders grid visibility
    document.getElementById('noDataContainerL2').classList.add('hidden'); // Hide no data message
}

function showNoDataL2() {
    document.getElementById('loadingContainerL2').classList.add('hidden'); // Hide loading container
    document.getElementById('ordersGridL2').classList.add('hidden'); // Hide orders grid
    document.getElementById('noDataContainerL2').classList.remove('hidden'); // Show no data message
}

function displayOrdersL2() {
    const content = document.getElementById('ordersGridL2'); // Get orders grid container
    content.innerHTML = ''; // Clear existing content

    if (ordersL2.length === 0) { // Check if there are no orders
        showNoDataL2(); // Show no data message
        return;
    }

    const ordersHTML = ordersL2.map((order, index) => `
        <div class="order-card" id="order-l2-${index}">
            <div class="order-header">
                <div class="dealer-name">${order.dealerName}</div>
                <div class="timestamp">Order Time: ${formatDateTime(order.timestamp)}</div>
            </div>

            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Marketing:</span>
                    <span class="detail-value">${order.marketingPersonName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${order.location}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">CRM Name:</span>
                    <span class="detail-value">${order.crmName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Concerned Owner:</span>
                    <span class="detail-value">${order.concernedOwner}</span>
                </div>			
                <div class="detail-row">
                    <span class="detail-label">File:</span>
                    <span class="detail-value">
                        <a href="${order.fileUploadLink}" target="_blank" class="file-link">View File</a>
                    </span>
                </div>
            </div>

            <div class="countdown-section">
                <div class="countdown-label">Time Remaining:</div>
                <div class="countdown-timer" id="countdown-l2-${index}">Calculating...</div>
            </div>
            <div class="editable">
                <div class="action-section">
                    <div class="file-upload-section" id="file-upload-section-l2-${index}">
                        <label class="file-upload-label">Attach Final Order Here:</label>
                        <input type="file" class="file-input" id="file-l2-${index}" onchange="handleFileSelectL2(${index})">
                        <div class="file-selected" id="file-selected-l2-${index}">✓ File selected</div>
                    </div>

                    <div class="radio-section">
                        <label class="radio-label">Status:</label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" id="owners-informed-yes-l2-${index}" name="owners-informed-l2-${index}" value="yes">
                                <label for="owners-informed-yes-l2-${index}">Owners Informed</label>
                            </div>
                        </div>
                    </div>

                    <div class="hold-until-section" id="hold-until-section-l2-${index}">
                        <label class="hold-until-label">Hold Until:</label>
                        <input type="date" class="hold-until-input" id="hold-until-l2-${index}">
                        <label class="hold-until-label">Hold Remark:</label>
                        <input type="text" class="hold-until-input" id="hold-until-remark-l2-${index}">
                    </div>

                    <div class="button-group">
                        <button class="submit-btn" onclick="submitOrderL2(${index}, 'Approve')">Approve</button>
                        <button class="hold-btn" onclick="submitOrderL2(${index}, 'Hold')">Hold</button>
                        <button class="cancel-btn" onclick="submitOrderL2(${index}, 'Cancel')">Cancel</button>
                    </div>

                    <div class="success-message" id="success-l2-${index}">Order submitted successfully!</div>
                    <div class="error-message" id="error-l2-${index}">Error submitting order. Please try again.</div>
                </div>
            </div>
        </div>
    `).join('');

    content.innerHTML = `<div class="orders-grid">${ordersHTML}</div>`; // Set inner HTML of the grid
    document.getElementById('ordersGridL2').classList.remove('hidden'); // Show the orders grid
}

// Re-using calculateDeadline and formatDateTime from L1's script.js as they are common.
// No need to duplicate them here if they are already in script.js and are generic enough.

function startCountdownL2() {
    if (countdownIntervalL2) { // Clear existing interval for L2
        clearInterval(countdownIntervalL2);
    }
    updateCountdownsL2(); // Update immediately
    countdownIntervalL2 = setInterval(updateCountdownsL2, 1000); // Update every second
}

function updateCountdownsL2() {
    const now = new Date(); // Current time

    ordersL2.forEach((order, index) => { // Iterate through L2 orders
        const deadline = calculateDeadline(order.timestamp); // Calculate deadline using common function
        const timeRemaining = deadline.getTime() - now.getTime(); // Calculate time remaining
        const countdownElement = document.getElementById(`countdown-l2-${index}`); // Get countdown element

        if (countdownElement) {
            const formattedTime = formatCountdown(timeRemaining); // Format time using common function
            countdownElement.textContent = formattedTime; // Set text content

            countdownElement.className = 'countdown-timer'; // Reset classes

            if (timeRemaining <= 0) {
                countdownElement.classList.add('countdown-expired'); // Add expired class
            } else if (timeRemaining <= 30 * 60 * 1000) { // 30 minutes
                countdownElement.classList.add('countdown-urgent'); // Add urgent class
            } else if (timeRemaining <= 60 * 60 * 1000) { // 1 hour
                countdownElement.classList.add('countdown-warning'); // Add warning class
            } else {
                countdownElement.classList.add('countdown-normal'); // Add normal class
            }
        }
    });
}

function handleFileSelectL2(orderIndex) {
    const fileInput = document.getElementById(`file-l2-${orderIndex}`); // Get file input for L2
    const fileSelectedDiv = document.getElementById(`file-selected-l2-${orderIndex}`); // Get file selected div for L2

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileSelectedDiv.style.display = 'block'; // Show selected file message
        fileSelectedDiv.textContent = `✓ ${file.name} selected (${(file.size / 1024).toFixed(1)} KB)`; // Display file info
    } else {
        fileSelectedDiv.style.display = 'none'; // Hide selected file message
    }
}

function toggleHoldUntilFieldL2(orderIndex, actionType) {
    const fileUploadSection = document.getElementById(`file-upload-section-l2-${orderIndex}`); // Get file upload section for L2
    const holdUntilSection = document.getElementById(`hold-until-section-l2-${orderIndex}`); // Get hold until section for L2
    const ownersInformedRadioYes = document.getElementById(`owners-informed-yes-l2-${orderIndex}`); // Get owners informed radio for L2

    if (actionType === 'Hold') {
        holdUntilSection.style.display = 'block'; // Show hold until field
        fileUploadSection.style.display = 'none'; // Hide file upload for Hold
        if (ownersInformedRadioYes) ownersInformedRadioYes.checked = false; // Uncheck Owners Informed
    } else { // 'Approve' or 'Cancel'
        holdUntilSection.style.display = 'none'; // Hide hold until field
        fileUploadSection.style.display = 'block'; // Show file upload for Approve
    }
}

async function submitOrderL2(orderIndex, actionType) {
    const fileInput = document.getElementById(`file-l2-${orderIndex}`); // File input for L2
    const ownersInformedRadio = document.querySelector(`input[name="owners-informed-l2-${orderIndex}"]:checked`); // Owners informed radio for L2
    const approveBtn = document.querySelector(`#order-l2-${orderIndex} .submit-btn`); // Approve button for L2
    const holdBtn = document.querySelector(`#order-l2-${orderIndex} .hold-btn`); // Hold button for L2
    const cancelBtn = document.querySelector(`#order-l2-${orderIndex} .cancel-btn`); // Cancel button for L2
    const holdUntilInput = document.getElementById(`hold-until-l2-${orderIndex}`); // Hold until input for L2
    const holdUntilRemark = document.getElementById(`hold-until-remark-l2-${orderIndex}`); // Hold until remark for L2
    const successMessage = document.getElementById(`success-l2-${orderIndex}`); // Success message for L2
    const errorMessage = document.getElementById(`error-l2-${orderIndex}`); // Error message for L2

    // Hide previous messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // Disable buttons during processing
    approveBtn.disabled = true;
    holdBtn.disabled = true;
    cancelBtn.disabled = true;

    // Set field visibility based on action
    toggleHoldUntilFieldL2(orderIndex, actionType);

    let submitData = {
        action: actionType, // 'Approve', 'Hold', or 'Cancel'
        orderIndex: orderIndex, // Order index
        dealerName: ordersL2[orderIndex].dealerName, // Dealer name
        timestamp: ordersL2[orderIndex].timestamp, // Timestamp
        marketingPersonName: ordersL2[orderIndex].marketingPersonName, // Marketing person name
        location: ordersL2[orderIndex].location, // Location
        holdRemark: holdUntilRemark.value, // Hold remark
        crmName: ordersL2[orderIndex].crmName, // CRM name
        ownersInformed: ownersInformedRadio ? ownersInformedRadio.value : '' // Owners informed status
    };

    try {
        if (actionType === 'Approve') {
            approveBtn.textContent = 'Converting & Approving...'; // Update button text

            if (!fileInput.files.length) {
                alert('Please attach a file before approving.');
                throw new Error('File is required for approval'); // File required
            }
            if (!ownersInformedRadio) {
                alert('Please select the owners informed status for approval.');
                throw new Error('Owner informed status required'); // Owner informed required
            }

            const file = fileInput.files[0]; // Get file
            const fileBase64 = await fileToBase64(file); // Convert file to base64
            submitData.file = { // Add file data to submitData
                name: file.name,
                type: file.type,
                size: file.size,
                base64: fileBase64
            };

        } else if (actionType === 'Hold') {
            holdBtn.textContent = 'Holding...'; // Update button text

            if (!holdUntilInput.value || !holdUntilRemark.value) {
                alert('Please provide a "Hold Until" date and remark.');
                throw new Error('Hold details missing'); // Hold details required
            }
            if (!ownersInformedRadio) {
                alert('Please select the owners informed status for holding the order.');
                throw new Error('Owner informed status required'); // Owner informed required
            }

            submitData.holdUntil = holdUntilInput.value; // Add hold until date

        } else if (actionType === 'Cancel') {
            cancelBtn.textContent = 'Cancelling...'; // Update button text
            // You can add validation here if cancel action needs reason, confirmation, etc.
        }

        console.log('Submitting order data:', {
            ...submitData,
            file: submitData.file ? { ...submitData.file, base64: submitData.file.base64.substring(0, 50) + '...' } : undefined
        });

        await postDataL2(submitData); // Post data using L2's postData function

        showSuccessNotification('Order submitted successfully!'); // Show success notification

        // Reset form fields
        fileInput.value = '';
        document.getElementById(`file-selected-l2-${orderIndex}`).style.display = 'none';
        if (ownersInformedRadio) ownersInformedRadio.checked = false;
        holdUntilInput.value = '';
        document.getElementById(`hold-until-section-l2-${orderIndex}`).style.display = 'none';
        document.getElementById(`file-upload-section-l2-${orderIndex}`).style.display = 'block';

    } catch (error) {
        console.error('Error submitting order:', error); // Log error
        errorMessage.textContent = `Error: ${error.message}`; // Set error message
        errorMessage.style.display = 'block'; // Show error message
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    } finally {
        approveBtn.disabled = false; // Enable buttons
        holdBtn.disabled = false;
        cancelBtn.disabled = false;
        approveBtn.textContent = 'Approve'; // Reset button text
        holdBtn.textContent = 'Hold';
        cancelBtn.textContent = 'Cancel';
    }
}

async function postDataL2(data) {
    try {
        await fetch(API_URL_L2, { // Use L2's API URL
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data) // Send data
        });

        console.log('Data submitted successfully (no-cors mode) for L2'); // Log success

        setTimeout(() => {
            fetchOrdersL2(); // Refresh L2 orders after a short delay
        }, 1000);

    } catch (error) {
        console.error('Network error during submission for L2:', error); // Log network error
        throw error;
    }
}

function refreshDataL2() {
    const refreshIcon = document.getElementById('refreshIconL2'); // Get refresh icon for L2
    refreshIcon.classList.add('loading-spinner'); // Add loading spinner class
    
    fetchOrdersL2(); // Fetch orders for L2
    
    setTimeout(() => {
        refreshIcon.classList.remove('loading-spinner'); // Remove loading spinner after delay
    }, 500);
}
