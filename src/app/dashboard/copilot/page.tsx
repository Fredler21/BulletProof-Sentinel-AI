import { CopilotChat } from "@/app/dashboard/copilot/_components/CopilotChat";

export const dynamic = "force-dynamic";

export default function CopilotPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Security Copilot</h1>
        <p className="text-sm text-sentinel-muted">
          Ask about findings, request explanations, or get incident response guidance.
        </p>
      </div>
      <CopilotChat />
    </div>
  );
}
