import { describe, expect, it } from "vitest";
import { bucketFor } from "@/server/accounting/aging";

describe("aging buckets", () => {
  it("maps overdue days to the reporting buckets", () => {
    expect(bucketFor(0)).toBe("current");
    expect(bucketFor(-5)).toBe("current");
    expect(bucketFor(1)).toBe("d1_30");
    expect(bucketFor(30)).toBe("d1_30");
    expect(bucketFor(31)).toBe("d31_60");
    expect(bucketFor(60)).toBe("d31_60");
    expect(bucketFor(61)).toBe("d61_90");
    expect(bucketFor(90)).toBe("d61_90");
    expect(bucketFor(91)).toBe("over90");
    expect(bucketFor(400)).toBe("over90");
  });
});
