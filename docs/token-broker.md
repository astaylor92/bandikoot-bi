# Token broker

Last verified: 2026-09-26

The Red Mist live snapshot endpoint and the SignalR hub need an OAuth access token. The client secret can't ship in a static site, so `worker/` (a Cloudflare Worker) does the OAuth client-credentials exchange. It also caches the token, which lasts about 300 s. The browser only ever sees short-lived access tokens.

**Without a broker the app still works.** It uses the public results feed, which updates every ~5 s instead of sub-second.

## Secrets

| Name | What it is |
|---|---|
| `RM_CLIENT_ID` / `RM_CLIENT_SECRET` | Red Mist API client credentials (ask Red Mist for a read-only status API client) |
| `TEAM_KEY` | **A passphrase you invent** (e.g. `openssl rand -base64 24`). The worker URL is public, and without this anyone who finds it can get tokens issued under your credentials. The app sends it as the `x-team-key` header. |

`ALLOWED_ORIGIN` in `wrangler.toml` limits browser CORS to your site's origin, e.g. `https://astaylor92.github.io` (no path). Use `*` while testing from localhost.

## Deploy

```bash
cd worker
npx wrangler login
npx wrangler secret put RM_CLIENT_ID
npx wrangler secret put RM_CLIENT_SECRET
npx wrangler secret put TEAM_KEY
npx wrangler deploy                       # prints https://pitwall-token-broker.<you>.workers.dev
curl -s -H "x-team-key: <passphrase>" https://pitwall-token-broker.<you>.workers.dev/api/token | head -c 80
```

What the check (the `curl` line) can return:

- **200** with `access_token`: the broker works.
- **403**: the team key is wrong.
- **503**: a secret is missing.
- **502**: Red Mist rejected the client credentials.

## App settings

In **Settings**:

- Set **Broker URL** to `https://pitwall-token-broker.<you>.workers.dev/api/token`.
- Set **Team key** to the passphrase.
- Use **Test connection** to check it.

The header badge shows `LIVE · TOKEN` when SignalR is streaming, `POLLING · TOKEN` for the authenticated snapshot without SignalR, and `POLLING · PUBLIC` for the fallback.

For local dev, `npm run dev` proxies `/api/token` to `wrangler dev` on :8787. Put the secrets in `worker/.dev.vars`, which is gitignored.
