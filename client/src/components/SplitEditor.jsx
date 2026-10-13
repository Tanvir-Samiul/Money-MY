import { useState } from "react";

const PRESETS = [2, 3, 4, 5, 6, 7, 8];

/**
 * SplitEditor
 *
 * Renders the split panel. Parent holds the state and receives updates
 * via onChange.
 *
 * Props:
 *   amountSen  number | null   — the transaction amount in sen (null if unknown / pending)
 *   value      object | null   — the current split plan
 *                                { mode: "equal",  people: 3 }
 *                                { mode: "custom", myShareSen: 1700 }
 *                                null = no split
 *   onChange   (value) => void — called with the new plan (or null when toggled off)
 */
export default function SplitEditor({ amountSen, value, onChange }) {
  const [showMoreInput, setShowMoreInput] = useState(false);
  const [moreCount, setMoreCount] = useState("");
  const [customInput, setCustomInput] = useState(
    value?.mode === "custom" && value.myShareSen
      ? (value.myShareSen / 100).toFixed(2)
      : "",
  );

  const splitOn = value !== null;
  const mode = value?.mode || "equal";

  // ---- Handlers ----
  function toggleSplit(on) {
    if (!on) {
      onChange(null);
      setShowMoreInput(false);
      setMoreCount("");
      setCustomInput("");
      return;
    }
    // Default to equal, 2 people
    onChange({ mode: "equal", people: 2 });
  }

  function setMode(newMode) {
    if (newMode === mode) return;

    if (newMode === "equal") {
      onChange({ mode: "equal", people: 2 });
      setCustomInput("");
    } else {
      onChange({ mode: "custom", myShareSen: 0 });
      setShowMoreInput(false);
      setMoreCount("");
    }
  }

  function pickPreset(n) {
    onChange({ mode: "equal", people: n });
    setShowMoreInput(false);
    setMoreCount("");
  }

  function applyMoreCount() {
    const n = parseInt(moreCount, 10);
    if (!Number.isInteger(n) || n < 2 || n > 100) return;
    onChange({ mode: "equal", people: n });
    setShowMoreInput(false);
    setMoreCount("");
  }

  function applyCustomInput(raw) {
    setCustomInput(raw);
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) {
      onChange({ mode: "custom", myShareSen: 0 });
      return;
    }
    onChange({ mode: "custom", myShareSen: Math.round(n * 100) });
  }

  // ---- Derived preview ----
  let preview = null;

  if (splitOn && amountSen != null) {
    if (mode === "equal" && value.people >= 2) {
      const perPerson = Math.floor(amountSen / value.people);
      const friendsTotal = perPerson * (value.people - 1);
      const myShare = amountSen - friendsTotal;
      preview = {
        each: perPerson,
        myShare,
        friendsTotal,
      };
    } else if (mode === "custom" && value.myShareSen > 0) {
      const friendsTotal = amountSen - value.myShareSen;
      preview = {
        myShare: value.myShareSen,
        friendsTotal,
      };
    }
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
          Split with friends?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleSplit(false)}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
              !splitOn
                ? "border-primary bg-primary-soft text-text"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => toggleSplit(true)}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
              splitOn
                ? "border-primary bg-primary-soft text-text"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            Yes
          </button>
        </div>
      </div>

      {splitOn && (
        <>
          {/* Mode tabs */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
              How to split?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("equal")}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  mode === "equal"
                    ? "border-primary bg-primary-soft text-text"
                    : "border-border bg-surface text-text-muted"
                }`}
              >
                Equal
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  mode === "custom"
                    ? "border-primary bg-primary-soft text-text"
                    : "border-border bg-surface text-text-muted"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Equal mode */}
          {mode === "equal" && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                How many people?
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((n) => {
                  const active = value.people === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pickPreset(n)}
                      className={`min-w-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-primary bg-primary-soft text-text"
                          : "border-border bg-surface text-text-muted"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowMoreInput((s) => !s)}
                  className={`min-w-[44px] rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    value.people > 8
                      ? "border-primary bg-primary-soft text-text"
                      : "border-border bg-surface text-text-muted"
                  }`}
                >
                  {value.people > 8 ? value.people : "More…"}
                </button>
              </div>

              {showMoreInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min="2"
                    max="100"
                    placeholder="e.g. 17"
                    value={moreCount}
                    onChange={(e) => setMoreCount(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={applyMoreCount}
                    className="rounded-xl bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold"
                  >
                    Set
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom mode */}
          {mode === "custom" && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                Your share
              </label>
              <div className="flex items-baseline gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                <span className="text-lg font-bold text-text-muted">RM</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customInput}
                  onChange={(e) => applyCustomInput(e.target.value)}
                  className="flex-1 bg-transparent text-2xl font-bold text-text outline-none tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {amountSen == null ? (
            <div className="rounded-xl border border-border bg-surface px-3 py-3 text-xs text-text-muted">
              ⏳ Shares will be calculated after the receipt is read.
            </div>
          ) : preview ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-1 text-sm">
              {mode === "equal" && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Each pays</span>
                  <span className="text-text tabular-nums">
                    RM {(preview.each / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-muted">Your share</span>
                <span className="font-semibold text-text tabular-nums">
                  RM {(preview.myShare / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Friends</span>
                <span className="text-text tabular-nums">
                  RM {(preview.friendsTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface px-3 py-3 text-xs text-text-muted">
              {mode === "custom"
                ? "Enter your share to see the preview."
                : "Pick at least 2 people."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
