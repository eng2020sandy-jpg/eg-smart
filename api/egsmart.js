// api/egsmart.js
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

// اتصال واحد مُدار (منع تكرار الاتصال)
let client;
async function getDB() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  const db = client.db("EG_SMART");
  return {
    cafes: db.collection("cafes"),
  };
}

function ok(res, obj){ res.status(200).json(obj); }
function bad(res, code, msg){ res.status(code).json({ error: msg }); }

export default async function handler(req, res) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");

  try {
    const { action, data } = (req.body || {});
    const { cafes } = await getDB();

    // إنشاء كافيه
    if (action === "addCafe") {
      const doc = {
        name: (data?.name || "").trim(),
        address: data?.address || "",
        owner: data?.owner || "",
        phone: data?.phone || "",
        landline: data?.landline || "",
        status: "active",                  // active | paused
        createdAt: new Date(),
      };
      if (!doc.name) return bad(res, 400, "Cafe name required");
      const r = await cafes.insertOne(doc);
      return ok(res, { insertedId: r.insertedId });
    }

    // قراءة كل الكافيهات
    if (action === "getCafes") {
      const all = await cafes.find({}).sort({ createdAt: -1 }).toArray();
      return ok(res, all);
    }

    // إيقاف/تشغيل كافيه
    if (action === "toggleCafe") {
      const id = data?.id;
      const next = data?.status; // "active" or "paused"
      if (!id || !next) return bad(res, 400, "Missing id/status");
      await cafes.updateOne({ _id: new ObjectId(id) }, { $set: { status: next } });
      return ok(res, { updated: true });
    }

    // زر "تركيب": نولّد سكربت placeholder حسب اسم الكافيه
    if (action === "installCafe") {
      const id = data?.id;
      if (!id) return bad(res, 400, "Missing cafe id");
      const cafe = await cafes.findOne({ _id: new ObjectId(id) });
      if (!cafe) return bad(res, 404, "Cafe not found");

      const token = new ObjectId().toString().slice(-8);
      const mikrotik = [
        `# ==== EG SMART Auto-Install (MikroTik) ====`,
        `/system identity set name="${(cafe.name || "Cafe").replace(/"/g,"")}-EGSMART"`,
        `:put "Linking to EG SMART..."`,
        `# TODO: add hotspot/radius here`,
        `# TOKEN=${token}`,
      ].join("\n");

      const openwrt = [
        `# ==== EG SMART Auto-Install (OpenWrt) ====`,
        `uci set system.@system[0].hostname='${(cafe.name || "Cafe").replace(/'/g,"")}-EGSMART'`,
        `uci commit system`,
        `# TODO: add coovachilli/radius here`,
        `# TOKEN=${token}`,
      ].join("\n");

      return ok(res, { mikrotik, openwrt, token });
    }

    return bad(res, 400, "Unknown action");
  } catch (e) {
    console.error("API error:", e);
    return bad(res, 500, e.message || "Unhandled error");
  }
}
