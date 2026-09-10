import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { jobDescriptionUploadSchema } from "@/domain/candidate";
import { extractJobDescriptionText } from "@/server/resume";

export async function POST(request: Request) {
  if (!(await auth())?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a job-description PDF." },
      { status: 400 },
    );
  }

  const validated = jobDescriptionUploadSchema.safeParse({
    mimeType: file.type,
    size: file.size,
  });
  if (!validated.success) {
    return NextResponse.json(
      { error: "Use a PDF no larger than 5 MB." },
      { status: 400 },
    );
  }

  try {
    const text = await extractJobDescriptionText(
      new Uint8Array(await file.arrayBuffer()),
    );
    if (text.length < 20) {
      return NextResponse.json(
        {
          error:
            "We could not find enough selectable text. Paste the description manually if this is a scanned PDF.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not read this PDF. Try another file or paste the description manually.",
      },
      { status: 422 },
    );
  }
}
