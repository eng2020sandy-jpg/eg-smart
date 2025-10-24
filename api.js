// functions/api.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const { action, data } = body;

  try {
    await client.connect();
    const db = client.db("EG_SMART");
    const cafes = db.collection("cafes");
    const cards = db.collection("cards");

    if (action === "addCafe") {
      await cafes.insertOne(data);
      return ok({ message: "Cafe added successfully" });
    }

    if (action === "getCafes") {
      const all = await cafes.find().toArray();
      return ok(all);
    }

    if (action === "addCard") {
      await cards.insertOne(data);
      return ok({ message: "Card created successfully" });
    }

    if (action === "getCards") {
      const all = await cards.find().toArray();
      return ok(all);
    }

    return bad("Unknown action");
  } catch (e) {
    return bad(e.message || "Unhandled error");
  } finally {
    await client.close();
  }
}

function ok(obj) {
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
function bad(msg) {
  return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: msg }) };
}
