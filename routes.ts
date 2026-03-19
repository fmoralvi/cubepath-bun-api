import { db } from "./db";

const jsonHeaders = { "Content-Type": "application/json" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

// ─── USERS ───────────────────────────────────────────────

export const usersRoutes = {
  "/api/users": {
    GET: async () => {
      const users = await db`SELECT * FROM users ORDER BY id`;
      return json(users);
    },
    POST: async (req: Request) => {
      const body = (await req.json()) as { name?: string; email?: string };
      if (!body?.name || !body?.email) {
        return json({ error: "Fields 'name' and 'email' are required" }, 400);
      }
      const [user] = await db`
        INSERT INTO users (name, email) VALUES (${body.name}, ${body.email})
        RETURNING *
      `;
      return json(user, 201);
    },
  },
  "/api/users/:id": {
    GET: async (req: Request) => {
      const id = Number((req as any).params.id);
      const [user] = await db`SELECT * FROM users WHERE id = ${id}`;
      if (!user) return json({ error: "User not found" }, 404);
      return json(user);
    },
    PUT: async (req: Request) => {
      const id = Number((req as any).params.id);
      const body = (await req.json()) as { name?: string; email?: string };
      if (!body?.name && !body?.email) {
        return json({ error: "At least 'name' or 'email' is required" }, 400);
      }
      const [user] = await db`
        UPDATE users
        SET name = COALESCE(${body.name ?? null}, name),
            email = COALESCE(${body.email ?? null}, email),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!user) return json({ error: "User not found" }, 404);
      return json(user);
    },
    DELETE: async (req: Request) => {
      const id = Number((req as any).params.id);
      const [user] = await db`DELETE FROM users WHERE id = ${id} RETURNING *`;
      if (!user) return json({ error: "User not found" }, 404);
      return json({ message: "User deleted", user });
    },
  },
};

// ─── POSTS ───────────────────────────────────────────────

export const postsRoutes = {
  "/api/posts": {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");
      const posts = userId
        ? await db`SELECT p.*, u.name AS author FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ${Number(userId)} ORDER BY p.id`
        : await db`SELECT p.*, u.name AS author FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id`;
      return json(posts);
    },
    POST: async (req: Request) => {
      const body = (await req.json()) as { title?: string; content?: string; user_id?: number };
      if (!body?.title || !body?.content || !body?.user_id) {
        return json({ error: "Fields 'title', 'content' and 'user_id' are required" }, 400);
      }
      const [user] = await db`SELECT id FROM users WHERE id = ${body.user_id}`;
      if (!user) return json({ error: "User not found" }, 404);
      const [post] = await db`
        INSERT INTO posts (title, content, user_id) VALUES (${body.title}, ${body.content}, ${body.user_id})
        RETURNING *
      `;
      return json(post, 201);
    },
  },
  "/api/posts/:id": {
    GET: async (req: Request) => {
      const id = Number((req as any).params.id);
      const [post] = await db`
        SELECT p.*, u.name AS author FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ${id}
      `;
      if (!post) return json({ error: "Post not found" }, 404);
      return json(post);
    },
    PUT: async (req: Request) => {
      const id = Number((req as any).params.id);
      const body = (await req.json()) as { title?: string; content?: string };
      if (!body?.title && !body?.content) {
        return json({ error: "At least 'title' or 'content' is required" }, 400);
      }
      const [post] = await db`
        UPDATE posts
        SET title = COALESCE(${body.title ?? null}, title),
            content = COALESCE(${body.content ?? null}, content),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!post) return json({ error: "Post not found" }, 404);
      return json(post);
    },
    DELETE: async (req: Request) => {
      const id = Number((req as any).params.id);
      const [post] = await db`DELETE FROM posts WHERE id = ${id} RETURNING *`;
      if (!post) return json({ error: "Post not found" }, 404);
      return json({ message: "Post deleted", post });
    },
  },
};
