// PROTOTYPE, throwaway: is read -> unread -> read just eventual consistency?
import { signUserToken } from "@knocklabs/node";
const pk = process.env.KNOCK_PUBLIC_API_KEY!, feed = process.env.KNOCK_FEED_CHANNEL_ID!, API = "https://api.knock.app/v1";
const t = await signUserToken("proto-1"); const h = { Authorization: `Bearer ${pk}`, "X-Knock-User-Token": t, "Content-Type": "application/json" };
const get = async () => { const j: any = await (await fetch(`${API}/users/proto-1/feeds/${feed}`, { headers: h })).json(); return { unread: j.meta.unread_count, read: !!j.entries[0].read_at, id: j.entries[0].id }; };
const s0 = await get(); console.log("now", s0);
await new Promise(r => setTimeout(r, 3000)); console.log("after 3s", await get());
for (const s of ["read", "unread", "read"]) {
  await fetch(`${API}/messages/batch/${s}`, { method: "POST", headers: h, body: JSON.stringify({ message_ids: [s0.id] }) });
  await new Promise(r => setTimeout(r, 1500)); console.log(s, await get());
}
