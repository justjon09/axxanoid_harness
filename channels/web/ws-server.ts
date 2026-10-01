import fs from 'fs';
import { Server } from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

export let wss: WebSocketServer;

export function initWebSocketServer(server: Server) {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('>>> [WEBSOCKET] CEO Dashboard Connected.');
        
        const isPaused = fs.existsSync(path.resolve(process.cwd(), '.PAUSED'));
        ws.send(JSON.stringify({ 
            type: 'system_status', 
            payload: { paused: isPaused, message: 'Harness WS Live' } 
        }));
    });

    console.log('>>> [WEBSOCKET] Server initialized and attached to Express.');
}

// Universal broadcaster for the 4 dashboard panes
export function broadcastUpdate(type: 'board_refresh' | 'chat_msg' | 'telemetry_log' | 'system_status', payload: any) {
    if (!wss) return;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, payload }));
        }
    });
}