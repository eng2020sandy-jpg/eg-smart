const { MongoClient, ObjectId } = require("mongodb");

let cached = global._mongo;
if (!cached) cached = global._mongo = { conn: null, promise: null };

async function connect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI");
    const client = new MongoClient(uri);
    cached.promise = client.connect().then((c) => {
      return {
        client: c,
        db: c.db() // default DB from URI
      };
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connect, ObjectId };
