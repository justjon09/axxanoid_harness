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

let isSystemPaused = false;
let globalCards = []; // Store state for modal viewing

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

// --- Boot ---
connectWebSocket();
fetchCards();

// Initial system status pull to set the button correctly
fetch('/api/system/status')
    .then(r => r.json())
    .then(data => {
        if(data.success) {
            isSystemPaused = data.paused;
            updatePauseButton();
        }
    }).catch(console.error);