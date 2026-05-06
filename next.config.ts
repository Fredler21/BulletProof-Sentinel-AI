import type { NextConfig } from "next";

// Honeypot rewrites: capture the literal paths attackers and scanners hit
// most often (env files, git internals, phpmyadmin, spring actuator, etc.)
// and route them to our decoy responder so each one trips an event and
// returns convincingly fake content with a taunt.
const HONEYPOT_REWRITES = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.backup",
  "/.git/config",
  "/.git/HEAD",
  "/wp-admin",
  "/wp-admin/setup-config.php",
  "/wp-config.php",
  "/wp-config.php.bak",
  "/phpmyadmin",
  "/phpmyadmin/index.php",
  "/pma",
  "/server-status",
  "/actuator",
  "/actuator/env",
  "/actuator/health",
  "/graphql",
  "/api/graphql",
  "/.aws/credentials",
  "/credentials.json",
  "/config.json",
  "/config.yaml",
  "/backup.sql",
  "/backup.zip",
  "/db.sql",
  "/api/v1/login",
  "/api/v1/auth",
  "/api/v1/users",
  "/api/admin",
  "/admin.php",
  "/administrator",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return HONEYPOT_REWRITES.map((source) => ({
      source,
      destination: `/api/honeypot/decoy${source}`,
    }));
  },
};

export default nextConfig;
