// PROTOTYPE, throwaway: probes Knock's dev environment for the rejection criteria
// of "Does Knock hold up after prototyping?". Run: npx tsx --env-file=.env scripts/prototype-knock/probe.ts
import Knock, { signUserToken } from "@knocklabs/node";

const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY });
const pk = process.env.KNOCK_PUBLIC_API_KEY!;
const feed = process.env.KNOCK_FEED_CHANNEL_ID!;
const API = "https://api.knock.app/v1";

async function asUser(path: string, userId: string, token: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${pk}`, "X-Knock-User-Token": token, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await r.text();
  return { status: r.status, body: text.slice(0, 400) };
}

const users = ["proto-1", "proto-2"];
for (const id of users) {
  await knock.users.update(id, { name: `Proto ${id}`, email: `${id}@example.com` });
}
console.log("identified", users);

const tokens = Object.fromEntries(await Promise.all(users.map(async (u) => [u, await signUserToken(u)])));

console.log("\n# workflows reachable?");
try {
  const r = await knock.workflows.trigger("prototype-new-question", { recipients: ["proto-1"], data: { body: "hi" } });
  console.log("trigger ok", r);
} catch (e: any) { console.log("trigger err", e.status, e.message); }

console.log("\n# feed as each user (own token)");
for (const u of users) console.log(u, await asUser(`/users/${u}/feeds/${feed}`, u, tokens[u]));

console.log("\n# cross-user: proto-1 token reading proto-2 feed");
console.log(await asUser(`/users/proto-2/feeds/${feed}`, "proto-1", tokens["proto-1"]));

console.log("\n# no token");
const r = await fetch(`${API}/users/proto-1/feeds/${feed}`, { headers: { Authorization: `Bearer ${pk}` } });
console.log(r.status, (await r.text()).slice(0, 200));

console.log("\n# preferences: category x channel on free plan");
try {
  const p = await knock.users.setPreferences("proto-1", "default", {
    categories: { refunds: { channel_types: { email: false, in_app_feed: true } } },
    workflows: { "prototype-new-question": { channel_types: { push: false } } },
  } as any);
  console.log("set ok", JSON.stringify(p).slice(0, 400));
} catch (e: any) { console.log("prefs err", e.status, e.message); }

console.log("\n# preferences read as user via client token");
console.log(await asUser(`/users/proto-1/preferences/default`, "proto-1", tokens["proto-1"]));
