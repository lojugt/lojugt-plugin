// Deno KV Notes Ingest Server
// Run locally: deno run --allow-net --allow-env --unstable-kv server/ingest.ts
// Deploy to Deno Deploy: Deploy via GitHub or Deno Deploy CLI.
// Environment Variables:
// - PORT (optional): Port to run on (default 8000)
// - AUTH_TOKEN (optional): Secret bearer token to secure your endpoint

const PORT = parseInt(Deno.env.get("PORT") || "8000");
const AUTH_TOKEN = Deno.env.get("AUTH_TOKEN");

// Open Deno KV (automatically uses local database when run locally, or managed KV on Deno Deploy)
const kv = await Deno.openKv();

console.log(`Starting Deno KV Ingest Server on port ${PORT}...`);
if (AUTH_TOKEN) {
  console.log("Authorization security is enabled via AUTH_TOKEN environment variable.");
} else {
  console.log("Warning: AUTH_TOKEN is not set. Anyone can write to this KV database!");
}

Deno.serve({ port: PORT }, async (request: Request) => {
  // Bypassing CORS for general access (if needed)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Authenticate request if AUTH_TOKEN is configured
  if (AUTH_TOKEN) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.substring(7) !== AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized. Invalid bearer token." }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  try {
    const body = await request.json();
    const { action, path, title } = body;

    if (!action || !path) {
      return new Response(JSON.stringify({ error: "Missing required fields: action and path." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (action === "publish") {
      const { content, frontmatter, tags, mtime, ctime } = body;
      
      const noteObject = {
        path,
        title,
        content,
        frontmatter: frontmatter || {},
        tags: tags || [],
        mtime,
        ctime,
        ingestedAt: Date.now(),
      };

      // Save to Deno KV
      await kv.set(["notes", path], noteObject);
      
      console.log(`[PUBLISH] Saved note: ${path} (Title: ${title})`);
      return new Response(JSON.stringify({ success: true, message: `Successfully published: ${title}` }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } else if (action === "unpublish") {
      // Delete from Deno KV
      await kv.delete(["notes", path]);

      console.log(`[UNPUBLISH] Deleted note: ${path}`);
      return new Response(JSON.stringify({ success: true, message: `Successfully unpublished: ${path}` }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
