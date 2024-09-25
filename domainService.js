const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function getDomainMapping(domain) {
  const { data, error } = await supabaseClient
    .from('custom_domains')
    .select('ship_slug')
    .eq('domain', domain)
    .single();

  if (error) {
    console.error('Error fetching domain mapping:', error);
    return null;
  }

  return data ? { shipSlug: data.ship_slug } : null;
}

module.exports = {
  getDomainMapping,
};