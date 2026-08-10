import { AppNav } from "@/components/app-nav";
import { AnalyticsPage } from "./analytics-page";

export const dynamic = "force-dynamic";

export default function Analytics() {
  return (
    <div className="app-shell">
      <AppNav />
      <main className="main" id="main-content">
        <AnalyticsPage />
      </main>
    </div>
  );
}
