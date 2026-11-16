// PROTOTYPE, throwaway: criterion 3 — is triggering easy to mock in vitest?
import { vi, it, expect, beforeEach } from "vitest";

const trigger = vi.fn();
vi.mock("@knocklabs/node", () => ({
  default: class { workflows = { trigger }; },
}));

const { notifyNewQuestion } = await import("./notify.prototype");

beforeEach(() => trigger.mockReset());

it("triggers the workflow for the instructor", async () => {
  await notifyNewQuestion({ instructorId: 1, askerId: 2, questionId: 9 });
  expect(trigger).toHaveBeenCalledWith("prototype-new-question", {
    recipients: ["1"], actor: "2", data: { questionId: 9 },
  });
});

it("never notifies someone of their own action", async () => {
  await notifyNewQuestion({ instructorId: 1, askerId: 1, questionId: 9 });
  expect(trigger).not.toHaveBeenCalled();
});
