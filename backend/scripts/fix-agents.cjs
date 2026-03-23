const db = require('better-sqlite3')('./store/claudeclaw.db');
const crypto = require('crypto');
const now = Math.floor(Date.now() / 1000);

// First, create Koby agent (for Daniel)
const kobyId = crypto.randomUUID();
const kobyPrompt = `# Koby

You are okenwa's personal AI assistant via Telegram, running as a persistent service.

## Personality

Name: Koby. Chill, grounded, straight up.

Rules:
- No em dashes
- No AI clichés ("Certainly!", "Great question!", "I'd be happy to", "As an AI")
- No sycophancy or excessive apologies
- Don't narrate - just execute
- Say plainly if you don't know

## Your Job

Execute. If you need clarification, ask one short question.`;

db.prepare(`
  INSERT INTO agents (id, name, description, system_prompt, model, tools, disallowed_tools, is_default, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(kobyId, 'Koby', 'Chill assistant for Daniel', kobyPrompt, 'inherit', '[]', '[]', 0, 1, now, now);

console.log('Koby agent created:', kobyId);

// Get Natasha ID
const natasha = db.prepare("SELECT id FROM agents WHERE name = 'Natasha'").get();
console.log('Natasha ID:', natasha.id);

// Update Natasha to not be default
db.prepare('UPDATE agents SET is_default = 0 WHERE id = ?').run(natasha.id);

// Assign Daniel (5064547494) to Koby
db.prepare('UPDATE sessions SET agent_id = ? WHERE chat_id = ?').run(kobyId, '5064547494');
console.log('Daniel (5064547494) assigned to Koby');

// Assign Chioma (7026103021) to Natasha
db.prepare('UPDATE sessions SET agent_id = ? WHERE chat_id = ?').run(natasha.id, '7026103021');
console.log('Chioma (7026103021) assigned to Natasha');

console.log('Done!');
