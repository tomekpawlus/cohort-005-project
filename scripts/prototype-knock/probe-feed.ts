// PROTOTYPE, throwaway: criterion 2 end-to-end. Run: npx tsx --env-file=.env scripts/prototype-knock/probe-feed.ts
import Knock, { signUserToken } from "@knocklabs/node";
const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY });
const pk = process.env.KNOCK_PUBLIC_API_KEY!, feed = process.env.KNOCK_FEED_CHANNEL_ID!, API = "https://api.knock.app/v1";
const h = (t: string) => ({ Authorization: `Bearer ${pk}`, "X-Knock-User-Token": t, "Content-Type": "application/json" });
const t1 = await signUserToken("proto-1");
const get = async () => { const r = await fetch(`${API}/users/proto-1/feeds/${feed}`, { headers: h(t1) }); const j: any = await r.json(); return { status: r.status, meta: j.meta, entries: j.entries?.map((e: any) => ({ id: e.id, read: !!e.read_at, seen: !!e.seen_at, text: e.blocks?.[0]?.rendered?.trim() })) }; };
const post = async (s: string, ids: string[]) => (await fetch(`${API}/messages/batch/${s}`, { method: "POST", headers: h(t1), body: JSON.stringify({ message_ids: ids }) })).status;
console.log("before", (await get()).meta);
const run = await knock.workflows.trigger("prototype-new-question", { recipients: ["proto-1"], data: { body: "Probe question " + Date.now() } });
console.log("trigger", run);
let f; for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 1000)); f = await get(); if (f.entries?.length) break; }
console.log("after trigger", f!.meta, f!.entries?.[0]);
const id = f!.entries![0].id;
console.log("seen", await post("seen", [id]), (await get()).meta);
console.log("read", await post("read", [id]), (await get()).meta);
console.log("unread", await post("unread", [id]), (await get()).meta);
console.log("read again", await post("read", [id]), (await get()).meta);
