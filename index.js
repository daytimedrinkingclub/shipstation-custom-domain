const express = require("express");
const greenlock = require("greenlock-express");
const { createClient } = require("@supabase/supabase-js");
const Redis = require("ioredis");

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
    let slug = await redis.get(domain);

    if (!slug) {
      // If not in cache, check Supabase
      const { data, error } = await supabase
        .from("custom_domains")
        .select("ship_slug")
        .eq("domain", domain)
        .single();

      if (error) throw error;

      if (data) {
        slug = data.ship_slug;
        // Cache the result in Redis
        await redis.set(domain, slug);
      }
    }

    if (slug) {
      // Serve the website from Supabase storage
      const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .download(`${slug}/index.html`);

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

// Custom Greenlock store using Supabase
const greenlockStore = {
  // Implement the required methods for Greenlock store
  // using Supabase for storage
  async get(opts) {
    const { data, error } = await supabase
      .from('greenlock_config')
      .select('value')
      .eq('key', opts.key)
      .single();
    
    if (error) throw error;
    return data ? JSON.parse(data.value) : null;
  },
  async put(opts) {
    const { error } = await supabase
      .from('greenlock_config')
      .upsert({ key: opts.key, value: JSON.stringify(opts.value) });
    
    if (error) throw error;
  },
  async remove(opts) {
    const { error } = await supabase
      .from('greenlock_config')
      .delete()
      .eq('key', opts.key);
    
    if (error) throw error;
  },
};

// Configure Greenlock
greenlock
  .init({
    packageRoot: __dirname,
    configDir: false, // Disable file-based config
    maintainerEmail: process.env.MAINTAINER_EMAIL,
    cluster: false,
    store: greenlockStore,
  })
  .ready(httpsWorker);

function httpsWorker(glx) {
  const server = glx.httpsServer();
  server.on("request", app);
}

// Start the server
app.listen(80, () => {
  console.log("HTTP server running on port 80");
});
