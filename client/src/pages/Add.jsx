import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { categoriesApi, transactionsApi } from "../lib/api.js";
import { rmToSen } from "../lib/money.js";

const SOURCES = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "touch_n_go", label: "Touch 'n Go", icon: "📱" },
  { value: "maybank", label: "Maybank", icon: "🏦" },
  { value: "merchantrade", label: "Merchantrade", icon: "💳" },
];

function todayLocalIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function nowLocalHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function Add() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("cash");
  const [date, setDate] = useState(todayLocalIso());
  const [time, setTime] = useState(nowLocalHHMM());
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => {
        setCategories(data || []);
        if (data && data.length > 0) setCategoryId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCats(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!amount || parseFloat(amount) <= 0) {
      return setError("Please enter a valid amount.");
    }
    if (!categoryId) {
      return setError("Please pick a category.");
    }

    setSaving(true);
    try {
      const amountSen = rmToSen(amount);
      await transactionsApi.createManual({
        amountSen,
        categoryId,
        paymentSource: source,
        occurredOn: date,
        occurredTime: time || null,
        merchant: merchant.trim() || null,
        note: note.trim() || null,
      });
      navigate("/transactions", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loadingCats) {
    return (
      <div className="p-4 text-text-muted text-center py-12">Loading…</div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-text mb-4">Add transaction</h1>
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">
            You need at least one category before adding a transaction.
          </p>
          <Link
            to="/categories"
            className="inline-block rounded-xl bg-primary text-on-primary px-5 py-3 text-sm font-semibold"
          >
            Create a category
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-text mb-4">Add transaction</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
            Amount
          </label>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-muted">RM</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-4xl font-bold text-text outline-none tabular-nums"
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = categoryId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition ${
                    active
                      ? "border-primary bg-primary-soft text-text"
                      : "border-border bg-surface text-text-muted"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: cat.color }}
                  />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Paid with
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SOURCES.map((s) => {
              const active = source === s.value;
              return (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary-soft text-text"
                      : "border-border bg-surface text-text-muted"
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date + time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Merchant */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Merchant (optional)
          </label>
          <input
            type="text"
            maxLength={100}
            placeholder="e.g. Nasi Lemak Stall"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Note (optional)
          </label>
          <textarea
            rows={2}
            maxLength={500}
            placeholder="Anything to remember"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-primary text-on-primary font-semibold py-4 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save transaction"}
        </button>
      </form>
    </div>
  );
}
