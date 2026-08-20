import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { BalanceVisibility, EyeToggle } from "@/components/balance-visibility";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten</a>
      <BalanceVisibility>
        <AppNav />
        <main className="main" id="main-content">
          <header className="topbar">
            <MobileNav />
            <div className="topbar-actions">
              <EyeToggle />
              <ThemeToggle />
            </div>
          </header>
          {children}
        </main>
      </BalanceVisibility>
    </div>
  );
}
