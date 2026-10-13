import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Donut from "../components/Donut.jsx";
import { formatSen } from "../lib/money.js";
import { getAccessToken } from "../lib/auth.js";

const SOURCES = [
  { value: "", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "touch_n_go", label: "Touch 'n Go" },
  { value: "maybank", label: "Maybank" },
  { value: "merchantrade", label: "Merchantrade" },
];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function firstOfMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Dashboard() {
  const [mode, setMode] = useState("month"); // "month" | "custom"
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [source, setSource] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = await getAccessToken();
        const params = new URLSearchParams();
        if (mode === "month") {
          params.set("month", month);
        } else {
          params.set("from", from);
          params.set("to", to);
        }
        if (source) params.set("source", source);

        const res = await fetch(`/api/dashboard?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load dashboard");
        }
        setData(json);
      } catch (err) {
        console.error("[dashboard] load failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode, month, from, to, source]);

  const isCurrentMonth = month === currentMonth();
  const total = data?.total ?? 0;
  const diff = data?.diff ?? 0;
  const isCustomRange = mode === "custom";

  return (
    <div className="p-4 pb-24">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("month")}
          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            mode === "month"
              ? "border-primary bg-primary-soft text-text"
              : "border-border bg-surface text-text-muted"
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            mode === "custom"
              ? "border-primary bg-primary-soft text-text"
              : "border-border bg-surface text-text-muted"
          }`}
        >
          Custom range
        </button>
      </div>

      {/* Month switcher (month mode) */}
      {mode === "month" && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-text"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              {isCurrentMonth ? "This month" : "Month"}
            </p>
            <p className="text-sm font-semibold text-text">
              {formatMonth(month)}
            </p>
          </div>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrentMonth}
            className="w-9 h-9 rounded-xl border border-border bg-surface flex items-center justify-center text-text disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Custom range picker (custom mode) */}
      {mode === "custom" && (
        <div className="flex gap-2 items-center mb-4">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none focus:border-primary"
          />
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
            to
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Source filter chips */}
      <div className="flex gap-2 overflow-x-auto mb-4">
        {SOURCES.map((s) => {
          const active = source === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                active
                  ? "border-primary bg-primary-soft text-text"
                  : "border-border bg-surface text-text-muted"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-surface p-6 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
          Total spent
        </p>
        <p className="mt-2 text-4xl font-extrabold text-text tabular-nums">
          {loading ? "RM —" : formatSen(total)}
        </p>
        {!loading && data && !isCustomRange && (
          <p className="text-xs text-text-muted mt-2">
            {data.previousTotal === 0
              ? "First month with spending"
              : diff === 0
                ? "Same as last month"
                : diff < 0
                  ? `${formatSen(Math.abs(diff))} less than last month`
                  : `${formatSen(diff)} more than last month`}
          </p>
        )}
        {!loading && data && isCustomRange && (
          <p className="text-xs text-text-muted mt-2">
            {data.from} → {data.to}
          </p>
        )}
      </div>

      {/* Pending banner */}
      {data?.pendingCount > 0 && (
        <Link
          to="/transactions"
          className="block mb-4 rounded-xl border border-amber/40 bg-amber/10 text-amber text-sm px-3 py-2"
        >
          ⚠️ {data.pendingCount} item{data.pendingCount > 1 ? "s" : ""} need
          review — totals may change
        </Link>
      )}

      {/* Category donut */}
      {!loading && data && data.categoryTotals.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-4">
            By category
          </p>
          <div className="flex items-center gap-6">
            <Donut
              slices={data.categoryTotals}
              total={total}
              size={160}
              stroke={24}
            />
            <div className="flex-1 space-y-2">
              {data.categoryTotals.slice(0, 6).map((c) => (
                <div
                  key={c.categoryId}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  <span className="flex-1 truncate text-text">{c.name}</span>
                  <span className="text-text-muted tabular-nums">
                    {formatSen(c.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top merchants */}
      {!loading && data && data.topMerchants.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
            Top merchants
          </p>
          <div className="space-y-2">
            {data.topMerchants.map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-text-muted tabular-nums">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate text-text">{m.merchant}</span>
                <span className="text-text-muted text-xs">×{m.count}</span>
                <span className="font-semibold text-text tabular-nums">
                  {formatSen(m.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biggest expenses */}
      {!loading && data && data.biggest.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">
            Biggest expenses
          </p>
          <div className="space-y-2">
            {data.biggest.map((b) => (
              <Link
                key={b.id}
                to={`/transactions/${b.id}`}
                className="flex items-center justify-between text-sm py-1"
              >
                <span className="truncate text-text">{b.merchant}</span>
                <span className="font-semibold text-text tabular-nums">
                  {formatSen(b.amount)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.transactionCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">
            No spending recorded for this range.
          </p>
          <Link
            to="/add"
            className="inline-block rounded-xl bg-primary text-on-primary px-5 py-3 text-sm font-semibold"
          >
            Add a transaction
          </Link>
        </div>
      )}
    </div>
  );
}
