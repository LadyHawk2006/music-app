import express from "express";
import { exec } from "child_process";
import util from "util";
import { LRUCache } from "lru-cache";
import cors from "cors";

const execPromise = util.promisify(exec);
const app = express();
app.use(cors()); // Enable CORS

// Improved caching: Store audio URLs for a longer time
const cache = new LRUCache({
  max: 100, // Increased storage
  ttl: 24 * 60 * 60 * 1000, // Cache for 24 hours
});

app.get("/api/audio", async (req, res) => {
  try {
    const videoId = req.query.id;
    if (!videoId) {
      return res.status(400).json({ error: "Missing video ID" });
    }

    // Check cache before making an API call
    if (cache.has(videoId)) {
      console.log(`🔄 Serving Cached Audio for ${videoId}`);
      return res.redirect(cache.get(videoId));
    }

    console.log(`🎵 Fetching Audio for ${videoId} using yt-dlp`);

    // Use yt-dlp to fetch the best audio format URL
    const command = `yt-dlp -f "bestaudio[ext=m4a]" --get-url "https://www.youtube.com/watch?v=${videoId}"`;
    const { stdout } = await execPromise(command);

    if (!stdout.trim()) {
      return res.status(500).json({ error: "No audio source found" });
    }

    const audioUrl = stdout.trim();
    console.log(`✅ Audio URL: ${audioUrl}`);

    // Cache the result for 24 hours
    cache.set(videoId, audioUrl);

    return res.redirect(audioUrl);
  } catch (error) {
    console.error("🚨 yt-dlp Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
