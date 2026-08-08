import { AppNav } from "@/components/app-nav";
import { WalletDetailWorkspace } from "./wallet-detail-workspace";

export const dynamic = "force-dynamic";

export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><WalletDetailWorkspace id={id} /></main></div>;
}