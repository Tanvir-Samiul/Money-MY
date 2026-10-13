import { precacheAndRoute } from "workbox-precaching";
import { set, get, del } from "idb-keyval";

// Precache all build assets (Workbox injects the manifest at build time)
precacheAndRoute(self.__WB_MANIFEST || []);

const DB_KEY_PREFIX = "share-file-";

/**
 * Intercept POST /share-target.
 * Android sends the shared file(s) as multipart/form-data.
 * We save it in IndexedDB and redirect to /share?id=<uuid>.
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname !== "/share-target" || event.request.method !== "POST") {
    return;
  }

  event.respondWith(handleShareTarget(event.request));
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();

    // -------- DEBUG: log everything the SW receives --------
    const debugEntries = [];
    for (const [key, value] of formData.entries()) {
      debugEntries.push({
        key,
        typeof: typeof value,
        isFile: value instanceof File,
        constructor: value?.constructor?.name,
        size: value?.size,
        mimeType: value?.type,
        name: value?.name,
      });
    }
    console.log("[sw] share-target formData keys:", debugEntries);

    // -------- Extract file(s) --------
    // Try the declared field name first
    let files = formData.getAll("receipt");

    // If empty, walk the form and pick up any File/Blob-like object
    if (files.length === 0) {
      for (const [, value] of formData.entries()) {
        if (
          value &&
          typeof value === "object" &&
          "size" in value &&
          "type" in value
        ) {
          files.push(value);
        }
      }
    }

    // Filter out anything that doesn't look like a file
    files = files.filter(
      (f) => f && typeof f === "object" && typeof f.size === "number",
    );

    console.log("[sw] files after extraction:", files.length);

    if (files.length === 0) {
      // No file was shared — bounce to the upload page
      return Response.redirect("/add/upload", 303);
    }

    const file = files[0];
    const id = crypto.randomUUID();

    await set(DB_KEY_PREFIX + id, {
      id,
      name: file.name || "receipt",
      type: file.type || "application/octet-stream",
      size: file.size,
      blob: file,
      createdAt: Date.now(),
    });

    const text = formData.get("text");
    if (text) {
      await set(DB_KEY_PREFIX + id + "-text", String(text));
    }

    console.log("[sw] stored file with id:", id);
    return Response.redirect(`/share?id=${id}`, 303);
  } catch (err) {
    console.error("[sw] share-target failed:", err);
    return Response.redirect("/add/upload", 303);
  }
}

// Clean up files older than 1 hour when the SW activates
self.addEventListener("activate", (event) => {
  event.waitUntil(cleanupOldShares());
});

async function cleanupOldShares() {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("keyval-store");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction("keyval", "readonly");
    const store = tx.objectStore("keyval");
    const keys = await new Promise((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const key of keys) {
      if (typeof key !== "string" || !key.startsWith(DB_KEY_PREFIX)) continue;
      if (key.endsWith("-text")) continue;

      const value = await get(key);
      if (value && value.createdAt && value.createdAt < oneHourAgo) {
        await del(key);
        await del(key + "-text");
      }
    }
  } catch (err) {
    console.warn("[sw] cleanup skipped:", err);
  }
}
