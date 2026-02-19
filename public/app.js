// Google Auth Config
let userProfile = null;
let monitors = [];
const LIMIT = 10;

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const mainHeader = document.querySelector('.main-header');
const dashboard = document.getElementById('dashboard');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const addMonitorBtn = document.getElementById('add-monitor-btn');
const monitorCountText = document.getElementById('monitor-count-text');
const monitorLimitWarning = document.getElementById('monitor-limit-warning');
const monitorsGrid = document.getElementById('monitors-grid');
const monitorModal = document.getElementById('monitor-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const addMonitorForm = document.getElementById('add-monitor-form');
const requiresLoginCheck = document.getElementById('requires-login');
const loginFields = document.getElementById('login-fields');
const hasCaptchaCheck = document.getElementById('has-captcha');
const captchaFields = document.getElementById('captcha-fields');
const enableTelegramCheck = document.getElementById('enable-telegram');
const telegramFields = document.getElementById('telegram-fields');

// Initialize Google One Tap / Button
window.onload = function () {
    google.accounts.id.initialize({
        client_id: "REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com", // This will be handled via env/injection in real deploy
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        { theme: "filled_blue", size: "large", shape: "pill" }
    );
};

function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    userProfile = {
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    };

    showDashboard();
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// UI Transitions
function showDashboard() {
    loginOverlay.style.display = 'none';
    mainHeader.style.display = 'block';
    dashboard.style.display = 'block';
    userDisplayName.textContent = userProfile.name;
    fetchMonitors();
}

function logout() {
    userProfile = null;
    loginOverlay.style.display = 'flex';
    mainHeader.style.display = 'none';
    dashboard.style.display = 'none';
}

logoutBtn.addEventListener('click', logout);

// Monitor Management
async function fetchMonitors() {
    monitorsGrid.innerHTML = '<div class="loading-state"><div class="loader"></div><p>Syncing monitors...</p></div>';

    try {
        const response = await fetch(`/.netlify/functions/get-monitors?email=${encodeURIComponent(userProfile.email)}`);
        monitors = await response.json();
        renderMonitors();
        updateLimitUI();
    } catch (error) {
        console.error("Error fetching monitors:", error);
        monitorsGrid.innerHTML = '<p class="text-secondary text-center">Error loading monitors. Please try again.</p>';
    }
}

function renderMonitors() {
    if (monitors.length === 0) {
        monitorsGrid.innerHTML = '<div class="loading-state"><p>No pages being watched yet. Add one to get started!</p></div>';
        return;
    }

    monitorsGrid.innerHTML = '';
    monitors.forEach(monitor => {
        const card = document.createElement('div');
        card.className = 'monitor-card animate-fade-in';
        card.innerHTML = `
            <a href="${monitor.url}" target="_blank" class="monitor-url">${monitor.url}</a>
            <div class="monitor-status">
                <span class="badge-active">● Active</span>
                <span class="text-secondary ml-2">Updated: ${new Date(monitor.last_updated_timestamp).toLocaleDateString()}</span>
            </div>
            <div class="ai-summary">
                <h4>Latest AI summary</h4>
                <p>${monitor.latest_ai_summary || 'Waiting for next run...'}</p>
            </div>
            <div class="monitor-footer">
                <div class="text-secondary" style="font-size: 0.75rem;">
                    ${monitor.requires_login ? '🔑 Login' : ''} 
                    ${monitor.has_captcha ? '🍪 Cookies' : ''}
                    ${monitor.email_notifications_enabled ? '📧 Email' : ''}
                    ${monitor.telegram_notifications_enabled ? '✈️ Telegram' : ''}
                </div>
                <button class="delete-btn" onclick="deleteMonitor('${monitor._id}')">Delete</button>
            </div>
        `;
        monitorsGrid.appendChild(card);
    });
}

function updateLimitUI() {
    const count = monitors.length;
    monitorCountText.textContent = `You are using ${count} of ${LIMIT} slots.`;

    if (count >= LIMIT) {
        addMonitorBtn.disabled = true;
        monitorLimitWarning.style.display = 'block';
    } else {
        addMonitorBtn.disabled = false;
        monitorLimitWarning.style.display = 'none';
    }
}

async function deleteMonitor(id) {
    if (!confirm("Stop watching this page?")) return;

    try {
        const response = await fetch(`/.netlify/functions/delete-monitor?id=${id}&email=${encodeURIComponent(userProfile.email)}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            fetchMonitors();
        }
    } catch (error) {
        alert("Failed to delete monitor");
    }
}

// Modal Logic
addMonitorBtn.addEventListener('click', () => {
    if (monitors.length < LIMIT) {
        monitorModal.style.display = 'flex';
    }
});

closeModalBtn.addEventListener('click', () => {
    monitorModal.style.display = 'none';
});

requiresLoginCheck.addEventListener('change', (e) => {
    loginFields.style.display = e.target.checked ? 'block' : 'none';
});

hasCaptchaCheck.addEventListener('change', (e) => {
    captchaFields.style.display = e.target.checked ? 'block' : 'none';
});

enableTelegramCheck.addEventListener('change', (e) => {
    telegramFields.style.display = e.target.checked ? 'block' : 'none';
});

// Form Submission
addMonitorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        user_email: userProfile.email,
        url: document.getElementById('target-url').value,
        requires_login: requiresLoginCheck.checked,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        has_captcha: hasCaptchaCheck.checked,
        captcha_json: document.getElementById('captcha-json').value,
        email_notifications_enabled: document.getElementById('enable-notifications').checked,
        telegram_notifications_enabled: enableTelegramCheck.checked,
        telegram_chat_id: document.getElementById('telegram-chat-id').value
    };

    try {
        const response = await fetch('/.netlify/functions/add-monitor', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            monitorModal.style.display = 'none';
            addMonitorForm.reset();
            loginFields.style.display = 'none';
            captchaFields.style.display = 'none';
            telegramFields.style.display = 'none';
            fetchMonitors();
        } else {
            alert(result.error || "Failed to add monitor");
        }
    } catch (error) {
        alert("An error occurred");
    }
});
