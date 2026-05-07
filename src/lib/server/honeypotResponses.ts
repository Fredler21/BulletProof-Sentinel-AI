import { NextResponse, type NextRequest } from "next/server";
import { triggerTrap } from "@/lib/server/honeypots";
import { isIpBlocked } from "@/lib/server/blocklist";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";
import { pickTaunt } from "@/lib/server/honeypotTaunts";
import { isSentinelOperator } from "@/lib/server/operator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DecoyKind =
  | "dotenv"
  | "git-config"
  | "phpmyadmin"
  | "server-status"
  | "actuator"
  | "graphql"
  | "aws-credentials"
  | "jwt-login"
  | "config-json"
  | "backup-zip";

function detectKind(pathname: string): DecoyKind {
  const p = pathname.toLowerCase();
  if (p.includes(".env")) return "dotenv";
  if (p.includes(".git")) return "git-config";
  if (p.includes("phpmyadmin") || p.includes("pma")) return "phpmyadmin";
  if (p.includes("server-status")) return "server-status";
  if (p.includes("actuator")) return "actuator";
  if (p.includes("graphql")) return "graphql";
  if (p.includes("aws") || p.includes("credentials")) return "aws-credentials";
  if (p.includes("login") || p.includes("auth")) return "jwt-login";
  if (p.endsWith(".json") || p.includes("config")) return "config-json";
  if (p.endsWith(".zip") || p.endsWith(".bak") || p.endsWith(".sql")) {
    return "backup-zip";
  }
  return "config-json";
}

function dotenvBody(taunt: string): string {
  return [
    "# .env",
    "# nice find. these credentials are extremely fake.",
    "# this is a Sentinel AI honeypot.",
    `# ${taunt}`,
    "",
    "NODE_ENV=production",
    "DATABASE_URL=postgres://you_just_got_logged:lol@127.0.0.1:5432/trap",
    "JWT_SECRET=we_already_emailed_your_isp",
    "STRIPE_SECRET_KEY=sk_live_thisIsAHoneypot_youAreOnCamera",
    "AWS_ACCESS_KEY_ID=AKIA0000HONEYPOT0000",
    "AWS_SECRET_ACCESS_KEY=please/stop/scanning/our/servers/thanks",
    "ADMIN_EMAIL=soc-team@sentinel.ai",
    "# every line you read here was logged with your IP, UA, and timestamp.",
    "",
  ].join("\n");
}

function gitConfigBody(taunt: string): string {
  return [
    "[core]",
    "\trepositoryformatversion = 0",
    "\tfilemode = true",
    "\tbare = false",
    "[remote \"origin\"]",
    "\turl = https://github.com/sentinel-ai/you-tripped-the-trap.git",
    `\t# ${taunt}`,
    "[user]",
    "\tname = Honeypot",
    "\temail = gotcha@sentinel.ai",
    "",
  ].join("\n");
}

function phpmyadminBody(taunt: string): string {
  return `<!doctype html>
<html><head><title>phpMyAdmin</title></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:40px">
  <h1 style="color:#cc0000">phpMyAdmin 4.0.0</h1>
  <p>Connection to MySQL server failed.</p>
  <!-- ${taunt} -->
  <!-- This is not phpMyAdmin. This is Sentinel AI. -->
  <!-- The 'mysql' user has password '????' (not really, it's a trap). -->
  <p style="color:#888;font-size:12px">If you are reading this, you are being logged.</p>
</body></html>`;
}

function actuatorBody(taunt: string): object {
  return {
    activeProfiles: ["prod"],
    propertySources: [
      {
        name: "applicationConfig: [classpath:/application.yml]",
        properties: {
          "spring.datasource.password": {
            value: "******",
            origin: "honeypot",
          },
          "_notice": { value: taunt },
        },
      },
    ],
    _hint: "This is a Sentinel AI decoy. Spring Boot is not running here.",
  };
}

