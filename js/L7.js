// JavaScript Functionality
const BASE_API_URL = "https://script.google.com/macros/s/AKfycbx8Ourjem3diO9CTDl_wdGuJXSksFUImwIvq2gB1tFjeOUdNkLDdUso8he0-6CTlSJc/exec";

const orderCardsContainer = document.getElementById('order-cards-container');
const loadingIndicator = document.getElementById('loading');

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        // Ensure date string is robustly parsed for both formats
        let date;
        if (dateString.includes('T')) { // ISO 8601 format (e.g., "2025-06-07T05:19:35.000Z")
            date = new Date(dateString);
        } else { // Assume DD/MM/YYYY or YYYY/MM/DD
            const parts = dateString.split(/[\/\-]/);
            if (parts.length === 3) {
                 // Try YYYY-MM-DD or YYYY/MM/DD first
                date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                if (isNaN(date.getTime())) {
                    // If YYYY-MM-DD fails, try DD-MM-YYYY
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            } else {
                date = new Date(dateString); // Fallback for other formats
            }
        }

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'N/A';
    }
}

// Function to start countdown timer
function startCountdown(deadlineDateString, countdownElement) {
    // Parse the date string and set time to 18:00:00 (6 PM)
    const deadline = new Date(deadlineDateString);
    deadline.setHours(18, 0, 0, 0); // Set deadline to 6 PM IST (Local Time)

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = deadline - now;

        if (distance < 0) {
            countdownElement.innerHTML = "OVERDUE";
            countdownElement.classList.add('overdue');
            clearInterval(countdownElement.timerInterval); // Stop the interval
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s left`;
    };

    // Initial call to display immediately
    updateCountdown();
    // Set interval to update every second
    countdownElement.timerInterval = setInterval(updateCountdown, 1000);
}

// Function to handle "Approve" button click
async function handleApprove(timestamp) {
    if (!confirm(`Are you sure you want to approve the order marked hold on ${formatDate(timestamp)}?`)) {
        return;
    }

    console.log("Approving order with timestamp:", timestamp);

    try {
        // Ensure API_URL for POST also includes the CRM parameter if needed by script
        const crmName = getCrmNameFromUrl();
        let postApiUrl = BASE_API_URL;
        if (crmName) {
            postApiUrl += `?crm=${encodeURIComponent(crmName)}`;
        }

        const response = await fetch(postApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'approveOrder', // A hypothetical action for your Google Script
                timestamp: timestamp
            }).toString(),
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert('Order approved successfully!');
            // Re-fetch data to reflect changes
            fetchData();
        } else {
            alert('Error approving order: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error during approval:', error);
        alert('Failed to connect to the server for approval.');
    }
}

// Function to get CRM name from URL
function getCrmNameFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('crm'); // Returns the value of the 'crm' parameter
}

// Function to render order cards
function renderOrderCards(orders) {
    orderCardsContainer.innerHTML = ''; // Clear previous cards
    if (orders.length === 0) {
        orderCardsContainer.innerHTML = '<p style="text-align: center; color: var(--secondary-color);">No hold orders found for this CRM or data is unavailable.</p>';
        return;
    }

    orders.forEach((order, index) => { // Added 'index' here
        const orderCard = document.createElement('div');
        orderCard.classList.add('order-card');

        // Extract relevant data
        const dealerName = order.dealerName || 'N/A';
        const marketingPersonName = order.marketingPersonName || 'N/A';
        const crmName = order.crmName || 'N/A';
        const markedHoldOn = formatDate(order.markedHoldOn);
        const holdUntil = order.holdUntil; // Keep original for countdown
        const formattedHoldUntil = formatDate(holdUntil);
        const dealerType = order.dealerType || 'N/A'; // Assuming dealerType is available

        // Determine badge color class based on dealerType
        let badgeColorClass = '';
        if (dealerType.toLowerCase() === 'red') {
            badgeColorClass = 'bg-red';
        } else if (dealerType.toLowerCase() === 'yellow') {
            badgeColorClass = 'bg-yellow';
        } else if (dealerType.toLowerCase() === 'green') {
            badgeColorClass = 'bg-green';
        } else {
            badgeColorClass = 'bg-gray'; // Default if type is not recognized
        }

        const dealerTypeBadgeHtml = dealerType !== 'N/A' ?
            `<div class="dealer-type-badge ${badgeColorClass}">${dealerType}</div>` : '';

        orderCard.innerHTML = `
            <div class="order-details">
                <p><strong>Dealer Name:</strong> ${dealerName} ${dealerTypeBadgeHtml}</p>
                <p><strong>Marketing Person:</strong> ${marketingPersonName}</p>
                <p><strong>CRM Name:</strong> ${crmName}</p>
                <button onclick="openMultipleDocuments('${order.fileUploadLink.replace(/'/g, "\\'")}', ${index})">View File</button>
                <p><strong>Hold Remark:</strong> ${order.holdRemark}</p>                        
            </div>
            <div class="date-info">
                <p><strong>Marked Hold On:</strong> ${markedHoldOn}</p>
                <p><strong>Hold Until:</strong> ${formattedHoldUntil}</p>
            </div>
            <div class="countdown-timer" id="countdown-${order.timestamp}">
                Calculating...
            </div>
            <div class="editable">              
            <div class="card-actions">
                <button class="approve-btn" data-timestamp="${order.timestamp}">Approve</button>
            </div>
            </div>
        `;

        orderCardsContainer.appendChild(orderCard);

        // Start countdown for each card
        const countdownElement = document.getElementById(`countdown-${order.timestamp}`);
        startCountdown(holdUntil, countdownElement);

        // Add event listener to the Approve button
        const approveButton = orderCard.querySelector('.approve-btn');
        approveButton.addEventListener('click', () => handleApprove(approveButton.dataset.timestamp));
    });
}
// Function to fetch data from the API
async function fetchData() {
    loadingIndicator.style.display = 'block'; // Show loading
    orderCardsContainer.innerHTML = ''; // Clear existing cards

    const crmName = getCrmNameFromUrl(); // Get CRM name from URL
    if (!crmName) {
        loadingIndicator.style.display = 'none';
        orderCardsContainer.innerHTML = '<p style="text-align: center; color: var(--overdue-color);">Error: CRM name parameter is missing in the URL. Please add `?crm=Your%20Name` to the URL.</p>';
        return;
    }

    const API_URL_WITH_CRM = `${BASE_API_URL}?crm=${encodeURIComponent(crmName)}`;
    console.log("Fetching data from:", API_URL_WITH_CRM);

    try {
        const response = await fetch(API_URL_WITH_CRM);
        if (!response.ok) {
            // Try to parse error as JSON, if not, use plain text
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || `HTTP error! Status: ${response.status}`);
            } catch (jsonError) {
                throw new Error(`HTTP error! Status: ${response.status}. Server response: "${errorText}"`);
            }
        }
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            // Filter for "Hold" orders (assuming script returns all for the CRM, then we filter status)
            renderOrderCards(result.data);                   
        if (typeof setReadOnlyMode === "function") {
              setReadOnlyMode();
            }                    
        } else {
            orderCardsContainer.innerHTML = '<p style="text-align: center; color: var(--overdue-color);">Error: ' + (result.message || 'Failed to fetch data.') + '</p>';
        }
    } catch (error) {
        console.error("Could not fetch data:", error);
        orderCardsContainer.innerHTML = '<p style="text-align: center; color: var(--overdue-color);">Failed to load orders. ' + error.message + '</p>';
    } finally {
        loadingIndicator.style.display = 'none'; // Hide loading
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


// Initial fetch on page load
document.addEventListener('DOMContentLoaded', fetchData);
