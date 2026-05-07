import { NextResponse, type NextRequest } from "next/server";
import { recordSecurityEvent } from "@/lib/server/events";
import { bumpProjectHits, findProjectById } from "@/lib/server/projects";
import { isIpBlocked } from "@/lib/server/blocklist";
import { getRequestIp, getRequestUserAgent } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTML_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Sentinel-Trap": "1",
  "X-Powered-By": "WordPress 5.8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loginPage(opts: {
  trapId: string;
  brand: string;
  errored: boolean;
}): string {
  const err = opts.errored
    ? `<div id="login_error" style="background:#fef1f1;border-left:4px solid #d63638;padding:12px;margin-bottom:16px;color:#3c434a;font-size:13px;">
         <strong>Error:</strong> The username or password you entered is incorrect.
       </div>`
    : "";
  const brand = escapeHtml(opts.brand);
  const id = escapeHtml(opts.trapId);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Log In &lsaquo; ${brand}</title>
<style>
  body{margin:0;background:#f0f0f1;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#3c434a;}
  .wrap{max-width:320px;margin:8% auto 0;padding:0 24px;}
  .logo{text-align:center;margin-bottom:25px;}
  .logo span{display:inline-block;font-size:20px;font-weight:600;color:#1d2327;border-bottom:1px solid #c3c4c7;padding-bottom:8px;}
  form{background:#fff;border:1px solid #c3c4c7;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:26px 24px;}
  label{display:block;margin:0 0 6px;font-weight:600;}
  input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:7px 8px;font-size:16px;border:1px solid #8c8f94;border-radius:3px;margin-bottom:16px;}
  button{background:#2271b1;border:1px solid #2271b1;color:#fff;padding:6px 14px;font-size:13px;border-radius:3px;cursor:pointer;}
  .nav{margin-top:18px;font-size:13px;text-align:center;}
  .nav a{color:#50575e;text-decoration:none;}
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo"><span>${brand}</span></div>
    ${err}
    <form method="post" action="/api/v1/trap/${id}" autocomplete="off">
      <label for="user_login">Username or Email Address</label>
      <input type="text" name="log" id="user_login" autocomplete="off" autocapitalize="off" />
      <label for="user_pass">Password</label>
      <input type="password" name="pwd" id="user_pass" autocomplete="off" />
      <p><label><input type="checkbox" name="rememberme" value="forever" /> Remember Me</label></p>
      <p style="text-align:right;"><button type="submit" name="wp-submit">Log In</button></p>
    </form>
    <p class="nav"><a href="#">Lost your password?</a></p>
  </div>
</body>
</html>`;
}

interface RouteCtx {
  params: Promise<{ id: string }>;
}

async function logHit(
  req: NextRequest,
  trapId: string,
  body: { username: string; password: string } | null,
): Promise<void> {
  const project = await findProjectById(trapId);
  if (!project) return;
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  const credAttempt = !!(body && (body.username || body.password));

  await recordSecurityEvent({
    type: credAttempt ? "honeypot.credentials" : "honeypot.trigger",
    severity: credAttempt ? "high" : "medium",
    message: credAttempt
      ? `Hosted trap credential attempt (${project.name}): ${
          body!.username || "(empty)"
        } / ${body!.password ? "***" : "(empty)"}`
      : `Hosted trap viewed: ${project.name}`,
    ip,
    userAgent,
    route: `/api/v1/trap/${trapId}`,
    ownerUid: project.ownerUid,
    metadata: {
      projectId: project.id,
      projectName: project.name,
      projectDomain: project.domain,
      hostedTrap: true,
      method: body ? "POST" : "GET",
      referer: referer ? referer.slice(0, 300) : null,
      requestHost: host ? host.slice(0, 200) : null,
      ...(body
        ? {
            username: body.username.slice(0, 200),
            passwordLength: body.password.length,
          }
        : {}),
    },
  });
  await bumpProjectHits(project.id);
}

export async function GET(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { id } = await ctx.params;
  const project = await findProjectById(id);
  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (await isIpBlocked(getRequestIp(req))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const errored = req.nextUrl.searchParams.get("err") === "1";
  // Fire-and-forget so render is fast.
  logHit(req, id, null).catch(() => {});
  const html = loginPage({
    trapId: id,
    brand: project.name || "Site Admin",
    errored,
  });
  return new NextResponse(html, { status: 200, headers: HTML_HEADERS });
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { id } = await ctx.params;
  const project = await findProjectById(id);
  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (await isIpBlocked(getRequestIp(req))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  let username = "";
  let password = "";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await req.json()) as { username?: string; password?: string; log?: string; pwd?: string };
      username = String(j.username ?? j.log ?? "").slice(0, 200);
      password = String(j.password ?? j.pwd ?? "").slice(0, 200);
    } else {
      const form = await req.formData();
      username = String(form.get("log") ?? form.get("username") ?? "").slice(0, 200);
      password = String(form.get("pwd") ?? form.get("password") ?? "").slice(0, 200);
    }
  } catch {
    /* ignore */
  }

  await logHit(req, id, { username, password });

  const url = new URL(`/api/v1/trap/${id}?err=1`, req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.headers.set("X-Sentinel-Trap", "1");
  res.headers.set("X-Sentinel-Notice", "Logged. Sentinel AI is watching.");
  return res;
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
