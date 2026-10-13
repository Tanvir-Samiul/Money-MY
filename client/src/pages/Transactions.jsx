import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categoriesApi, transactionsApi } from "../lib/api.js";
import { formatSen } from "../lib/money.js";

const SOURCE_LABELS = {
  cash: "Cash",
  touch_n_go: "Touch n Go",
  maybank: "Maybank",
  merchantrade: "Merchantrade",
};

function groupByDate(rows) {
  const groups = new Map();
  for (const r of rows) {
    const d = r.occurred_on || "Unknown";
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(r);
  }
  return Array.from(groups.entries());
}

function formatGroupDate(iso) {
  if (iso === "Unknown") return "Unknown date";
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const diff = (today - d) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export default function Transactions() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterCategory, setFilterCategory] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterSource) params.source = filterSource;
      if (filterStatus) params.status = filterStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      if (search) params.q = search;

      const [txRes, catRes] = await Promise.all([
        transactionsApi.list(params),
        categoriesApi.list(),
      ]);
      setTransactions(txRes.data || []);
      setCategories(catRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterCategory,
    filterSource,
    filterStatus,
    filterFrom,
    filterTo,
    search,
  ]);

  // Auto-poll while any transaction is pending
  useEffect(() => {
    const hasPending = transactions.some((t) => t.status === "pending");
    if (!hasPending) return;

    const interval = setInterval(() => {
      load();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const categoryMap = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const groups = groupByDate(transactions);

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Transactions</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {transactions.length} entr{transactions.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <Link
          to="/add"
          className="rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
        >
          + Add
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        <input
          type="text"
          placeholder="Search merchant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary"
        />

        <div className="flex gap-2 overflow-x-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none"
          >
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none"
          >
            <option value="">All statuses</option>
            <option value="ok">OK</option>
            <option value="needs_review">Review</option>
            <option value="pending">Reading</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none focus:border-primary"
          />
          <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
            to
          </span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text outline-none focus:border-primary"
          />
          {(filterFrom || filterTo) && (
            <button
              type="button"
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
              }}
              className="shrink-0 rounded-lg border border-border text-text-muted px-2 py-1.5 text-[10px] font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-text-muted py-12">Loading…</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">No transactions yet.</p>
          <Link
            to="/add"
            className="inline-block rounded-xl bg-primary text-on-primary px-5 py-3 text-sm font-semibold"
          >
            Add your first transaction
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, rows]) => (
            <div key={date}>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                {formatGroupDate(date)}
              </h2>
              <div className="space-y-2">
                {rows.map((tx) => {
                  const cat = categoryMap.get(tx.category_id);
                  const splitLabel =
                    tx.split_mode === "equal" && tx.split_meta?.people
                      ? `s:${tx.split_meta.people}`
                      : tx.split_mode === "custom"
                        ? "s:c"
                        : null;
                  const showPaid =
                    tx.amount_paid != null &&
                    tx.my_share != null &&
                    tx.amount_paid !== tx.my_share;

                  return (
                    <button
                      key={tx.id}
                      onClick={() => navigate(`/transactions/${tx.id}`)}
                      className="w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left hover:border-primary transition"
                    >
                      <span
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm"
                        style={{
                          background: cat ? cat.color + "22" : "#88888822",
                          border: cat
                            ? `1px solid ${cat.color}55`
                            : "1px solid #88888855",
                        }}
                      >
                        🏷️
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text truncate">
                            {tx.merchant || "Unknown merchant"}
                          </p>
                          {tx.status === "pending" && (
                            <span className="shrink-0 rounded-full bg-amber/15 text-amber text-[10px] font-bold px-2 py-0.5">
                              Reading…
                            </span>
                          )}
                          {tx.status === "needs_review" && (
                            <span className="shrink-0 rounded-full bg-amber/15 text-amber text-[10px] font-bold px-2 py-0.5">
                              Review
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted truncate">
                          {cat?.name || "—"} ·{" "}
                          {SOURCE_LABELS[tx.payment_source] ||
                            tx.payment_source ||
                            "—"}
                          {splitLabel ? ` · ${splitLabel}` : ""}
                          {showPaid
                            ? ` p:${(tx.amount_paid / 100).toFixed(2)}`
                            : ""}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-text tabular-nums">
                          {formatSen(tx.my_share ?? 0)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
