import type { NextConfig } from "next";

// Paths that look like an admin login in a browser → render the fake
// admin/WordPress login page so the attacker sees a convincing form.
const FAKE_LOGIN_REWRITES: Array<{ source: string; destination: string }> = [
  { source: "/admin", destination: "/honeypot/admin" },
  { source: "/admin/login", destination: "/honeypot/admin" },
  { source: "/admin.php", destination: "/honeypot/admin" },
  { source: "/administrator", destination: "/honeypot/admin" },
  { source: "/login.php", destination: "/honeypot/admin" },
  { source: "/manager/html", destination: "/honeypot/admin" },
  { source: "/wp-admin", destination: "/honeypot/wp-login" },
  { source: "/wp-admin/setup-config.php", destination: "/honeypot/wp-login" },
  { source: "/wp-login.php", destination: "/honeypot/wp-login" },
];

// Paths that look like config files, API probes, or scanner targets →
// route to the decoy responder which returns realistic-looking fake content.
const DECOY_REWRITES = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.backup",
  "/.git/config",
  "/.git/HEAD",
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
  "/cgi-bin/luci",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      ...FAKE_LOGIN_REWRITES,
      ...DECOY_REWRITES.map((source) => ({
        source,
        destination: `/api/honeypot/decoy${source}`,
      })),
    ];
  },
};

export default nextConfig;
