import { db } from "./db";

// Create tables
await db`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

await db`
  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

// Seed sample data
const [user1] = await db`
  INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  RETURNING *
`;

const [user2] = await db`
  INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  RETURNING *
`;

await db`
  INSERT INTO posts (title, content, user_id) VALUES
    ('First Post', 'Hello from Alice!', ${user1.id}),
    ('Second Post', 'Bun is fast', ${user2.id})
  ON CONFLICT DO NOTHING
`;

console.log("Seed complete!");
console.log("Users:", user1, user2);

process.exit(0);
