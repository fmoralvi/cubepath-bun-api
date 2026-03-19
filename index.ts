Bun.serve({
  port: 3000,
  routes: {
    "/health": new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    }),
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running on http://localhost:3000");