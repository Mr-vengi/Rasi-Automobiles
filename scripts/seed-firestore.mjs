import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyAmJi6G8K1qAlKYKXZK3yhPSsrqnH3jTF4",
  authDomain: "rasiautomobile.firebaseapp.com",
  projectId: "rasiautomobile",
  storageBucket: "rasiautomobile.firebasestorage.app",
  messagingSenderId: "911531875895",
  appId: "1:911531875895:web:e4b0d635620cb36085e9b2",
  measurementId: "G-5MLEFFY00J",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const products = JSON.parse(fs.readFileSync("data/products.json", "utf-8"));
  const categories = JSON.parse(fs.readFileSync("data/categories.json", "utf-8"));
  const brands = JSON.parse(fs.readFileSync("data/brands.json", "utf-8"));

  console.log(`Uploading ${products.length} products, ${categories.length} categories, ${brands.length} brands to Firestore...`);

  // 1. Upload Categories
  let batch = writeBatch(db);
  let opCount = 0;

  for (const cat of categories) {
    batch.set(doc(db, "categories", cat.id), cat, { merge: true });
    opCount++;
  }
  for (const br of brands) {
    batch.set(doc(db, "brands", br.id), br, { merge: true });
    opCount++;
  }
  await batch.commit();
  console.log(`Committed ${opCount} categories and brands.`);

  // 2. Upload Products in chunks of 300
  const CHUNK_SIZE = 300;
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);
    const prodBatch = writeBatch(db);
    for (const p of chunk) {
      prodBatch.set(doc(db, "products", p.id), p, { merge: true });
    }
    await prodBatch.commit();
    console.log(`Committed products chunk ${i + 1} to ${Math.min(i + CHUNK_SIZE, products.length)}`);
  }

  console.log("All products, categories, and brands successfully uploaded to Firebase Cloud Firestore!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
