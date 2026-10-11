import { useEffect, useState } from "react";
import { categoriesApi } from "../lib/api.js";

const PALETTE = [
  "#0F766E",
  "#F59E0B",
  "#2563EB",
  "#DB2777",
  "#7C3AED",
  "#EA580C",
  "#65A30D",
  "#0891B2",
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await categoriesApi.list();
      setCategories(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setColor(PALETTE[0]);
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setColor(PALETTE[0]);
    setShowForm(true);
  }

  function openEdit(cat) {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await categoriesApi.update(editingId, { name: name.trim(), color });
      } else {
        await categoriesApi.create({ name: name.trim(), color });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat) {
    const confirmed = confirm(`Delete category "${cat.name}"?`);
    if (!confirmed) return;

    try {
      await categoriesApi.delete(cat.id);
      await load();
    } catch (err) {
      if (err.status === 400 && err.body?.transactionCount) {
        // Category has transactions — ask for a replacement
        const options = categories.filter((c) => c.id !== cat.id);
        if (options.length === 0) {
          alert(
            "This category has transactions but there is no other category to move them to. Create another category first."
          );
          return;
        }
        const names = options.map((c) => `${c.name}`).join(", ");
        const target = prompt(
          `Move ${err.body.transactionCount} transaction(s) to which category?\nOptions: ${names}\nEnter the exact name:`
        );
        if (!target) return;
        const targetCat = options.find(
          (c) => c.name.toLowerCase() === target.toLowerCase()
        );
        if (!targetCat) {
          alert("Category not found.");
          return;
        }
        try {
          await categoriesApi.delete(cat.id, targetCat.id);
          await load();
        } catch (err2) {
          setError(err2.message);
        }
      } else {
        setError(err.message);
      }
    }
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Categories</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
        >
          + Add
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red text-sm px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-text-muted py-12">Loading…</p>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm">No categories yet.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
          >
            Add your first category
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <span
                className="w-8 h-8 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
              <span className="flex-1 font-medium text-text">{cat.name}</span>
              <button
                onClick={() => openEdit(cat)}
                className="text-xs text-text-muted hover:text-primary px-2"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="text-xs text-red hover:opacity-70 px-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-border p-5">
            <h2 className="text-lg font-bold text-text mb-4">
              {editingId ? "Edit category" : "New category"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-full transition ${
                        color === c
                          ? "ring-2 ring-offset-2 ring-primary ring-offset-surface"
                          : ""
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-border text-text font-semibold py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-primary text-on-primary font-semibold py-2.5 text-sm disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
