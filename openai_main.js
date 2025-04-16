const axios = require('axios');
const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const EMBEDDING_MODEL = "text-embedding-ada-002";
const GPT_MODEL = "gpt-4";

async function createEmbedding(text) {
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      input: text,
      model: EMBEDDING_MODEL
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.data[0].embedding;
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dot / (normA * normB);
}

async function embedAndStoreDocuments() {
  await client.connect();
  const db = client.db("ApotheekAcademie");
  const sourceCollection = db.collection("Cursussen");
  const targetCollection = db.collection("Embeddings");

  const documents = await sourceCollection.find({}).toArray();

  for (const doc of documents) {
    let textParts = [];

    for (const [key, value] of Object.entries(doc)) {
      if (key === "_id") continue;

      if (key === "quiz" && Array.isArray(value)) {
        const quizText = value.map((q, i) => {
          return `Vraag ${i + 1}: ${q.question}, Opties: ${q.options.join(', ')}, Antwoord: ${q.answer}`;
        }).join(" | ");
        textParts.push(`quiz: ${quizText}`);
      } else {
        textParts.push(`${key}: ${value}`);
      }
    }

    const text = textParts.join(", ");

    const embedding = await createEmbedding(text);

    await targetCollection.insertOne({
      originalId: doc._id,
      text,
      embedding
    });
  }

  console.log("Alle documenten zijn ge-embed en opgeslagen.");
}

async function getRelevantContext(query, topK = 3) {
  await client.connect();
  const db = client.db("ApotheekAcademie");
  const collection = db.collection("Embeddings");

  const queryEmbedding = await createEmbedding(query);
  const all = await collection.find({}).toArray();

  const scored = all.map((doc) => ({
    text: doc.text,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, topK);
  return topMatches.map((m) => m.text).join("\n---\n");
}


async function callOpenAI(query, context) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: GPT_MODEL,
        messages: [
          {
            role: "system",
            content: `Gebruik de volgende context:\n${context}`
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 300
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Fout bij OpenAI:", error.response?.data || error.message);
  }
}

async function getInputAnswer(input) {
  const userInput = input
  if (!userInput) {
    console.log(" Geef een query op als argument, bijv: node main.js \"Wat is AI?\"");
    process.exit(1);
  }


  console.log(" Vraag:", userInput);

  const context = await getRelevantContext(userInput);
  console.log(" Relevante context:\n", context);

  const answer = await callOpenAI(userInput, context);
  console.log("Antwoord van OpenAI:\n", answer);

  await client.close();
  return answer;
}

module.exports = {
  getInputAnswer,
  embedAndStoreDocuments
};