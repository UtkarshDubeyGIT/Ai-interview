import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateRubric } from "@/server/ai/rubric";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(12000),
  supportingDetails: z.string().trim().max(4000).optional(),
});
export async function POST(request: Request) {
  if (!(await auth())?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "Add a title and a more detailed job description." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await generateRubric(input.data));
  } catch (error) {
    console.error("rubric_generation_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Rubric generation failed. Try again." },
      { status: 502 },
    );
  }
}
