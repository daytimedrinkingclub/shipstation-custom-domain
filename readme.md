# ShipStation.ai Custom Domain Service
Check out [ShipStation.ai](https://shipstation.ai) and [Github](https://github.com/daytimedrinkingclub/shipstation)

This service handles custom domain routing for ShipStation.ai projects, serving websites from Supabase storage based on domain mappings stored in a Supabase database.

## Features

- Dynamic custom domain handling
- Content serving from Supabase storage
- Redis caching for improved performance
- SSL support via Traefik
- Designed for deployment on Coolify

## Prerequisites

- Coolify instance
- Supabase account and project
- Redis instance
- Traefik (configured in Coolify)

## Configuration

1. Clone this repository to your version control system (e.g., GitHub)
2. Create a `.env` file based on the `.env.example` and fill in the required values:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   REDIS_HOST=your_redis_host
   REDIS_PORT=your_redis_port
   SUPABASE_BUCKET=your_supabase_bucket
   ```

## Deployment on Coolify

1. Log in to your Coolify dashboard
2. Create a new service and connect it to your repository
3. Configure the environment variables in Coolify, using the values from your `.env` file
4. Deploy the service through the Coolify dashboard

## Usage

1. Add custom domain mappings to the `custom_domains` table in your Supabase database
2. Ensure the corresponding website files are stored in Supabase storage under the `ship_slug` folder
3. Point the custom domain's DNS A record to your Coolify server's IP address
4. The service will automatically serve the correct content for each custom domain

## Maintenance

- Monitor logs through the Coolify dashboard
- Update the service by pushing changes to your repository and redeploying through Coolify
- Scale the service using Coolify's scaling options if needed

## File Structure

- `index.js`: Main application file
- `domainService.js`: Supabase interaction for domain mappings
- `Dockerfile`: Docker image configuration
- `.env`: Environment variables (not in version control)
- `.env.example`: Example environment variable file

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details