import { Outlet, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";
import { signOut } from "../lib/auth.js";

export default function AppShell() {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto w-full max-w-[480px] min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-xl font-bold text-primary tracking-tight">
            Money MY
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-text-muted hover:text-primary"
          >
            Sign out
          </button>
        </header>

        <main className="flex-1 pb-20">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
