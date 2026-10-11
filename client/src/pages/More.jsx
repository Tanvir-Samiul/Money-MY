import { Link } from "react-router-dom";
import { getAccessToken } from "../lib/auth.js";

export default function More() {
  const items = [{ to: "/categories", label: "Categories", icon: "🏷️" }];

  async function handleExport() {
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/export.csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calm-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not export: " + err.message);
    }
  }

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

        <button
          onClick={handleExport}
          className="w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary transition text-left"
        >
          <span className="text-xl">📥</span>
          <span className="flex-1 font-medium text-text">Export CSV</span>
          <span className="text-text-muted">↓</span>
        </button>
      </div>
    </div>
  );
}
