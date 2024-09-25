const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");
const { Readable } = require("stream");
const mime = require("mime-types");
const { getDomainMapping } = require("./domainService.js");

require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: process.env.REDIS_PORT || 6379,
});

const app = express();

const getFileStream = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .download(filePath);

    if (error) throw error;

    // Convert Blob to Buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    const stream = Readable.from(buffer);
    const contentType = mime.lookup(filePath) || "application/octet-stream";
    return { stream, contentType, exists: true };
  } catch (error) {
    console.error(`Error accessing ${filePath}:`, error);
    return {
      exists: false,
      message: `Error accessing file: ${filePath}`,
      error,
    };
  }
};

// Middleware to check custom domain and serve content
async function serveDomain(req, res, next) {
  const domain = req.headers.host;
  console.log(`Serving domain: ${domain}`);

  try {
    // Check Redis cache first
    let shipSlug = await redis.get(domain);
    console.log(`Redis cache for ${domain}: ${shipSlug}`);

    if (!shipSlug) {
      // If not in cache, check Supabase using domainService
      const mapping = await getDomainMapping(domain);
      console.log(`Supabase mapping for ${domain}:`, mapping);
      if (mapping) {
        shipSlug = mapping.shipSlug;
        // Cache the result in Redis
        await redis.set(domain, shipSlug);
      }
    }

    if (shipSlug) {
      console.log(`Serving content for ${domain} from ${shipSlug}`);
      // Serve the website from Supabase storage
      const fileInfo = await getFileStream(`${shipSlug}/index.html`);

      if (fileInfo.exists) {
        // Set the Content-Type based on the file extension
        res.set("Content-Type", fileInfo.contentType);

        // Pipe the file stream to the response
        fileInfo.stream.pipe(res);
      } else {
        // File doesn't exist yet, send a 404 response
        res.status(404).send("File not found");
      }
    } else {
      console.log(`No content found for ${domain}`);
      res.status(404).send("Website not found");
    }
  } catch (error) {
    console.error("Error serving domain:", error);
    res.status(500).send("Internal Server Error");
  }
}

app.use(serveDomain);

// Add a health check route
app.get("/health", async (req, res) => {
  try {
    await redis.set("health_check", "ok");
    const value = await redis.get("health_check");
    if (value === "ok") {
      res.status(200).send("Healthy");
    } else {
      res.status(500).send("Redis not working correctly");
    }
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).send("Health check failed");
  }
});
// Start the server
const port = 80;
app.listen(port, "0.0.0.0", () => {
  console.log(`Domain service running on port ${port}`);
});
