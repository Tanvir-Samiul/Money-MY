import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { get } from "idb-keyval";

export default function ShareTarget() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [fileInfo, setFileInfo] = useState(null);

  const id = params.get("id");

  useEffect(() => {
    if (!id) {
      setStatus("no-id");
      return;
    }

    get(`share-file-${id}`)
      .then((entry) => {
        if (!entry) {
          setStatus("not-found");
          return;
        }
        setFileInfo({
          name: entry.name,
          size: entry.size,
          type: entry.type,
        });
        setStatus("ready");
      })
      .catch((err) => {
        console.error("[share] failed to read:", err);
        setStatus("error");
      });
  }, [id]);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-text mb-4">Shared receipt</h1>

      {status === "loading" && (
        <p className="text-text-muted">Reading the shared file…</p>
      )}

      {status === "no-id" && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-text-muted text-sm mb-4">
            Nothing was shared. Try again from the Share menu.
          </p>
          <button
            onClick={() => navigate("/add/upload")}
            className="rounded-xl bg-primary text-on-primary px-5 py-3 text-sm font-semibold"
          >
            Upload manually instead
          </button>
        </div>
      )}

      {status === "not-found" && (
        <div className="rounded-2xl border border-amber/40 bg-amber/10 p-6">
          <p className="text-sm text-text">
            The shared file couldn't be found. It may have expired.
          </p>
          <button
            onClick={() => navigate("/add/upload")}
            className="mt-4 rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
          >
            Upload manually
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-red/30 bg-red/10 p-4">
          <p className="text-sm text-red">
            Something went wrong reading the file.
          </p>
        </div>
      )}

      {status === "ready" && fileInfo && (
        <div className="rounded-2xl border border-green/30 bg-green/10 p-6 space-y-2">
          <p className="text-sm font-semibold text-text">
            ✅ Shared file received!
          </p>
          <p className="text-xs text-text-muted">Name: {fileInfo.name}</p>
          <p className="text-xs text-text-muted">
            Size: {(fileInfo.size / 1024).toFixed(1)} KB
          </p>
          <p className="text-xs text-text-muted">Type: {fileInfo.type}</p>
          <p className="text-[11px] text-text-muted mt-4">
            (Phase 6b will add the category picker and save flow here.)
          </p>
          <button
            onClick={() => navigate("/add/upload")}
            className="mt-4 rounded-xl bg-primary text-on-primary px-4 py-2 text-sm font-semibold"
          >
            Continue to upload page
          </button>
        </div>
      )}
    </div>
  );
}
