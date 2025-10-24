// Netlify Function: /.netlify/functions/api
export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const { action, data } = body;

  try {
    if (action === "createCard") {
      const code = "C-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      return ok({ message: "Card created (stub)", code });
    }

    if (action === "installCafe") {
      return ok({ message: `Install pushed for cafe: ${data?.cafe?.name || "unknown"}` });
    }

    return bad("Unknown action");
  } catch (e) {
    return bad(e.message || "Unhandled error");
  }
}

function ok(obj){ 
  return { 
    statusCode: 200, 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(obj) 
  }; 
}

function bad(msg){ 
  return { 
    statusCode: 400, 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ error: msg }) 
  }; 
}