function graphqlBody(taunt: string): object {
  return {
    errors: [
      {
        message: "Field 'admin' doesn't exist on type 'Query'",
        extensions: {
          code: "GRAPHQL_VALIDATION_FAILED",
          _notice: taunt,
          _hint: "There is no GraphQL server here. Just a SOC team taking notes.",
        },
      },
    ],
    data: null,
  };
}

function awsBody(taunt: string): string {
  return [
    "[default]",
    "aws_access_key_id = AKIA0000HONEYPOT0000",
    "aws_secret_access_key = pleaseStopScanningOurServersThanks",
    `# ${taunt}`,
    "# fake. logged. blocked soon.",
    "",
  ].join("\n");
}

function jwtLoginBody(taunt: string): object {
  return {
    error: "invalid_credentials",
    message: "Account locked after too many attempts",
    _notice: taunt,
    _hint: "There was no account to lock. This is a Sentinel AI honeypot.",
    retry_after: 999999,
  };
}

function configJsonBody(taunt: string): object {
  return {
    appName: "definitely-real-production-app",
    debug: false,
    secrets: {
      apiKey: "sk_live_youJustTrippedAHoneypot",
      dbPassword: "we_logged_your_ip",
    },
    _notice: taunt,
    _hint: "Sentinel AI honeypot. Every byte you read was logged.",
  };
}

function backupBody(taunt: string): string {
  return `-- MySQL dump 5.7\n-- Host: localhost  Database: production\n-- ${taunt}\n-- Just kidding. This is a Sentinel AI honeypot. Enjoy your log entry.\n`;
}

export async function respondAsDecoy(
  req: NextRequest,
  pathname: string,
): Promise<Response> {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  if (await isIpBlocked(ip)) {
    return new NextResponse("403 forbidden — your IP is on our naughty list.", {
      status: 403,
      headers: { "X-Sentinel-Trap": "1" },
    });
  }

  // Don't log Sentinel operators (logged-in dashboard users) as attackers
  // when they're previewing/testing the decoys themselves.
  if (!(await isSentinelOperator())) {
    await triggerTrap(pathname, { ip, userAgent, method: req.method });
  }

  const taunt = pickTaunt(ip);
  const kind = detectKind(pathname);
  const baseHeaders: Record<string, string> = {
    "X-Sentinel-Trap": "1",
    "X-Sentinel-Notice": "You are being logged. Sincerely, the SOC team.",
    "X-Powered-By": "Vibes and a Raspberry Pi",
  };

  switch (kind) {
    case "dotenv":
      return new NextResponse(dotenvBody(taunt), {
        status: 200,
        headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    case "git-config":
      return new NextResponse(gitConfigBody(taunt), {
        status: 200,
        headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    case "phpmyadmin":
      return new NextResponse(phpmyadminBody(taunt), {
        status: 200,
        headers: { ...baseHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    case "server-status":
      return new NextResponse(
        `Apache Server Status\n\nServer: localhost\nNote: ${taunt}\n(Decoy. Sentinel AI honeypot.)\n`,
        {
          status: 200,
          headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    case "actuator":
      return NextResponse.json(actuatorBody(taunt), {
        status: 200,
        headers: baseHeaders,
      });
    case "graphql":
      return NextResponse.json(graphqlBody(taunt), {
        status: 400,
        headers: baseHeaders,
      });
    case "aws-credentials":
      return new NextResponse(awsBody(taunt), {
        status: 200,
        headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    case "jwt-login":
      return NextResponse.json(jwtLoginBody(taunt), {
        status: 401,
        headers: baseHeaders,
      });
    case "backup-zip":
      return new NextResponse(backupBody(taunt), {
        status: 200,
        headers: {
          ...baseHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": "attachment; filename=backup.sql",
        },
      });
    case "config-json":
    default:
      return NextResponse.json(configJsonBody(taunt), {
        status: 200,
        headers: baseHeaders,
      });
  }
}
