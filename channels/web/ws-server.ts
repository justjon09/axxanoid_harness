import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export let wss: WebSocketServer;

export function initWebSocketServer(server: Server) {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('>>> [WEBSOCKET] UI Client Connected.');
        ws.send(JSON.stringify({ type: 'system_status', payload: 'Harness WS Live' }));
    });

    console.log('>>> [WEBSOCKET] Server initialized and attached to Express.');
}

export function broadcastUpdate(type: string, payload: any) {
    if (!wss) return;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, payload }));
        }
    });
}