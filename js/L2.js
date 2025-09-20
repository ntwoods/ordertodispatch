let orders = [];
let countdownInterval;

// Your API endpoint URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyA-Q0NczExlSQmU9ZSNqFsUzVU5u3mK1gQewekQA2L7VOL7rJzTiI-Vmhqc3fiu9bb/exec';

// Function to fetch orders from the API
async function fetchOrders() {
    try {
        document.getElementById('content').innerHTML = '<div class="loading">Loading orders...</div>';

        const urlParams = new URLSearchParams(window.location.search);
        const crmName = urlParams.get('crm');

        if (!crmName) {
            throw new Error('CRM name is missing in URL');
        }

        const response = await fetch(`${API_URL}?crm=${encodeURIComponent(crmName)}`);
        const result = await response.json();

        if (result.status === 'success') {
            orders = result.data;
            displayOrders();
                            if (typeof setReadOnlyMode === "function") {
                              setReadOnlyMode();
                            }           
            startCountdown();
        } else {
            throw new Error('Failed to fetch orders');
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        document.getElementById('content').innerHTML =
            '<div class="error">Error loading orders. Please check your API URL and try again.</div>';
    }
}

    // Function to display orders in cards
    function displayOrders() {
        const content = document.getElementById('content');

        if (orders.length === 0) {
            content.innerHTML = '<div class="loading">No orders found.</div>';
            return;
        }

        const ordersHTML = orders.map((order, index) => {
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

            return `
                <div class="order-card" id="order-${index}">
                    <div class="order-header">
                        <div class="flex items-center"> <div class="dealer-name">${order.dealerName}</div>
                            ${dealerTypeBadge} </div>
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
                        <div class="countdown-timer" id="countdown-${index}">Calculating...</div>
                    </div>
                    <div class="editable">
                    <div class="action-section">
                        <div class="file-upload-section" id="file-upload-section-${index}">
                            <label class="file-upload-label">Attach Final Order Here:</label>
                            <input type="file" class="file-input" id="file-${index}" onchange="handleFileSelect(${index})">
                            <div class="file-selected" id="file-selected-${index}">✓ File selected</div>
                        </div>

                        <div class="remark-section">
                            <label class="remark-label">Remark:</label>
                            <input type="text" class="remark-input" id="remark-${index}" placeholder="Enter remark here">
                        </div>
                        <div class="radio-section">
                            <label class="radio-label">Status:</label>
                            <div class="radio-group">
                                <div class="radio-option">
                                    <input type="radio" id="owners-informed-yes-${index}" name="owners-informed-${index}" value="yes">
                                    <label for="owners-informed-yes-${index}">Owners Informed</label>
                                </div>
                            </div>
                        </div>

                        <div class="hold-until-section" id="hold-until-section-${index}">
                            <label class="hold-until-label">Hold Until:</label>
                            <input type="date" class="hold-until-input" id="hold-until-${index}">
                            <label class="hold-until-label">Hold Remark:</label>
                            <input type="text" class="hold-until-input" id="hold-until-remark-${index}">
                        </div>

                        <div class="button-group">
                            <button class="submit-btn" onclick="submitOrder(${index}, 'Approve')">Approve</button>
                            <button class="hold-btn" onclick="submitOrder(${index}, 'Hold')">Hold</button>
                            <button class="cancel-btn" onclick="submitOrder(${index}, 'Cancel')">Cancel</button>
                        </div>

                        <div class="success-message" id="success-${index}">Order submitted successfully!</div>
                        <div class="error-message" id="error-${index}">Error submitting order. Please try again.</div>
                    </div>
                    </div>
                </div>
            `;
        }).join('');

        content.innerHTML = `<div class="orders-grid">${ordersHTML}</div>`;
    }
    // Function to calculate deadline based on business rules
    function calculateDeadline(timestamp) {
        const orderTime = new Date(timestamp);
        const hour = orderTime.getHours();

        let deadline;

        if (hour >= 17) {
            // After 5 PM, deadline is next business day at 10 AM
            deadline = getNextBusinessDay(orderTime);
            deadline.setHours(10, 0, 0, 0);
        } else {
            // Before 5 PM, deadline is same day + 1 hour
            deadline = new Date(orderTime.getTime() + (60 * 60 * 1000));
        }

        return deadline;
    }

    // Function to get next business day (skipping weekends)
    function getNextBusinessDay(date) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        // If it's Saturday (6) or Sunday (0), move to Monday
        while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
            nextDay.setDate(nextDay.getDate() + 1);
        }

        return nextDay;
    }

    // Function to format date and time
    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    // Function to format countdown display
    function formatCountdown(milliseconds) {
        if (milliseconds <= 0) {
            return 'OVERDUE';
        }

        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Function to update countdown timers
    function updateCountdowns() {
        const now = new Date();

        orders.forEach((order, index) => {
            const deadline = calculateDeadline(order.timestamp);
            const timeRemaining = deadline.getTime() - now.getTime();
            const countdownElement = document.getElementById(`countdown-${index}`);

            if (countdownElement) {
                const formattedTime = formatCountdown(timeRemaining);
                countdownElement.textContent = formattedTime;

                // Apply styling based on time remaining
                countdownElement.className = 'countdown-timer';

                if (timeRemaining <= 0) {
                    countdownElement.classList.add('countdown-expired');
                } else if (timeRemaining <= 30 * 60 * 1000) { // 30 minutes
                    countdownElement.classList.add('countdown-urgent');
                } else if (timeRemaining <= 60 * 60 * 1000) { // 1 hour
                    countdownElement.classList.add('countdown-warning');
                } else {
                    countdownElement.classList.add('countdown-normal');
                }
            }
        });
    }

    // Function to start countdown timer
    function startCountdown() {
        // Clear existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        // Update immediately
        updateCountdowns();

        // Update every second
        countdownInterval = setInterval(updateCountdowns, 1000);
    }

    // Function to convert file to base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove the data:*/*;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Function to handle file selection
    function handleFileSelect(orderIndex) {
        const fileInput = document.getElementById(`file-${orderIndex}`);
        const fileSelectedDiv = document.getElementById(`file-selected-${orderIndex}`);

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileSelectedDiv.style.display = 'block';
            fileSelectedDiv.textContent = `✓ ${file.name} selected (${(file.size / 1024).toFixed(1)} KB)`;
        } else {
            fileSelectedDiv.style.display = 'none';
        }
    }

    // Function to toggle the visibility of the "Hold Until" date field and file input mandate
    function toggleHoldUntilField(orderIndex, actionType) {
        const fileUploadSection = document.getElementById(`file-upload-section-${orderIndex}`);
        const holdUntilSection = document.getElementById(`hold-until-section-${orderIndex}`);
        const ownersInformedRadioYes = document.getElementById(`owners-informed-yes-${orderIndex}`);
        const remarkSection = document.querySelector(`#order-${orderIndex} .remark-section`); // Get the remark section

        if (actionType === 'Hold') {
            holdUntilSection.style.display = 'block'; // Show hold until field
            fileUploadSection.style.display = 'none'; // Hide file upload for Hold
            if (ownersInformedRadioYes) ownersInformedRadioYes.checked = false; // Uncheck Owners Informed
            if (remarkSection) remarkSection.style.display = 'none'; // Hide remark for Hold
        } else { // 'Approve' or 'Cancel'
            holdUntilSection.style.display = 'none'; // Hide hold until field
            fileUploadSection.style.display = 'block'; // Show file upload for Approve/Cancel
            if (remarkSection) remarkSection.style.display = 'block'; // Show remark for Approve/Cancel
        }
    }

    // Function to submit order data (Approve or Hold)
