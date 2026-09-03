import { AppNav } from "@/components/app-nav";
import { StocksWorkspace } from "./stocks-workspace";

export const dynamic = "force-dynamic";

export default function StocksPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><StocksWorkspace /></main></div>;
}
