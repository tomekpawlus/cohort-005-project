// PROTOTYPE, throwaway: "Does Knock hold up after prototyping?" — not production code.
// Checks: per-user signed token under the DevUI switcher, headless feed list,
// unread/unseen counts, mark as read/seen. Visit /prototype/knock-feed.
import { useEffect, useState } from "react";
import { Form } from "react-router";
import Knock, { signUserToken } from "@knocklabs/node";
import type { Route } from "./+types/prototype.knock-feed";
import { getCurrentUserId } from "~/lib/session";

const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY });

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw new Response("Select a user from the DevUI panel", { status: 401 });
  await knock.users.update(String(userId), { name: `Cadence user ${userId}` });
  return {
    userId: String(userId),
    token: await signUserToken(String(userId), { expiresInSeconds: 3600 }),
    publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
    feedId: process.env.KNOCK_FEED_CHANNEL_ID!,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) throw new Response("Select a user from the DevUI panel", { status: 401 });
  const form = await request.formData();
  const run = await knock.workflows.trigger("prototype-new-question", {
    recipients: [String(form.get("recipient") || userId)],
    data: { body: String(form.get("body") || "Prototype question"), at: new Date().toISOString() },
  });
  return { run };
}

type Entry = { id: string; read_at: string | null; seen_at: string | null; inserted_at: string; data: Record<string, unknown>; blocks: { rendered?: string }[] };
type FeedResponse = { meta: { unread_count: number; unseen_count: number; total_count: number }; entries: Entry[] };

export default function PrototypeKnockFeed({ loaderData, actionData }: Route.ComponentProps) {
  const { userId, token, publicKey, feedId } = loaderData;
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const headers = { Authorization: `Bearer ${publicKey}`, "X-Knock-User-Token": token, "Content-Type": "application/json" };

  async function load() {
    const r = await fetch(`https://api.knock.app/v1/users/${userId}/feeds/${feedId}`, { headers });
    setLog((l) => [`GET feed as ${userId} → ${r.status}`, ...l]);
    if (r.ok) setFeed(await r.json());
  }
  async function mark(status: "read" | "seen" | "unread", ids: string[]) {
    const r = await fetch(`https://api.knock.app/v1/messages/batch/${status}`, { method: "POST", headers, body: JSON.stringify({ message_ids: ids }) });
    setLog((l) => [`POST batch/${status} (${ids.length}) → ${r.status}`, ...l]);
    await load();
  }
  async function crossUser() {
    const other = userId === "1" ? "2" : "1";
    const r = await fetch(`https://api.knock.app/v1/users/${other}/feeds/${feedId}`, { headers });
    setLog((l) => [`GET feed of ${other} with ${userId}'s token → ${r.status}`, ...l]);
  }

  useEffect(() => { setFeed(null); load(); }, [userId, token, actionData]);

  return (
    <div className="space-y-4 p-6 font-mono text-sm">
      <div className="rounded bg-amber-100 p-2 text-amber-900">PROTOTYPE — Knock headless feed check. Throwaway.</div>
      <div>Current user: <b>{userId}</b> · unread <b>{feed?.meta.unread_count ?? "?"}</b> · unseen <b>{feed?.meta.unseen_count ?? "?"}</b> · total {feed?.meta.total_count ?? "?"}</div>
      <Form method="post" className="flex gap-2">
        <input name="recipient" placeholder={`recipient id (default ${userId})`} className="border px-2" />
        <input name="body" placeholder="body" className="border px-2" />
        <button className="border px-2">Trigger prototype-new-question</button>
      </Form>
      <div className="flex gap-2">
        <button className="border px-2" onClick={load}>Reload feed</button>
        <button className="border px-2" onClick={() => feed && mark("seen", feed.entries.map((e) => e.id))}>Mark all seen</button>
        <button className="border px-2" onClick={() => feed && mark("read", feed.entries.map((e) => e.id))}>Mark all read</button>
        <button className="border px-2" onClick={crossUser}>Try reading the other user's feed</button>
      </div>
      <ul className="space-y-1">
        {feed?.entries.map((e) => (
          <li key={e.id} className={`border p-2 ${e.read_at ? "opacity-50" : ""}`}>
            {e.read_at ? "○" : "●"} {e.blocks[0]?.rendered ?? JSON.stringify(e.data)} <span className="text-gray-500">{e.inserted_at}</span>
            <button className="ml-2 border px-1" onClick={() => mark(e.read_at ? "unread" : "read", [e.id])}>{e.read_at ? "unread" : "read"}</button>
          </li>
        ))}
      </ul>
      <pre className="bg-gray-100 p-2">{log.join("\n")}</pre>
    </div>
  );
}
