import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rubricSchema } from "@/domain/rubric";
import { db } from "@/server/db";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(12000),
  supportingDetails: z.string().trim().max(4000).optional(),
  rubric: rubricSchema,
});
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json(
      { error: "The role or rubric is invalid." },
      { status: 400 },
    );
  const [job] =
    await db()`INSERT INTO jobs(owner_id,title,description,supporting_details,rubric) VALUES(${session.user.id},${input.data.title},${input.data.description},${input.data.supportingDetails || null},${db().json(input.data.rubric)}) RETURNING id`;
  return NextResponse.json(job, { status: 201 });
}
