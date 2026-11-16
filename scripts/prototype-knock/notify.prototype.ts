// PROTOTYPE, throwaway: the smallest server-side trigger, to see how mockable it is.
import Knock from "@knocklabs/node";

const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY ?? "sk_missing" });

export async function notifyNewQuestion(input: { instructorId: number; askerId: number; questionId: number }) {
  if (input.instructorId === input.askerId) return; // never notify someone of their own action
  await knock.workflows.trigger("prototype-new-question", {
    recipients: [String(input.instructorId)],
    actor: String(input.askerId),
    data: { questionId: input.questionId },
  });
}
