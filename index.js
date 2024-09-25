const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");
const { getDomainMapping } = require("./domainService.js");

require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

const app = express();

// Middleware to check custom domain and serve content
async function serveDomain(req, res, next) {
  const domain = req.headers.host;

  try {
    // Check Redis cache first
    let shipSlug = await redis.get(domain);

    if (!shipSlug) {
      // If not in cache, check Supabase using domainService
      const mapping = await getDomainMapping(domain);
      if (mapping) {
        shipSlug = mapping.shipSlug;
        // Cache the result in Redis
        await redis.set(domain, shipSlug);
      }
    }

    if (shipSlug) {
      // Serve the website from Supabase storage
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .download(`${shipSlug}/index.html`);

      if (error) throw error;

      res.setHeader("Content-Type", "text/html");
      res.send(data);
    } else {
      res.status(404).send("Website not found");
    }
  } catch (error) {
    console.error("Error serving domain:", error);
    res.status(500).send("Internal Server Error");
  }
}

app.use(serveDomain);

// Start the server
const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`Domain service running on port ${port}`);
});
