import { Link } from "react-router-dom";

export default function More() {
  const items = [
    { to: "/categories", label: "Categories", icon: "🏷️" },
    // More items will be added in later phases
  ];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-text mb-4">More</h1>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary transition"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 font-medium text-text">{item.label}</span>
            <span className="text-text-muted">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
