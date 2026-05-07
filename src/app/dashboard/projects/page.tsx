import { headers } from "next/headers";
import { requireSessionUser } from "@/lib/server/session";
import { listProjectsForUser } from "@/lib/server/projects";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { CreateProjectForm } from "@/app/dashboard/projects/_components/CreateProjectForm";
import { DeleteProjectButton } from "@/app/dashboard/projects/_components/DeleteProjectButton";
import { CopyButton } from "@/app/dashboard/projects/_components/CopyButton";

export const dynamic = "force-dynamic";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function ProjectsPage(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const projects = await listProjectsForUser(user.uid);
  const origin = await getOrigin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Embeddable Honeypots
        </h1>
        <p className="mt-1 text-sm text-sentinel-muted">
          Drop a Sentinel honeypot on any external website. Each project gets
          an API key (for the beacon endpoint) and a hosted decoy login URL
          (for cheap rewrite-based traps). Hits flow into your dashboard with
          the project name attached.
        </p>
      </div>

      <CreateProjectForm />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
          Your Projects
        </h2>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-sentinel-border bg-sentinel-panel p-6 text-sm text-sentinel-muted">
            No projects yet. Create one above to get an API key and an
            embeddable trap URL.
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => {
              const beaconUrl = `${origin}/api/v1/beacon`;
              const trapUrl = `${origin}/api/v1/trap/${p.id}`;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {p.name}
                      </h3>
                      <p className="text-xs text-sentinel-muted">
                        {p.domain ? (
                          <a
                            href={p.domain.startsWith("http") ? p.domain : `https://${p.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-sentinel-accent"
                          >
                            {p.domain}
                          </a>
                        ) : (
                          <span className="text-sentinel-muted/60">
                            no domain set
                          </span>
                        )}
                        {" · "}created <TimeAgo timestamp={p.createdAt} />
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-sentinel-border px-3 py-1 text-xs text-sentinel-muted">
                        {p.hits} hit{p.hits === 1 ? "" : "s"}
                      </span>
                      <DeleteProjectButton id={p.id} name={p.name} />
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Project ID"
                      value={p.id}
                      mono
                    />
                    <Field
                      label="API key prefix"
                      value={`${p.apiKeyPrefix}…`}
                      mono
                      hint="Full key shown only at creation. Rotate by deleting and re-creating the project."
                    />
                  </dl>

                  <div className="mt-5 space-y-4">
                    <Snippet
                      title="Hosted decoy URL (no API key — easiest)"
                      desc={
                        <>
                          Rewrite paths like <code>/wp-admin</code> or{" "}
                          <code>/admin</code> on your site to this URL. Visitors
                          see a convincing fake login; submissions log to your
                          dashboard.
                        </>
                      }
                      code={trapUrl}
                    />
                    <Snippet
                      title="Beacon endpoint"
                      desc="POST custom honeypot events from any backend. Auth via the X-Sentinel-Key header."
                      code={`curl -X POST ${beaconUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Sentinel-Key: <YOUR_API_KEY>" \\
  -d '{
    "path": "/wp-login.php",
    "ip": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ...",
    "username": "admin",
    "passwordLength": 8
  }'`}
                    />
                    <Snippet
                      title="Browser snippet (drop on any HTML page)"
                      desc="Reports any page-load to Sentinel as a honeypot trigger. Use on hidden / decoy pages."
                      code={`<script>
(function(){
  fetch("${beaconUrl}", {
    method: "POST",
    headers: { "Content-Type":"application/json", "X-Sentinel-Key":"<YOUR_API_KEY>" },
    body: JSON.stringify({
      path: location.pathname,
      userAgent: navigator.userAgent,
      message: "Decoy page viewed",
      metadata: { referrer: document.referrer || null }
    })
  }).catch(function(){});
})();
</script>`}
                    />
                    <Snippet
                      title="Next.js rewrite (host trap on your domain)"
                      desc="Add to next.config.ts so /admin on your site quietly proxies to Sentinel's hosted decoy."
                      code={`async rewrites() {
  return [
    { source: "/admin", destination: "${trapUrl}" },
    { source: "/wp-admin", destination: "${trapUrl}" },
    { source: "/wp-login.php", destination: "${trapUrl}" },
  ];
}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}): React.ReactElement {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-sentinel-muted">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded border border-sentinel-border bg-black/30 px-2 py-1 text-xs ${
            mono ? "font-mono" : ""
          } text-slate-200`}
        >
          {value}
        </code>
        <CopyButton value={value} />
      </dd>
      {hint && (
        <p className="mt-1 text-[11px] text-sentinel-muted/80">{hint}</p>
      )}
    </div>
  );
}

function Snippet({
  title,
  desc,
  code,
}: {
  title: string;
  desc: React.ReactNode;
  code: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-sentinel-border/70 bg-black/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs text-sentinel-muted">{desc}</p>
        </div>
        <CopyButton value={code} />
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre rounded bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
        {code}
      </pre>
    </div>
  );
}
