import { z } from "zod";

export const competencySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(500),
  weight: z.number().int().min(1).max(97),
});

export const rubricSchema = z
  .object({ competencies: z.array(competencySchema).length(4) })
  .superRefine(({ competencies }, context) => {
    if (
      competencies.reduce((sum, competency) => sum + competency.weight, 0) !==
      100
    ) {
      context.addIssue({
        code: "custom",
        message: "Competency weights must total 100",
      });
    }
  });

export type Rubric = z.infer<typeof rubricSchema>;
