import { db } from "./db";
import { hashSecretToken } from "./security/tokens";

export async function findInterviewByToken(token: string) {
  const [row] =
    await db()`SELECT c.*,j.title,j.description,j.rubric FROM candidate_interviews c JOIN jobs j ON j.id=c.job_id WHERE c.invite_token_hash=${hashSecretToken(token)}`;
  return row;
}
