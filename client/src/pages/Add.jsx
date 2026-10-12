import { useNavigate } from "react-router-dom";

export default function Add() {
  const navigate = useNavigate();

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-text mb-6">Add transaction</h1>

      <div className="space-y-3">
        <button
          onClick={() => navigate("/add/upload")}
          className="w-full flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-primary transition text-left"
        >
          <span className="text-3xl">📷</span>
          <div className="flex-1">
            <p className="font-semibold text-text">Upload a receipt</p>
            <p className="text-xs text-text-muted mt-0.5">
              Pick a screenshot or PDF. The amount, date, and merchant are read
              automatically.
            </p>
          </div>
          <span className="text-text-muted self-center">→</span>
        </button>

        <button
          onClick={() => navigate("/add/manual")}
          className="w-full flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 hover:border-primary transition text-left"
        >
          <span className="text-3xl">✍️</span>
          <div className="flex-1">
            <p className="font-semibold text-text">Enter manually</p>
            <p className="text-xs text-text-muted mt-0.5">
              For cash payments or when you don't have a receipt.
            </p>
          </div>
          <span className="text-text-muted self-center">→</span>
        </button>
      </div>
    </div>
  );
}
