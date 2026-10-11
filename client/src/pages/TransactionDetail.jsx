import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { categoriesApi, transactionsApi } from "../lib/api.js";
import { rmToSen, senToRm, formatSen } from "../lib/money.js";

const SOURCES = [
  { value: "cash", label: "Cash" },
  { value: "touch_n_go", label: "Touch 'n Go" },
  { value: "maybank", label: "Maybank" },
  { value: "merchantrade", label: "Merchantrade" },
];

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tx, setTx] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("cash");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [txData, cats] = await Promise.all([
          transactionsApi.get(id),
          categoriesApi.list(),
        ]);
        setTx(txData);
        setCategories(cats || []);
        setAmount(String(senToRm(txData.amount_paid || 0)));
        setCategoryId(txData.category_id);
        setSource(txData.payment_source || "cash");
        setDate(txData.occurred_on || "");
        setTime(txData.occurred_time?.slice(0, 5) || "");
        setMerchant(txData.merchant || "");
        setNote(txData.note || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await transactionsApi.update(id, {
        amountSen: rmToSen(amount),
        categoryId,
        paymentSource: source,
        occurredOn: date,
        occurredTime: time || null,
        merchant: merchant.trim() || null,
        note: note.trim() || null,
      });
      navigate("/transactions");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await transactionsApi.delete(id);
      navigate("/transactions");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-text-muted py-12">Loading…</div>
    );
  }

  if (!tx) {
    return (
      <div className="p-4">
        <p className="text-red text-sm">{error || "Transaction not found."}</p>
        <button
          onClick={() => navigate("/transactions")}
          className="mt-4 text-primary text-sm"
        >
          ← Back to transactions
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-text-muted mb-4"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-text mb-1">
        {tx.merchant || "Transaction"}
      </h1>
      <p className="text-sm text-text-muted mb-6">
        {formatSen(tx.amount_paid || 0)} ·{" "}
        {tx.entry_type === "manual" ? "Manual" : "Receipt"}
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
            Amount
          </label>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-muted">RM</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-4xl font-bold text-text outline-none tabular-nums"
            />
          </div>
        </div>

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
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
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
        </div>

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

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Merchant
          </label>
          <input
            type="text"
            maxLength={100}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Note
          </label>
          <textarea
            rows={2}
            maxLength={500}
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
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="w-full rounded-xl border border-red text-red font-semibold py-3 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete transaction"}
        </button>
      </form>
    </div>
  );
}
