import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/transactions", label: "Transactions", icon: "📋" },
  { to: "/add", label: "Add", icon: "➕", primary: true },
  { to: "/friends", label: "Who owes me", icon: "👥" },
  { to: "/more", label: "More", icon: "⋯" },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto w-full max-w-[480px] grid grid-cols-5 h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors min-h-[44px] ${
                isActive && !item.primary ? "text-primary" : "text-text-muted"
              }`
            }
          >
            {item.primary ? (
              <span
                className="flex items-center justify-center rounded-full bg-primary text-on-primary text-xl font-bold"
                style={{ width: 44, height: 44, marginTop: -12 }}
              >
                {item.icon}
              </span>
            ) : (
              <>
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
