import { describe, it, expect } from "vitest";
import {
  splitEqual,
  splitCustom,
  computeMyShare,
  validateSplitPlan,
} from "../src/services/splits.js";

describe("splitEqual", () => {
  it("splits RM 30 three ways evenly", () => {
    const r = splitEqual(3000, 3);
    expect(r.myShareSen).toBe(1000);
    expect(r.perFriendSen).toBe(1000);
    expect(r.friendsTotalSen).toBe(2000);
  });

  it("absorbs the leftover sen — RM 10 three ways", () => {
    // floor(1000 / 3) = 333
    // friends: 2 × 333 = 666
    // my share: 1000 - 666 = 334
    const r = splitEqual(1000, 3);
    expect(r.perFriendSen).toBe(333);
    expect(r.friendsTotalSen).toBe(666);
    expect(r.myShareSen).toBe(334);
  });

  it("absorbs the leftover sen — RM 100 seven ways", () => {
    // floor(10000 / 7) = 1428
    // friends: 6 × 1428 = 8568
    // my share: 10000 - 8568 = 1432
    const r = splitEqual(10000, 7);
    expect(r.perFriendSen).toBe(1428);
    expect(r.friendsTotalSen).toBe(8568);
    expect(r.myShareSen).toBe(1432);
  });

  it("handles the extreme case — RM 30 seventeen ways", () => {
    // floor(3000 / 17) = 176
    // friends: 16 × 176 = 2816
    // my share: 3000 - 2816 = 184
    const r = splitEqual(3000, 17);
    expect(r.perFriendSen).toBe(176);
    expect(r.friendsTotalSen).toBe(2816);
    expect(r.myShareSen).toBe(184);
  });

  it("rejects peopleCount < 2", () => {
    expect(() => splitEqual(3000, 1)).toThrow();
  });

  it("rejects peopleCount > amountSen", () => {
    expect(() => splitEqual(100, 200)).toThrow();
  });

  it("rejects non-integer amount", () => {
    expect(() => splitEqual(30.5, 3)).toThrow();
  });

  it("always sums exactly to amountSen", () => {
    for (let amount = 100; amount <= 10000; amount += 137) {
      for (let people = 2; people <= 20; people++) {
        if (people > amount) continue;
        const r = splitEqual(amount, people);
        expect(r.myShareSen + r.friendsTotalSen).toBe(amount);
      }
    }
  });
});

describe("splitCustom", () => {
  it("computes friends total from user's share", () => {
    const r = splitCustom(3000, 1700);
    expect(r.myShareSen).toBe(1700);
    expect(r.friendsTotalSen).toBe(1300);
  });

  it("rejects myShare = 0", () => {
    expect(() => splitCustom(3000, 0)).toThrow();
  });

  it("rejects myShare = amount", () => {
    expect(() => splitCustom(3000, 3000)).toThrow();
  });

  it("rejects myShare > amount", () => {
    expect(() => splitCustom(3000, 4000)).toThrow();
  });

  it("rejects negative myShare", () => {
    expect(() => splitCustom(3000, -100)).toThrow();
  });
});

describe("computeMyShare", () => {
  it("returns null when no split mode", () => {
    expect(computeMyShare(3000, null, null)).toBeNull();
  });

  it("handles equal mode", () => {
    const r = computeMyShare(3000, "equal", { people: 3 });
    expect(r.myShareSen).toBe(1000);
  });

  it("handles custom mode", () => {
    const r = computeMyShare(3000, "custom", { myShareSen: 1700 });
    expect(r.myShareSen).toBe(1700);
  });
});

describe("validateSplitPlan", () => {
  it("accepts null split plan", () => {
    expect(validateSplitPlan(null, 3000).ok).toBe(true);
  });

  it("accepts valid equal plan", () => {
    expect(validateSplitPlan({ mode: "equal", people: 3 }, 3000).ok).toBe(true);
  });

  it("rejects equal with people < 2", () => {
    expect(validateSplitPlan({ mode: "equal", people: 1 }, 3000).ok).toBe(
      false,
    );
  });

  it("rejects equal with people > amountSen", () => {
    expect(validateSplitPlan({ mode: "equal", people: 200 }, 100).ok).toBe(
      false,
    );
  });

  it("accepts valid custom plan", () => {
    expect(
      validateSplitPlan({ mode: "custom", myShareSen: 1700 }, 3000).ok,
    ).toBe(true);
  });

  it("rejects custom with myShare = amount", () => {
    expect(
      validateSplitPlan({ mode: "custom", myShareSen: 3000 }, 3000).ok,
    ).toBe(false);
  });

  it("allows custom plan when amount is unknown (pending receipt)", () => {
    expect(
      validateSplitPlan({ mode: "custom", myShareSen: 1700 }, null).ok,
    ).toBe(true);
  });
});
