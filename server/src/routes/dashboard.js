import express from "express";
import { monthRangeInAppTz, previousMonth, todayInAppTz } from "../lib/tz.js";

const router = express.Router();

/* =========================================================
   GET /api/dashboard
   Query params:
     month=YYYY-MM   → whole month, compares against previous month
     from&to         → explicit range, no comparison
     source=...      → optional payment source filter

   Returns aggregated spending data (using my_share, not amount_paid).
   ========================================================= */
router.get("/", async (req, res, next) => {
  try {
    const source = req.query.source || null;

    let currentMonth;
    let from;
    let to;
    let prevFrom;
    let prevTo;

    if (req.query.from && req.query.to) {
      // Custom range mode
      from = req.query.from;
      to = req.query.to;
      currentMonth = null;
      prevFrom = null;
      prevTo = null;
    } else {
      // Month mode
      currentMonth = req.query.month || todayInAppTz().slice(0, 7);
      const range = monthRangeInAppTz(currentMonth);
      from = range.from;
      to = range.to;
      const prevMonth = previousMonth(currentMonth);
      const prevRange = monthRangeInAppTz(prevMonth);
      prevFrom = prevRange.from;
      prevTo = prevRange.to;
    }

    // Validate dates look like YYYY-MM-DD
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // Base query builder — only counts 'ok' and 'needs_review' (skips pending)
    function baseQuery(f, t, src) {
      let q = req.supabase
        .from("transactions")
        .select(
          "id, my_share, amount_paid, merchant, category_id, payment_source, status",
        )
        .gte("occurred_on", f)
        .lte("occurred_on", t)
        .in("status", ["ok", "needs_review"]);
      if (src) q = q.eq("payment_source", src);
      return q;
    }

    const [currentRes, prevRes, catsRes, pendingRes] = await Promise.all([
      baseQuery(from, to, source),
      prevFrom && prevTo
        ? baseQuery(prevFrom, prevTo, source)
        : Promise.resolve({ data: [] }),
      req.supabase.from("categories").select("id, name, color"),
      req.supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    if (currentRes.error) throw currentRes.error;
    if (prevRes.error) throw prevRes.error;
    if (catsRes.error) throw catsRes.error;

    const current = currentRes.data || [];
    const prev = prevRes.data || [];
    const categories = catsRes.data || [];
    const pendingCount = pendingRes.count || 0;

    const sum = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0);

    const totalCurrent = sum(current, "my_share");
    const totalPrev = sum(prev, "my_share");
    const diff = totalCurrent - totalPrev;

    // Category totals
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const catTotalsMap = new Map();
    for (const t of current) {
      const key = t.category_id;
      catTotalsMap.set(key, (catTotalsMap.get(key) || 0) + (t.my_share || 0));
    }
    const categoryTotals = Array.from(catTotalsMap.entries())
      .map(([catId, total]) => ({
        categoryId: catId,
        name: catMap.get(catId)?.name || "Unknown",
        color: catMap.get(catId)?.color || "#888888",
        total,
      }))
      .sort((a, b) => b.total - a.total);

    // Top merchants (case-insensitive)
    const merchMap = new Map();
    for (const t of current) {
      if (!t.merchant) continue;
      const key = t.merchant.toLowerCase();
      const existing = merchMap.get(key);
      if (existing) {
        existing.total += t.my_share || 0;
        existing.count += 1;
      } else {
        merchMap.set(key, {
          merchant: t.merchant,
          total: t.my_share || 0,
          count: 1,
        });
      }
    }
    const topMerchants = Array.from(merchMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Biggest expenses
    const biggest = [...current]
      .sort((a, b) => (b.my_share || 0) - (a.my_share || 0))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        merchant: t.merchant || "Unknown merchant",
        amount: t.my_share || 0,
        categoryId: t.category_id,
      }));

    res.json({
      month: currentMonth,
      from,
      to,
      isCustomRange: !currentMonth,
      total: totalCurrent,
      previousTotal: totalPrev,
      diff,
      categoryTotals,
      topMerchants,
      biggest,
      pendingCount,
      transactionCount: current.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
