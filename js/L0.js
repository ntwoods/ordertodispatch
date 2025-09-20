const apiUrl = "https://script.google.com/macros/s/AKfycbwWKHlGOSpQ5Jcof9bqCDQp-Tnl8J4lCZZT7DnGIEg75DjXYjVrvRbbjefyjdKDDPpi/exec";

const isSunday = date => date.getDay() === 0;

function calculateDeadline(timestampStr) {
    const ts = new Date(timestampStr);
    const hour = ts.getHours();
    const minute = ts.getMinutes();
    const day = ts.getDay();

    let deadline = new Date(ts);

    if (hour >= 17 || (hour === 23 && minute === 59)) {
        do {
            deadline.setDate(deadline.getDate() + 1);
        } while (isSunday(deadline));
        deadline.setHours(10, 0, 0, 0);
    } else if (hour < 9 || (hour === 9 && minute <= 30)) {
        deadline.setHours(10, 0, 0, 0);
    } else {
        deadline.setMinutes(deadline.getMinutes() + 30);
    }

    return deadline;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');

    notificationText.textContent = message;

    // Update notification style based on type
    const notificationDiv = notification.firstElementChild;
    notificationDiv.className = `px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function updateTimers() {
    const timers = document.querySelectorAll("[data-deadline]");
    const now = new Date();

    timers.forEach(el => {
        const deadline = new Date(el.dataset.deadline);
        const diff = deadline - now;
        const card = el.closest('.order-card');

        if (diff <= 0) {
            el.innerHTML = `
                <span class="flex items-center text-red-400 font-bold">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    OVERDUE
                </span>
            `;
            card.classList.add('overdue-glow');
        } else {
            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            let timeClass = 'text-green-400';
            let urgencyClass = '';

            if (diff < 3600000) { // Less than 1 hour
                timeClass = 'text-red-400';
                urgencyClass = 'urgent-pulse';
            } else if (diff < 7200000) { // Less than 2 hours
                timeClass = 'text-yellow-400';
            }

            el.innerHTML = `
                <span class="flex items-center ${timeClass} font-semibold ${urgencyClass}">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    ${hrs}h ${mins}m ${secs}s left
                </span>
            `;
            card.classList.remove('overdue-glow');
        }
    });
}

function assignCRM(timestamp) {
    const cardElement = document.querySelector(`.order-card .crm-assignment[data-timestamp="${timestamp}"]`);
    const crmSelectElement = cardElement.querySelector('.crm-select');
    const ownerSelectElement = cardElement.querySelector('.owner-select');
    const typeSelectElement = cardElement.querySelector('.type-select'); // Get the new type select element

    const selectedCRM = crmSelectElement.value;
    const concernedOwner = ownerSelectElement.value;
    const selectedType = typeSelectElement.value; // Get the selected type

    if (!selectedCRM) {
        showNotification('Please select a CRM first!', 'error');
        return;
    }
    if (!concernedOwner) {
        showNotification('Please select a Concerned Owner first!', 'error');
        return;
    }
    if (!selectedType) { // Validate if a type is selected
        showNotification('Please select a Type first!', 'error');
        return;
    }

    // Add loading state to button
    const button = cardElement.querySelector('button');
    const originalText = button.innerHTML;
    button.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Assigning...
    `;
    button.disabled = true;

    // API call to assign CRM
    fetch(apiUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            timestamp: timestamp,
            crmName: selectedCRM,
            concernedOwner: concernedOwner,
            type: selectedType, // Include the selected type in the payload
            action: 'assignCRM'
        }),
        headers: { "Content-Type": "application/json" }
    })
    .then(() => {
        // Since we're using no-cors, we can't read the response
        // But we assume success if no error is thrown
        showNotification(`Successfully assigned to ${selectedCRM} with owner ${concernedOwner} and type ${selectedType}!`, 'success');

        // Update the UI to show assignment
        const card = button.closest('.order-card');
        const assignmentDiv = card.querySelector('.crm-assignment');
        assignmentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-between bg-green-500/20 rounded-lg p-3 text-center">
                <div class="flex items-center space-x-2 mb-2">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="text-green-400 font-semibold">Assigned to ${selectedCRM}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-green-400 font-semibold">Owner: ${concernedOwner}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-green-400 font-semibold">Type: ${selectedType}</span>
                </div>
                <span class="text-green-300 text-xs mt-2">${new Date().toLocaleTimeString()}</span>
            </div>
        `;

        // Optionally reload the page to refresh data
        setTimeout(() => {
            location.reload();
        }, 2000);

    })
    .catch(err => {
        console.error("Error assigning CRM:", err);
        showNotification('Failed to assign CRM. Please try again.', 'error');
        button.innerHTML = originalText;
        button.disabled = false;
    });

    console.log(`Assigning order ${timestamp} to CRM: ${selectedCRM}, Concerned Owner: ${concernedOwner}, Type: ${selectedType}`);
}

function createCard(order, index) {
    const deadline = calculateDeadline(order.timestamp);
    const orderDate = new Date(order.timestamp);

    const card = document.createElement("div");
    card.className = "order-card glass-effect rounded-2xl p-6 shadow-2xl card-hover animate-scale-in backdrop-blur-lg border border-white/20";
    card.style.animationDelay = `${index * 0.1}s`;

    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-float">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <div>
                    <h2 class="text-xl font-bold text-white mb-1">Order Received at:</h2>
                    <div class="flex items-center text-blue-200 text-sm">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}
                    </div>
                </div>
            </div>
            <div class="flex items-center px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white text-xs font-semibold">
                ${order.status}
            </div>
        </div>

        <div class="space-y-3 mb-6">
            <div class="flex items-center text-white/90">
                <div class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-xs text-blue-200 uppercase tracking-wider">Dealer</p>
                    <p class="font-semibold">${order.dealerName}</p>
                </div>
            </div>

            <div class="flex items-center text-white/90">
                <div class="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-xs text-blue-200 uppercase tracking-wider">Marketing Person</p>
                    <p class="font-semibold">${order.marketingPersonName}</p>
                </div>
            </div>

            <div class="flex items-center text-white/90">
                <div class="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <div>
                    <p class="text-xs text-blue-200 uppercase tracking-wider">Location</p>
                    <p class="font-semibold">${order.location}</p>
                </div>
            </div>
        </div>

        <div class="bg-black/20 rounded-xl p-4 mb-4">
            <div class="flex items-center justify-between">
                <span class="text-white/70 text-sm font-medium">Deadline:</span>
                <span data-deadline="${deadline.toISOString()}" class="text-green-400 font-semibold"></span>
            </div>
        </div>

        <div class="space-y-3">
            <div class="crm-assignment bg-black/30 rounded-xl p-4" data-timestamp="${order.timestamp}">
                <label class="block text-white/90 text-sm font-semibold mb-2">Assign CRM & Owner & Type</label>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <select class="crm-select flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="" class="text-gray-800">Choose CRM...</option>
                        <option value="Km Kalpana" class="text-gray-800">Km Kalpana</option>
                        <option value="Priyam Dixit" class="text-gray-800">Priyam Dixit</option>
                        <option value="Akansha Jain" class="text-gray-800">Akansha Jain</option>
                        <option value="Mahima Agarwal" class="text-gray-800">Mahima Agarwal</option>                                
                    </select>
                    <select class="owner-select flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="" class="text-gray-800">Concerned Owner...</option>
                        <option value="Pawan Sir" class="text-gray-800">Pawan Sir</option>
                        <option value="Nitish Sir" class="text-gray-800">Nitish Sir</option>
                        <option value="Parakh Sir" class="text-gray-800">Parakh Sir</option>
                    </select>
                    <select class="type-select flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="" class="text-gray-800">Choose Type...</option>
                        <option value="Red" class="text-red-500">Red</option>
                        <option value="Yellow" class="text-yellow-500">Yellow</option>
                        <option value="Green" class="text-green-500">Green</option>
                    </select>
                </div>
                <button onclick="assignCRM('${order.timestamp}')" class="flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                        <svg class="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Assign
                    </button>
            </div>

            <a href="${order.fileUploadLink}" target="_blank"
                class="flex items-center justify-center space-x-2 w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span>View Order File</span>
            </a>
        </div>
    `;

    return card;
}

// Load data and initialize
fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById("ordersContainer");
        const loadingSpinner = document.getElementById("loadingSpinner");
        const emptyState = document.getElementById("emptyState");

        loadingSpinner.style.display = "none";

        if (data.data && data.data.length > 0) {
            data.data.forEach((order, index) => {
                const card = createCard(order, index);
                container.appendChild(card);
            });

            container.style.opacity = "1";
            updateTimers();
            setInterval(updateTimers, 1000);
        } else {
            emptyState.classList.remove("hidden");
            container.style.opacity = "1";
        }
    })
    .catch(err => {
        console.error("Failed to load data:", err);
        document.getElementById("loadingSpinner").style.display = "none";
        showNotification("Failed to load orders. Please refresh the page.", "error");
    });
