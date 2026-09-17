import { AppNav } from "@/components/app-nav";
import { FinancialHealthPage } from "./financial-health-page";

export const dynamic = "force-dynamic";

export default function FinancialHealth() {
  return (
    <div className="app-shell">
      <AppNav />
      <main className="main" id="main-content">
        <FinancialHealthPage />
      </main>
    </div>
  );
}