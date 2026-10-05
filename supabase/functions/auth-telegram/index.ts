// RushOnCash - Telegram Mini App authentication
// Validates Telegram initData, creates/links Supabase Auth user, returns session.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_AUTH_AGE = 60 * 60 * 24; // 24 hours

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key: string | Uint8Array, message: string): Promise<Uint8Array> {
  const keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

async function verifyInitData(
  initData: string,
  botToken: string,
): Promise<{ user: TelegramUser; startParam: string | null }> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("missing hash in initData");

  params.delete("hash");
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = await hmacSha256("WebAppData", botToken);
  const calculated = toHex(await hmacSha256(secret, dataCheckString));
  if (calculated !== hash) throw new Error("initData signature mismatch");

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > MAX_AUTH_AGE) {
    throw new Error("initData expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("missing user in initData");
  const user = JSON.parse(userRaw) as TelegramUser;
  if (!user?.id || !user?.first_name) throw new Error("invalid user in initData");

  return { user, startParam: params.get("start_param") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const { initData, startParam: clientStart } = await req.json();
    if (!initData || typeof initData !== "string") {
      return json({ error: "initData required" }, 400);
    }

    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) return json({ error: "BOT_TOKEN secret not configured" }, 500);

    let verified: { user: TelegramUser; startParam: string | null };
    try {
      verified = await verifyInitData(initData, botToken);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "invalid initData" }, 401);
    }

    const { user: tgUser, startParam } = verified;
    const start = startParam ?? clientStart ?? null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const email = `${tgUser.id}@tg.rushoncash.app`;
    const pwSalt = Deno.env.get("AUTH_PASSWORD_SALT") ?? botToken;
    const password = toHex(await hmacSha256(pwSalt, `tg:${tgUser.id}`)).slice(0, 40);

    let session: unknown = null;
    let authUserId = "";

    const signIn = await authClient.auth.signInWithPassword({ email, password });
    if (signIn.data.session) {
      session = signIn.data.session;
      authUserId = signIn.data.user!.id;
    } else {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: String(tgUser.id) },
      });
      if (created.error && created.error.code !== "email_exists") {
        return json({ error: `auth create failed: ${created.error.message}` }, 500);
      }
      if (created.data?.user) authUserId = created.data.user.id;

      const retry = await authClient.auth.signInWithPassword({ email, password });
      if (retry.error || !retry.data.session) {
        // email exists but password differs (e.g. salt rotated) -> reset password
        if (created.error?.code === "email_exists") {
          const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const existing = list?.users?.find((u) => u.email === email);
          if (existing) {
            authUserId = existing.id;
            await admin.auth.admin.updateUserById(existing.id, { password });
            const again = await authClient.auth.signInWithPassword({ email, password });
            if (again.data.session) {
              session = again.data.session;
            }
          }
        }
        if (!session) return json({ error: "authentication failed" }, 500);
      } else {
        session = retry.data.session;
        authUserId = retry.data.user!.id;
      }
    }

    // resolve referrer: numeric telegram id or referral code (ref_XXXX / XXXX)
    let referrerAuthId: string | null = null;
    if (start && /^\d+$/.test(start) && start !== String(tgUser.id)) {
      const { data: ref } = await admin
        .from("users")
        .select("id")
        .eq("telegram_id", start)
        .maybeSingle();
      referrerAuthId = ref?.id ?? null;
    } else if (start && !/^\d+$/.test(start)) {
      const code = start.replace(/^ref_/i, "").toUpperCase();
      const { data: ref } = await admin
        .from("users")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (ref && ref.id !== authUserId) referrerAuthId = ref.id;
    }

    const { data: userRow, error: syncErr } = await admin.rpc("sync_telegram_user", {
      p_telegram_id: String(tgUser.id),
      p_auth_id: authUserId,
      p_username: tgUser.username ?? null,
      p_first_name: tgUser.first_name,
      p_last_name: tgUser.last_name ?? null,
      p_photo_url: tgUser.photo_url ?? null,
      p_referrer_auth_id: referrerAuthId,
    });

    if (syncErr) return json({ error: `sync failed: ${syncErr.message}` }, 500);
    if (userRow?.is_banned) return json({ error: "account banned" }, 403);

    return json({ session, user: userRow });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "internal error" }, 500);
  }
});
