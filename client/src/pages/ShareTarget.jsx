import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { get, del } from "idb-keyval";
import { categoriesApi, receiptsApi } from "../lib/api.js";
import SplitEditor from "../components/SplitEditor.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const SOURCES = [
  { value: "", label: "Auto detect" },
  { value: "touch_n_go", label: "Touch 'n Go" },
  { value: "maybank", label: "Maybank" },
  { value: "merchantrade", label: "Merchantrade" },
  { value: "cash", label: "Cash" },
];

const DB_KEY_PREFIX = "share-file-";

export default function ShareTarget() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState("loading"); // loading | ready | no-id | not-found | error
  const [file, setFile] = useState(null); // File object
  const [preview, setPreview] = useState(null); // object URL for images

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [splitPlan, setSplitPlan] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const id = params.get("id");

  // ----- Load the shared file from IndexedDB -----
  useEffect(() => {
    if (!id) {
      setStatus("no-id");
      return;
    }

    get(DB_KEY_PREFIX + id)
      .then((entry) => {
        if (!entry || !entry.blob) {
          setStatus("not-found");
          return;
        }

        // Rebuild a File object from the stored blob
        const f = new File([entry.blob], entry.name || "receipt", {
          type: entry.type || "application/octet-stream",
        });
        setFile(f);

        if (f.type.startsWith("image/")) {
          setPreview(URL.createObjectURL(f));
        }

        setStatus("ready");
      })
      .catch((err) => {
        console.error("[share] failed to read:", err);
        setStatus("error");
      });
  }, [id]);

  // ----- Load categories once logged in -----
  useEffect(() => {
    if (!user) return;
    categoriesApi
      .list()
      .then((data) => {
        setCategories(data || []);
        if (data && data.length > 0) setCategoryId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  // ----- Clean up the preview URL -----
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ----- Delete the share from IndexedDB after successful save -----
  async function cleanupShared() {
    if (!id) return;
    try {
      await del(DB_KEY_PREFIX + id);
      await del(DB_KEY_PREFIX + id + "-text");
    } catch (err) {
      console.warn("[share] cleanup failed:", err);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");

    if (!file) return setError("No file to save.");
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
      await cleanupShared();
      navigate("/transactions", { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setError(
          "You already saved this receipt. Open Transactions to see it.",
        );
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDiscard() {
    if (!confirm("Discard this shared receipt?")) return;
    await cleanupShared();
    navigate("/transactions", { replace: true });
  }

  // ----- Auth gate: if not logged in, redirect to login and come back -----
  if (authLoading) {
    return (
      <div className="p-4 text-center text-text-muted py-12">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 pb-24">
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-6 space-y-3">
          <p className="text-sm font-semibold text-text">
            Sign in to save this receipt
          </p>
          <p className="text-xs text-text-muted">
            The file is saved locally and will still be here after you log in.
          </p>
          <Link
            to="/login"
            state={{ from: { pathname: `/share?id=${id}` } }}
            className="inline-block rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // ----- Status: not found / no id -----
  if (status === "no-id" || status === "not-found") {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-text mb-4">Shared receipt</h1>
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">
            Nothing to save. Try sharing again from the app menu.
          </p>
          <Link
            to="/add/upload"
            className="inline-block rounded-xl bg-primary text-on-primary px-5 py-3 text-sm font-semibold"
          >
            Upload manually instead
          </Link>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="p-4 text-center text-text-muted py-12">
        Reading the shared file…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-4 pb-24">
        <h1 className="text-2xl font-bold text-text mb-4">Shared receipt</h1>
        <div className="rounded-2xl border border-red/30 bg-red/10 p-4">
          <p className="text-sm text-red">
            Couldn't read the shared file. Try again.
          </p>
        </div>
      </div>
    );
  }

  // ----- Status: ready — show the save form -----
  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-text-muted mb-4"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-text mb-4">Shared receipt</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Preview */}
        <div className="rounded-2xl border border-border bg-surface p-3">
          {preview ? (
            <img
              src={preview}
              alt="Shared receipt"
              className="mx-auto max-h-72 rounded-lg"
            />
          ) : (
            <p className="text-sm text-text py-8 text-center">
              📄 {file?.name || "Receipt"}
            </p>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
            Category
          </label>
          {categories.length === 0 ? (
            <p className="text-xs text-text-muted">
              No categories yet.{" "}
              <Link to="/categories" className="text-primary underline">
                Create one
              </Link>
            </p>
          ) : (
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
          )}
        </div>

        {/* Payment source */}
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

        {/* Note */}
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

        {error && (
          <div className="rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !file}
          className="w-full rounded-xl bg-primary text-on-primary font-semibold py-4 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save receipt"}
        </button>

        <button
          type="button"
          onClick={handleDiscard}
          className="w-full rounded-xl border border-border text-text-muted font-semibold py-3 text-sm"
        >
          Discard
        </button>

        <p className="text-[11px] text-text-muted text-center">
          The receipt will be read automatically in the background.
        </p>
      </form>
    </div>
  );
}
