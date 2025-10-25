// api/egsmart.js
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
let client;
async function db() {
  if (!client) { client = new MongoClient(uri); await client.connect(); }
  const d = client.db("EG_SMART");
  return {
    cafes: d.collection("cafes"),
    plans: d.collection("plans"),
    cards: d.collection("cards"),
    designs: d.collection("designs"),
  };
}

function ok(res, obj){ res.status(200).json(obj); }
function bad(res, code, msg){ res.status(code).json({ error: msg }); }

function genNumericCode(len) {
  let s = "";
  for (let i=0;i<len;i++) s += Math.floor(Math.random()*10);
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return bad(res, 405, "Method not allowed");
  const { action, data } = (req.body || {});

  try {
    const { cafes, plans, cards, designs } = await db();

    if (action === "addCafe") {
      const doc = {
        name: data?.name?.trim(),
        address: data?.address || "",
        owner: data?.owner || "",
        phone: data?.phone || "",
        landline: data?.landline || "",
        status: "active",
        createdAt: new Date()
      };
      const r = await cafes.insertOne(doc);
      return ok(res, { insertedId: r.insertedId });
    }

    if (action === "getCafes") {
      const all = await cafes.find({}).sort({ createdAt: -1 }).toArray();
      return ok(res, all);
    }

    if (action === "toggleCafe") {
      const id = data?.id; const next = data?.status;
      if (!id || !next) return bad(res, 400, "Missing id/status");
      await cafes.updateOne({ _id: new ObjectId(id) }, { $set: { status: next } });
      return ok(res, { updated: true });
    }

    if (action === "installCafe") {
      const id = data?.id;
      if (!id) return bad(res, 400, "Missing cafe id");
      const cafe = await cafes.findOne({ _id: new ObjectId(id) });
      if (!cafe) return bad(res, 404, "Cafe not found");

      const token = new ObjectId().toString().slice(-8);
      const mikrotikScript = [
        `# ==== EG SMART Auto-Install (MikroTik) ====`,
        `/system identity set name="${cafe.name || "Cafe"}-EGSMART"`,
        `:put "Linking to EG SMART..."`,
        `# TOKEN=${token}`,
      ].join("\\n");

      const openwrtScript = [
        `# ==== EG SMART Auto-Install (OpenWrt) ====`,
        `uci set system.@system[0].hostname='${(cafe.name || "Cafe").replace(/'/g,"")}-EGSMART'`,
        `uci commit system`,
        `# TOKEN=${token}`,
      ].join("\\n");

      return ok(res, {
        message: "Install script generated",
        mikrotik: mikrotikScript,
        openwrt: openwrtScript,
        token
      });
    }

    if (action === "upsertPlan") {
      const id = data?._id;
      const payload = {
        name: data?.name?.trim(),
        price: Number(data?.price || 0),
        quota: Number(data?.quota || 0),
        quotaUnit: data?.quotaUnit || "GB",
        uploadKbps: Number(data?.uploadKbps || 0),
        downloadKbps: Number(data?.downloadKbps || 0),
        duration: Number(data?.duration || 0),
        durationType: data?.durationType || "days",
        updatedAt: new Date(),
        createdAt: data?.createdAt ? new Date(data.createdAt) : new Date()
      };
      if (!payload.name) return bad(res, 400, "Plan name required");

      if (id) {
        await plans.updateOne({ _id: new ObjectId(id) }, { $set: payload });
        return ok(res, { updated: true });
      } else {
        const r = await plans.insertOne(payload);
        return ok(res, { insertedId: r.insertedId });
      }
    }

    if (action === "getPlans") {
      const all = await plans.find({}).sort({ updatedAt: -1 }).toArray();
      return ok(res, all);
    }

    if (action === "createCardsBatch") {
      const cafeId = data?.cafeId;
      const planId = data?.planId;
      const count = Math.max(1, Math.min(Number(data?.count || 1), 500));
      const codeLength = Math.max(4, Math.min(Number(data?.codeLength || 6), 16));
      if (!cafeId || !planId) return bad(res, 400, "cafeId/planId required");

      const cafe = await cafes.findOne({ _id: new ObjectId(cafeId) });
      const plan = await plans.findOne({ _id: new ObjectId(planId) });
      if (!cafe || !plan) return bad(res, 404, "Cafe/Plan not found");

      const batch = [];
      for (let i=0;i<count;i++) {
        batch.push({
          cafeId: cafe._id,
          planId: plan._id,
          code: genNumericCode(codeLength),
          status: "new",
          createdAt: new Date()
        });
      }
      const r = await cards.insertMany(batch);
      return ok(res, { inserted: r.insertedCount, planName: plan.name, cafeName: cafe.name });
    }

    if (action === "getCards") {
      const q = {};
      if (data?.cafeId) q.cafeId = new ObjectId(data.cafeId);
      if (data?.planId) q.planId = new ObjectId(data.planId);
      const all = await cards.find(q).sort({ createdAt: -1 }).limit(2000).toArray();
      return ok(res, all);
    }

    if (action === "saveDesign") {
      const cafeId = data?.cafeId;
      const template = data?.template || "";
      if (!cafeId || !template) return bad(res, 400, "cafeId/template required");
      await designs.updateOne(
        { cafeId: new ObjectId(cafeId) },
        { $set: { template, updatedAt: new Date() } },
        { upsert: true }
      );
      return ok(res, { saved: true });
    }

    if (action === "getDesign") {
      const cafeId = data?.cafeId;
      if (!cafeId) return bad(res, 400, "cafeId required");
      const t = await designs.findOne({ cafeId: new ObjectId(cafeId) });
      return ok(res, t || { template: "" });
    }

    return bad(res, 400, "Unknown action");
  } catch (e) {
    console.error(e);
    return bad(res, 500, e.message || "Unhandled error");
  }
}
