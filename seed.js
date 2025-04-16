const { MongoClient } = require("mongodb");
const fs = require("fs");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function seedData() {
  try {
    await client.connect();
    const db = client.db("ApotheekAcademie");
    const collection = db.collection("Cursussen");

    const rawData = fs.readFileSync("pharmacy_course_data.json", "utf-8");
    const jsonData = JSON.parse(rawData);

    const result = await collection.insertMany(jsonData);
    console.log(`${result.insertedCount} documenten toegevoegd.`);
  } catch (err) {
    console.error("Fout bij seeden:", err);
  } finally {
    await client.close();
  }
}

module.exports = { seedData };