async function submitOrder(orderIndex, actionType) {
const fileInput = document.getElementById(`file-${orderIndex}`);
const ownersInformedRadio = document.querySelector(`input[name="owners-informed-${orderIndex}"]:checked`);
const approveBtn = document.querySelector(`#order-${orderIndex} .submit-btn`);
const holdBtn = document.querySelector(`#order-${orderIndex} .hold-btn`);
const cancelBtn = document.querySelector(`#order-${orderIndex} .cancel-btn`);
const holdUntilInput = document.getElementById(`hold-until-${orderIndex}`);
const holdUntilRemark = document.getElementById(`hold-until-remark-${orderIndex}`);
const remarkInput = document.getElementById(`remark-${orderIndex}`); // Get the new remark input
const successMessage = document.getElementById(`success-${orderIndex}`);
const errorMessage = document.getElementById(`error-${orderIndex}`);

// Hide previous messages
successMessage.style.display = 'none';
errorMessage.style.display = 'none';

// Disable buttons during processing
approveBtn.disabled = true;
holdBtn.disabled = true;
cancelBtn.disabled = true;

// Set field visibility based on action
toggleHoldUntilField(orderIndex, actionType);

let submitData = {
    action: actionType, // 'Approve', 'Hold', or 'Cancel'
    orderIndex: orderIndex,
    dealerName: orders[orderIndex].dealerName,
    timestamp: orders[orderIndex].timestamp,
    marketingPersonName: orders[orderIndex].marketingPersonName,
    location: orders[orderIndex].location,
    holdRemark: holdUntilRemark.value,
    remark: remarkInput.value, // Add the new remark to the payload
    crmName: orders[orderIndex].crmName,
    ownersInformed: ownersInformedRadio ? ownersInformedRadio.value : ''
};

try {
    if (actionType === 'Approve') {
        approveBtn.textContent = 'Converting & Approving...';

        if (!fileInput.files.length) {
            alert('Please attach a file before approving.');
            throw new Error('File is required for approval');
        }
        if (!ownersInformedRadio) {
            alert('Please select the owners informed status for approval.');
            throw new Error('Owner informed status required');
        }
        if (!remarkInput.value.trim()) { // Validate the new remark field
            alert('Please provide a remark for approval.');
            throw new Error('Remark is required for approval');
        }

        const file = fileInput.files[0];
        const fileBase64 = await fileToBase64(file);
        submitData.file = {
            name: file.name,
            type: file.type,
            size: file.size,
            base64: fileBase64
        };

    } else if (actionType === 'Hold') {
        holdBtn.textContent = 'Holding...';

        if (!holdUntilInput.value || !holdUntilRemark.value) {
            alert('Please provide a "Hold Until" date and remark.');
            throw new Error('Hold details missing');
        }
        if (!ownersInformedRadio) {
            alert('Please select the owners informed status for holding the order.');
            throw new Error('Owner informed status required');
        }

        submitData.holdUntil = holdUntilInput.value;

    } else if (actionType === 'Cancel') {
        cancelBtn.textContent = 'Cancelling...';
        if (!remarkInput.value.trim()) { // Validate the new remark field for cancel
            alert('Please provide a remark for cancellation.');
            throw new Error('Remark is required for cancellation');
        }
    }

    console.log('Submitting order data:', {
        ...submitData,
        file: submitData.file ? { ...submitData.file, base64: submitData.file.base64.substring(0, 50) + '...' } : undefined
    });

    await postData(submitData);

    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 5000);

    // Reset form fields
    fileInput.value = '';
    document.getElementById(`file-selected-${orderIndex}`).style.display = 'none';
    if (ownersInformedRadio) ownersInformedRadio.checked = false;
    holdUntilInput.value = '';
    holdUntilRemark.value = ''; // Clear hold remark
    remarkInput.value = ''; // Clear the new remark field
    document.getElementById(`hold-until-section-${orderIndex}`).style.display = 'none';
    document.getElementById(`file-upload-section-${orderIndex}`).style.display = 'block';
    document.querySelector(`#order-${orderIndex} .remark-section`).style.display = 'block';


} catch (error) {
    console.error('Error submitting order:', error);
    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
} finally {
    approveBtn.disabled = false;
    holdBtn.disabled = false;
    cancelBtn.disabled = false;
    approveBtn.textContent = 'Approve';
    holdBtn.textContent = 'Hold';
    cancelBtn.textContent = 'Cancel';
}
}


    // Function to post data in no-cors mode (assume success, ignore response)
    async function postData(data) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            // Since we're using no-cors, we can't read the response
            // So we assume success and refresh the orders
            console.log('Data submitted successfully (no-cors mode)');

            // Refresh orders after a short delay to see updated data
            setTimeout(() => {
                fetchOrders();
            }, 1000);

        } catch (error) {
            // Only network-level errors will be caught here
            console.error('Network error during submission:', error);
            throw error;
        }
    }

    // Initialize the application
    document.addEventListener('DOMContentLoaded', function() {
        fetchOrders();

        // Auto-refresh every 5 minutes
        setInterval(fetchOrders, 5 * 60 * 1000);
    });

    // Cleanup interval when page is unloaded
    window.addEventListener('beforeunload', function() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
    });

