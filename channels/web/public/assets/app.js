// DOM Elements
const wsStatus = document.getElementById('ws-status');
const terminalOutput = document.getElementById('terminal-output');
const chatFeed = document.getElementById('chat-feed');
const chatForm = document.getElementById('chat-input-area');
const chatInput = document.getElementById('chat-input');
const btnPause = document.getElementById('btn-pause');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnSettings = document.getElementById('btn-settings');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsBody = document.getElementById('settings-body');

let isSystemPaused = false;
let globalCards = []; // Store state for modal viewing

btnSettings.removeAttribute('disabled');

// --- WebSocket Management ---
const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        wsStatus.textContent = 'WS Connected';
        wsStatus.className = 'connected';
        appendTerminal('System connected to broadcast server.', 'system');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWsEvent(data);
        } catch (e) {
            console.error("Error parsing WS message", e);
        }
    };

    ws.onclose = () => {
        wsStatus.textContent = 'WS Disconnected';
        wsStatus.className = '';
        appendTerminal('Lost connection to daemon. Retrying in 3s...', 'error');
        setTimeout(connectWebSocket, 3000);
    };
};

function handleWsEvent({ type, payload }) {
    if (type === 'system_status') {
        isSystemPaused = payload.paused;
        updatePauseButton();
        if (payload.message) appendTerminal(payload.message, 'system');
    } 
    else if (type === 'board_refresh') {
        fetchCards(); // Re-sync entire board on any mutation
    } 
    else if (type === 'chat_msg') {
        appendChat(payload.message, payload.sender.toLowerCase() === 'ceo' ? 'ceo' : 'system');
    }
    else if (type === 'telemetry_log') {
        const isError = typeof payload === 'string' && payload.toLowerCase().includes('error');
        appendTerminal(payload, isError ? 'error' : 'standard');
    }
}

