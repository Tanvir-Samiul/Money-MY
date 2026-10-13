/**
 * Split math.
 *
 * RULE: money is integer sen. Never floats.
 *
 * The user always absorbs any leftover sen, so friends' shares always add up
 * exactly to amountPaid - myShare.
 */

/**
 * Equal split.
 * Given a total and a number of people (including the user),
 * compute how much each friend pays and how much the user pays.
 *
 * @param {number} amountSen - integer sen, the total paid
 * @param {number} peopleCount - total people, including the user (>= 2)
 * @returns {{ myShareSen: number, friendsTotalSen: number, perFriendSen: number }}
 */
export function splitEqual(amountSen, peopleCount) {
  if (!Number.isInteger(amountSen) || amountSen <= 0) {
    throw new Error("amountSen must be a positive integer");
  }
  if (!Number.isInteger(peopleCount) || peopleCount < 2) {
    throw new Error("peopleCount must be an integer >= 2");
  }
  if (peopleCount > amountSen) {
    // e.g. RM 1.00 split 200 ways → each person would pay 0 sen.
    // Not meaningful. Cap it.
    throw new Error("peopleCount cannot exceed amountSen");
  }

  const friendsCount = peopleCount - 1;
  const perFriendSen = Math.floor(amountSen / peopleCount);
  const friendsTotalSen = perFriendSen * friendsCount;
  const myShareSen = amountSen - friendsTotalSen;

  return { myShareSen, friendsTotalSen, perFriendSen };
}

/**
 * Custom split.
 * The user types their own share. The rest is friends' total.
 * Friends' total is not subdivided here — that's display-only.
 *
 * @param {number} amountSen - integer sen
 * @param {number} myShareSen - integer sen, strictly between 0 and amountSen
 * @returns {{ myShareSen: number, friendsTotalSen: number }}
 */
export function splitCustom(amountSen, myShareSen) {
  if (!Number.isInteger(amountSen) || amountSen <= 0) {
    throw new Error("amountSen must be a positive integer");
  }
  if (!Number.isInteger(myShareSen)) {
    throw new Error("myShareSen must be an integer");
  }
  if (myShareSen <= 0) {
    throw new Error("Your share must be more than RM 0");
  }
  if (myShareSen >= amountSen) {
    throw new Error("Your share must be less than the total");
  }

  return {
    myShareSen,
    friendsTotalSen: amountSen - myShareSen,
  };
}

/**
 * Recompute my_share from a stored split_plan.
 * Used by the queue worker after extraction finishes on a pending receipt.
 *
 * @param {number} amountSen - integer sen
 * @param {string|null} splitMode - 'equal' | 'custom' | null
 * @param {object|null} splitMeta - { people } or { myShareSen } or null
 * @returns {{ myShareSen: number, friendsTotalSen: number } | null}
 */
export function computeMyShare(amountSen, splitMode, splitMeta) {
  if (!splitMode || !splitMeta) {
    return null;
  }

  if (splitMode === "equal") {
    const { myShareSen, friendsTotalSen } = splitEqual(
      amountSen,
      splitMeta.people,
    );
    return { myShareSen, friendsTotalSen };
  }

  if (splitMode === "custom") {
    return splitCustom(amountSen, splitMeta.myShareSen);
  }

  return null;
}

/**
 * Validate a split_plan object coming from the client.
 * Returns { ok: true } or { ok: false, error: "message" }.
 */
export function validateSplitPlan(splitPlan, amountSen) {
  if (!splitPlan) return { ok: true }; // no split is valid

  const { mode, people, myShareSen } = splitPlan;

  if (mode === "equal") {
    if (!Number.isInteger(people) || people < 2) {
      return { ok: false, error: "Split: pick at least 2 people" };
    }
    if (amountSen != null && people > amountSen) {
      return {
        ok: false,
        error: "Split: too many people for this amount",
      };
    }
    return { ok: true };
  }

  if (mode === "custom") {
    if (!Number.isInteger(myShareSen) || myShareSen <= 0) {
      return { ok: false, error: "Split: enter your share" };
    }
    if (amountSen != null && myShareSen >= amountSen) {
      return {
        ok: false,
        error: "Split: your share must be less than the total",
      };
    }
    return { ok: true };
  }

  return { ok: false, error: "Split: unknown mode" };
}
