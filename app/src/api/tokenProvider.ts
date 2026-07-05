/**
 * Fetches Red Mist access tokens from the team's token broker (Cloudflare
 * Worker, see worker/). The broker holds the OAuth client secret; the browser
 * only ever sees short-lived access tokens (~5 min). Tokens are cached and
 * refreshed 30s before expiry; concurrent callers share one in-flight request.
 */
export class TokenProvider {
  private token: string | null = null;
  private expiresAt = 0;
  private inflight: Promise<string> | null = null;

  constructor(
    private brokerUrl: string,
    private teamKey?: string,
  ) {}

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 30_000) return this.token;
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchToken(): Promise<string> {
    const headers: Record<string, string> = {};
    if (this.teamKey) headers['x-team-key'] = this.teamKey;
    const res = await fetch(this.brokerUrl, { headers });
    if (!res.ok) throw new Error(`Token broker returned HTTP ${res.status}`);
    const body = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error('Token broker response missing access_token');
    this.token = body.access_token;
    this.expiresAt = Date.now() + (body.expires_in ?? 300) * 1000;
    return this.token;
  }
}
