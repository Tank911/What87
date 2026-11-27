import express from "express";
import { readFileSync, existsSync } from "fs";

// Load .env sederhana (tanpa dependency tambahan)
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const KEY = process.env.sk-fish-Yme_J3IdywS2tBxOhH6QAZUVznu2vyiaIsDYEbTIIKw;
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

// Cari voice di Fish Audio
app.get("/api/voices", async (req, res) => {
  try {
    const p = new URLSearchParams({
      page_size: "12",
      page_number: "1",
      sort_by: "task_count",
    });
    if (req.query.q) p.set("title", String(req.query.q));
    if (req.query.lang) p.set("language", String(req.query.lang));
    const r = await fetch(`https://api.fish.audio/model?${p}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    res.json(
      (data.items || []).map((v) => ({
        id: v._id,
        title: v.title,
        languages: v.languages,
        cover: v.cover_image,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Text-to-speech
app.post("/api/tts", async (req, res) => {
  if (!KEY) return res.status(500).json({ error: "FISH_API_KEY belum diisi di .env" });
  const { text, voiceId, format = "mp3", speed = 1 } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Teks kosong" });
  try {
    const body = {
      text,
      format,
      latency: "normal",
      normalize: true,
      prosody: { speed: Number(speed) || 1 },
    };
    if (voiceId) body.reference_id = voiceId;
    const r = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        model: "s1",
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    res.setHeader("Content-Type", format === "wav" ? "audio/wav" : "audio/mpeg");
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
