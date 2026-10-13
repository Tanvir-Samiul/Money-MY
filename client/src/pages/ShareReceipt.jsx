import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { categoriesApi, receiptsApi } from "../lib/api.js";
import SplitEditor from "../components/SplitEditor.jsx";

const SOURCES = [
  { value: "", label: "Auto detect" },
  { value: "touch_n_go", label: "Touch 'n Go" },
  { value: "maybank", label: "Maybank" },
  { value: "merchantrade", label: "Merchantrade" },
  { value: "cash", label: "Cash" },
];

export default function ShareReceipt() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [splitPlan, setSplitPlan] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(null);

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

  // Clean up preview URL when the file changes or unmounts
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(f) {
    if (!f) return;
    setError("");
    setDuplicate(null);
    setFile(f);

    if (f.type.startsWith("image/")) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null); // PDF — no preview
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setDuplicate(null);

    if (!file) return setError("Please pick a file.");
    if (!categoryId) return setError("Please pick a category.");

    setSaving(true);
    try {
      await receiptsApi.upload({
        file,
        categoryId,
        note: note.trim() || undefined,
        paymentSource: source || undefined,
        splitPlan: splitPlan || undefined,
      });
      navigate("/transactions", { replace: true });
    } catch (err) {
      if (err.status === 409 && err.body?.existing) {
        setDuplicate(err.body.existing);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function forceUpload() {
    if (!file || !categoryId) return;
    setSaving(true);
    setError("");
    try {
      await receiptsApi.upload({
        file,
        categoryId,
        note: note.trim() || undefined,
        paymentSource: source || undefined,
        splitPlan: splitPlan || undefined,
        force: true,
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
      <div className="p-4 text-center text-text-muted py-12">Loading…</div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-4 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-text-muted mb-4"
        >
          ← Back
        </button>
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">
            Add a category first — every transaction needs one.
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
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-text-muted mb-4"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-text mb-4">Upload receipt</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition ${
            file ? "border-primary bg-primary-soft" : "border-border bg-surface"
          }`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Receipt preview"
              className="mx-auto max-h-64 rounded-lg"
            />
          ) : file ? (
            <p className="text-sm text-text py-8">📄 {file.name}</p>
          ) : (
            <>
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm font-medium text-text">
                Tap to pick a receipt
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                JPEG, PNG, WebP, or PDF · max 10 MB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {file && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-text-muted underline"
          >
            Choose a different file
          </button>
        )}

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

        {/* Payment source (optional) */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Paid with (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => {
              const active = source === s.value;
              return (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
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

        {/* Note (optional) */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Note (optional)
          </label>
          <input
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything to remember"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary"
          />
        </div>

        {/* Split */}
        <SplitEditor
          amountSen={null}
          value={splitPlan}
          onChange={setSplitPlan}
        />

        {/* Duplicate warning */}
        {duplicate && (
          <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-text">
              ⚠️ You already saved this receipt
            </p>
            <p className="text-xs text-text-muted">
              {duplicate.merchant || "Unknown merchant"} ·{" "}
              {duplicate.amount_paid != null
                ? `RM ${(duplicate.amount_paid / 100).toFixed(2)}`
                : "amount pending"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="flex-1 rounded-xl border border-border text-text font-semibold py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={forceUpload}
                disabled={saving}
                className="flex-1 rounded-xl bg-amber text-white font-semibold py-2 text-sm disabled:opacity-50"
              >
                Save anyway
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
            {error}
          </div>
        )}

        {/* Submit */}
        {!duplicate && (
          <button
            type="submit"
            disabled={saving || !file}
            className="w-full rounded-xl bg-primary text-on-primary font-semibold py-4 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save receipt"}
          </button>
        )}

        <p className="text-[11px] text-text-muted text-center">
          The receipt will be read automatically in the background.
        </p>
      </form>
    </div>
  );
}
