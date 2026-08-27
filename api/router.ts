import { Router } from 'express';
import { db } from '../app/database.ts';
import crypto from 'crypto';

export const restRouter = Router();

// GET all Kanban cards
restRouter.get('/cards', (req, res) => {
    try {
        const cards = db.prepare(`SELECT * FROM workboard_cards ORDER BY updated_at DESC`).all();
        res.json({ success: true, data: cards });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST a new task from the UI
restRouter.post('/cards', (req, res) => {
    try {
        const { title, description, assignee } = req.body;
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        
        db.prepare(`INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES (?, ?, ?, ?, 'ready')`)
          .run(id, title, description || 'Created via Web UI', (assignee || 'axxbot').toLowerCase());
          
        res.json({ success: true, id, message: 'Card added successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});