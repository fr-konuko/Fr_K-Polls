/**
 * seed-demo.mjs
 * Seeds a demo poll + aspirants into Firestore via the Firebase REST API.
 * Run with:  node scripts/seed-demo.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 1. Load .env.local manually (no dotenv needed) ──────────────────────────
function loadEnv(filePath) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  } catch {
    // ignore missing file
  }
}

loadEnv(resolve(__dirname, "../.env.local"));
loadEnv(resolve(__dirname, "../.env"));

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!PROJECT_ID || !API_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
  process.exit(1);
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── 2. Helper: Firestore REST value encoder ───────────────────────────────
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { integerValue: String(Math.round(val)) };
  if (typeof val === "boolean") return { booleanValue: val };
  if (val instanceof Date)      return { timestampValue: val.toISOString() };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return { fields };
}

// ── 3. REST helpers ───────────────────────────────────────────────────────
async function firestorePost(collection, docId, data) {
  const url = `${BASE_URL}/${collection}/${docId}?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "PATCH",            // PATCH creates-or-updates by document ID
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

// ── 4. Demo data ───────────────────────────────────────────────────────────
const NOW = new Date();
const POLL_ID = "demo-poll-2024";

const DEMO_POLL = {
  name: "2024 JOPA Kenya General Survey",
  description:
    "A nationwide popularity survey measuring public opinion on key elective positions ahead of the 2027 general election cycle.",
  status: "active",
  createdAt: NOW,
};

const DEMO_ASPIRANTS = [
  // ── PRESIDENT ──
  {
    id: "asp-pres-01",
    name: "Amina Wanjiru Kamau",
    position: "President",
    party: "Unity Forward Party",
    county: "Nairobi",
    imageUrl: "https://ui-avatars.com/api/?name=Amina+Kamau&background=E87722&color=fff&size=200&bold=true",
    votes: 247,
  },
  {
    id: "asp-pres-02",
    name: "Daniel Otieno Ouma",
    position: "President",
    party: "People's Alliance",
    county: "Kisumu",
    imageUrl: "https://ui-avatars.com/api/?name=Daniel+Ouma&background=1a6b3c&color=fff&size=200&bold=true",
    votes: 198,
  },
  {
    id: "asp-pres-03",
    name: "Grace Njeri Mwangi",
    position: "President",
    party: "Democratic Reform Party",
    county: "Kiambu",
    imageUrl: "https://ui-avatars.com/api/?name=Grace+Mwangi&background=6b3fa0&color=fff&size=200&bold=true",
    votes: 134,
  },

  // ── GOVERNOR ──
  {
    id: "asp-gov-01",
    name: "Samuel Kipkorir Bett",
    position: "Governor",
    party: "Unity Forward Party",
    county: "Nairobi",
    imageUrl: "https://ui-avatars.com/api/?name=Samuel+Bett&background=E87722&color=fff&size=200&bold=true",
    votes: 312,
  },
  {
    id: "asp-gov-02",
    name: "Fatuma Hassan Omar",
    position: "Governor",
    party: "Coastal Alliance",
    county: "Mombasa",
    imageUrl: "https://ui-avatars.com/api/?name=Fatuma+Omar&background=0d4f8b&color=fff&size=200&bold=true",
    votes: 178,
  },
  {
    id: "asp-gov-03",
    name: "Peter Wanyama Simiyu",
    position: "Governor",
    party: "People's Alliance",
    county: "Bungoma",
    imageUrl: "https://ui-avatars.com/api/?name=Peter+Simiyu&background=1a6b3c&color=fff&size=200&bold=true",
    votes: 95,
  },

  // ── SENATOR ──
  {
    id: "asp-sen-01",
    name: "Dr. Eunice Akinyi Odhiambo",
    position: "Senator",
    party: "People's Alliance",
    county: "Siaya",
    imageUrl: "https://ui-avatars.com/api/?name=Eunice+Odhiambo&background=1a6b3c&color=fff&size=200&bold=true",
    votes: 201,
  },
  {
    id: "asp-sen-02",
    name: "John Muthama Kioko",
    position: "Senator",
    party: "Democratic Reform Party",
    county: "Machakos",
    imageUrl: "https://ui-avatars.com/api/?name=John+Kioko&background=6b3fa0&color=fff&size=200&bold=true",
    votes: 167,
  },

  // ── WOMEN REP ──
  {
    id: "asp-wr-01",
    name: "Mercy Chebet Kosgei",
    position: "Women Rep",
    party: "Unity Forward Party",
    county: "Uasin Gishu",
    imageUrl: "https://ui-avatars.com/api/?name=Mercy+Kosgei&background=E87722&color=fff&size=200&bold=true",
    votes: 288,
  },
  {
    id: "asp-wr-02",
    name: "Rose Adhiambo Anyango",
    position: "Women Rep",
    party: "People's Alliance",
    county: "Homa Bay",
    imageUrl: "https://ui-avatars.com/api/?name=Rose+Anyango&background=1a6b3c&color=fff&size=200&bold=true",
    votes: 143,
  },
  {
    id: "asp-wr-03",
    name: "Nadia Abdi Sheikh",
    position: "Women Rep",
    party: "Northern Unity",
    county: "Garissa",
    imageUrl: "https://ui-avatars.com/api/?name=Nadia+Sheikh&background=c0392b&color=fff&size=200&bold=true",
    votes: 89,
  },

  // ── MEMBER OF PARLIAMENT ──
  {
    id: "asp-mp-01",
    name: "Elijah Mutua Musyoka",
    position: "Member of Parliament",
    party: "Democratic Reform Party",
    county: "Kitui",
    imageUrl: "https://ui-avatars.com/api/?name=Elijah+Musyoka&background=6b3fa0&color=fff&size=200&bold=true",
    votes: 176,
  },
  {
    id: "asp-mp-02",
    name: "Beatrice Waithira Njoroge",
    position: "Member of Parliament",
    party: "Unity Forward Party",
    county: "Muranga",
    imageUrl: "https://ui-avatars.com/api/?name=Beatrice+Njoroge&background=E87722&color=fff&size=200&bold=true",
    votes: 152,
  },
  {
    id: "asp-mp-03",
    name: "Hassan Abdi Gure",
    position: "Member of Parliament",
    party: "Northern Unity",
    county: "Wajir",
    imageUrl: "https://ui-avatars.com/api/?name=Hassan+Gure&background=c0392b&color=fff&size=200&bold=true",
    votes: 88,
  },

  // ── MCA ──
  {
    id: "asp-mca-01",
    name: "Joseph Karanja Mwangi",
    position: "MCA",
    party: "Unity Forward Party",
    county: "Nairobi",
    imageUrl: "https://ui-avatars.com/api/?name=Joseph+Mwangi&background=E87722&color=fff&size=200&bold=true",
    votes: 94,
  },
  {
    id: "asp-mca-02",
    name: "Alice Nyambura Githae",
    position: "MCA",
    party: "Democratic Reform Party",
    county: "Nyeri",
    imageUrl: "https://ui-avatars.com/api/?name=Alice+Githae&background=6b3fa0&color=fff&size=200&bold=true",
    votes: 67,
  },
  {
    id: "asp-mca-03",
    name: "Moses Otieno Ogola",
    position: "MCA",
    party: "People's Alliance",
    county: "Kisumu",
    imageUrl: "https://ui-avatars.com/api/?name=Moses+Ogola&background=1a6b3c&color=fff&size=200&bold=true",
    votes: 41,
  },
];

// ── 5. Seed to Firestore ───────────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  Seeding demo data to Firestore project: ${PROJECT_ID}\n`);

  // Write the poll document
  console.log(`📋  Creating poll: "${DEMO_POLL.name}" (id: ${POLL_ID})`);
  await firestorePost("polls", POLL_ID, DEMO_POLL);
  console.log(`    ✓ Poll created\n`);

  // Write each aspirant under polls/{pollId}/aspirants/{aspirantId}
  let count = 0;
  for (const asp of DEMO_ASPIRANTS) {
    const { id, ...data } = asp;
    const docData = { ...data, pollId: POLL_ID, createdAt: NOW };
    const path = `polls/${POLL_ID}/aspirants`;
    await firestorePost(path, id, docData);
    console.log(`    ✓ [${data.position}] ${data.name}`);
    count++;
  }

  console.log(`\n✅  Done! Seeded 1 poll + ${count} aspirants.\n`);
  console.log(`🔗  Open http://localhost:3000 to see your demo poll.`);
  console.log(`🔗  Vote at http://localhost:3000/vote`);
  console.log(`🔗  Results at http://localhost:3000/results\n`);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message || err);
  process.exit(1);
});
