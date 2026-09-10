import { describe, expect, it } from "vitest";
import { rubricSchema } from "./rubric";

describe("rubric schema", () => {
  const competency = (weight: number) => ({
    name: "Technical depth",
    description: "Explains relevant decisions and trade-offs.",
    weight,
  });

  it("accepts exactly four competencies totaling 100", () => {
    const result = rubricSchema.safeParse({
      competencies: [
        competency(25),
        competency(25),
        competency(25),
        competency(25),
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects weights that do not total 100", () => {
    const result = rubricSchema.safeParse({
      competencies: [
        competency(20),
        competency(20),
        competency(20),
        competency(20),
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a rubric with fewer than four competencies", () => {
    const result = rubricSchema.safeParse({
      competencies: [competency(50), competency(50)],
    });
    expect(result.success).toBe(false);
  });
});