// --- UI Updaters ---
function appendTerminal(text, type = 'standard') {
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${text}`;
    terminalOutput.appendChild(line);
    // Auto-scroll
    if (terminalOutput.scrollHeight - terminalOutput.scrollTop < 1000) {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

function appendChat(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    chatFeed.appendChild(msg);
    chatFeed.scrollTop = chatFeed.scrollHeight;
}

function updatePauseButton() {
    if (isSystemPaused) {
        btnPause.textContent = "Resume Orchestrator";
        btnPause.classList.add('active-red');
    } else {
        btnPause.textContent = "Halt Orchestrator";
        btnPause.classList.remove('active-red');
    }
}

// --- Kanban Data Fetching ---
async function fetchCards() {
    try {
        const res = await fetch('/api/cards');
        const json = await res.json();
        if (json.success) {
            globalCards = json.data;
            renderBoard(globalCards);
        }
    } catch (err) {
        appendTerminal(`Failed to fetch cards: ${err.message}`, 'error');
    }
}

function renderBoard(cards) {
    // Clear existing DOM
    const statuses = ['blocked', 'ready', 'in_progress', 'failed', 'done'];
    const columns = {};
    
    statuses.forEach(s => {
        const el = document.querySelector(`#col-${s}`);
        if(el) {
            columns[s] = el.querySelector('.cards-container');
            columns[s].innerHTML = '';
            el.querySelector('.count').textContent = '0';
        }
    });

    cards.forEach(card => {
        const col = columns[card.status];
        if (!col) return;

        // Update counts
        const headerCount = document.querySelector(`#col-${card.status} .count`);
        headerCount.textContent = parseInt(headerCount.textContent) + 1;

        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.status}`;
        cardEl.onclick = () => openModal(card.id);
        
        const shortId = card.id.split('-')[1] || card.id;
        
        cardEl.innerHTML = `
            <div class="card-header">
                <span class="card-id">#${shortId}</span>
                <span class="card-agent">${card.assignee.toUpperCase()}</span>
            </div>
            <div class="card-title">${card.title}</div>
        `;
        col.appendChild(cardEl);
    });
}

// --- Modal Logic ---
function openModal(cardId) {
    const card = globalCards.find(c => c.id === cardId);
    if (!card) return;

    modalTitle.textContent = `Task: ${card.title} (${card.id})`;
    
    let detailsHtml = `
        <div style="display:flex; gap: 20px; margin-bottom: 15px; font-size: 12px; color: #888;">
            <div><strong>Assignee:</strong> ${card.assignee.toUpperCase()}</div>
            <div><strong>Status:</strong> ${card.status.toUpperCase()}</div>
            <div><strong>Parent:</strong> ${card.parent_id || 'None'}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <strong style="font-size: 12px; color: #888; text-transform: uppercase;">Description</strong>
            <div style="margin-top:5px; line-height: 1.4;">${card.description || 'No description provided.'}</div>
        </div>
    `;

    if (card.result_payload) {
        try {
            const parsed = JSON.parse(card.result_payload);
            detailsHtml += `
                <strong style="font-size: 12px; color: #888; text-transform: uppercase;">Result Payload</strong>
                <pre>${JSON.stringify(parsed, null, 2)}</pre>
            `;
        } catch {
            detailsHtml += `
                <strong style="font-size: 12px; color: #888; text-transform: uppercase;">Result Payload</strong>
                <pre>${card.result_payload}</pre>
            `;
        }
    }

    modalBody.innerHTML = detailsHtml;
    overlay.style.display = 'flex';
}

function closeModal() {
    overlay.style.display = 'none';
}

// --- Chat Data Fetching ---
async function fetchChatHistory() {
    try {
        const res = await fetch('/api/chat');
        const json = await res.json();
        if (json.success && json.data) {
            chatFeed.innerHTML = ''; // Clear the default waiting message
            json.data.forEach(msg => {
                appendChat(msg.content, msg.role === 'user' ? 'ceo' : 'system');
            });
        }
    } catch (err) {
        console.error("Failed to fetch chat history:", err);
    }
}

// --- Event Listeners ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;

    chatInput.value = '';
    chatInput.disabled = true;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
    } catch (err) {
        appendTerminal(`Chat submission failed: ${err.message}`, 'error');
    } finally {
        chatInput.disabled = false;
        chatInput.focus();
    }
});

btnPause.addEventListener('click', async () => {
    const endpoint = isSystemPaused ? '/api/system/resume' : '/api/system/pause';
    try {
        await fetch(endpoint, { method: 'POST' });
    } catch (err) {
        appendTerminal(`Toggle failed: ${err.message}`, 'error');
    }
});

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeModal();
});

btnSettings.addEventListener('click', async () => {
    settingsOverlay.style.display = 'flex';
    settingsBody.innerHTML = '<p>Loading system crons...</p>';
    
    try {
        const res = await fetch('/api/crons');
        const json = await res.json();
        
        let html = '';
        for (const [id, data] of Object.entries(json.data)) {
            const isChecked = data.enabled ? 'checked' : '';
            html += `
                <div class="cron-row">
                    <div class="cron-info">
                        <h4>${id}</h4>
                        <p>${data.description}</p>
                        <p style="margin-top:4px; color:var(--accent-orange);">Interval: ${data.interval_ms / 60000} mins</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" ${isChecked} onchange="toggleCron('${id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        }
        settingsBody.innerHTML = html || '<p>No crons configured.</p>';
    } catch (e) {
        settingsBody.innerHTML = `<p style="color:red">Error loading crons: ${e.message}</p>`;
    }
});

// Attach function to global window scope so the inline HTML onchange handler can see it
window.toggleCron = async function(id, enabled) {
    try {
        await fetch(`/api/crons/${id}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
    } catch (e) {
        console.error("Failed to toggle cron", e);
    }
};

// --- Boot ---
connectWebSocket();
fetchCards();
fetchChatHistory();

// Initial system status pull to set the button correctly
fetch('/api/system/status')
    .then(r => r.json())
    .then(data => {
        if(data.success) {
            isSystemPaused = data.paused;
            updatePauseButton();
        }
    }).catch(console.error);