import { db } from '../../app/database.ts';

// Clean existing test data
db.prepare(`DELETE FROM card_dependencies`).run();
db.prepare(`DELETE FROM workboard_cards`).run();

// 1. Insert Parent Card (Completed)
db.prepare(`
    INSERT INTO workboard_cards (id, title, assignee, status)
    VALUES ('parent-1', 'Build API Routes', 'noid', 'done')
`).run();

// 2. Insert Child Card (Blocked)
db.prepare(`
    INSERT INTO workboard_cards (id, title, assignee, status)
    VALUES ('child-1', 'Test API Endpoints', 'dobot', 'blocked')
`).run();

// 3. Link Dependency (child-1 depends on parent-1)
db.prepare(`
    INSERT INTO card_dependencies (card_id, depends_on_id)
    VALUES ('child-1', 'parent-1')
`).run();

console.log("Seeded parent-1 (done) and child-1 (blocked). Start server (`npm run dev`) to watch child-1 promote to READY.");

//npx tsx scripts/harnes-test/seed-dependency.ts