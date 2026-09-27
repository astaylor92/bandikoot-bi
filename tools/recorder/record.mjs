#!/usr/bin/env node
// Records a live Red Mist event: initial snapshot + timestamped V2 patch
// stream, written as JSON Lines. Useful for debugging and for building
// replay fixtures from real races.
//
// Usage:
//   RM_CLIENT_ID=... RM_CLIENT_SECRET=... node record.mjs --event 244 --out recordings/vir.jsonl
//   node record.mjs --event 244 --broker https://your-worker.workers.dev/api/token --out out.jsonl
//   node record.mjs --event 410 --public [--interval 5]   # no credentials: polls public
//       LoadSessionResults and logs how many cars changed per poll (feed freshness check)

import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import signalr from '@microsoft/signalr';

const API_BASE = process.env.RM_API_BASE ?? 'https://api.redmist.racing/status';
const AUTH_URL =
  process.env.RM_AUTH_URL ??
  'https://auth.redmist.racing/realms/redmist/protocol/openid-connect/token';

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const eventId = Number(arg('event'));
const outPath = arg('out', `recordings/event-${eventId}-${Date.now()}.jsonl`);
const brokerUrl = arg('broker', process.env.RM_BROKER_URL);
const publicMode = process.argv.includes('--public');
const intervalMs = Number(arg('interval', '5')) * 1000;

if (!eventId) {
  console.error('Usage: record.mjs --event <eventId> [--out file.jsonl] [--broker url]');
  process.exit(1);
}

async function getToken() {
  if (brokerUrl) {
    const res = await fetch(brokerUrl, {
      headers: process.env.RM_TEAM_KEY ? { 'x-team-key': process.env.RM_TEAM_KEY } : {},
    });
    if (!res.ok) throw new Error(`broker HTTP ${res.status}`);
    return (await res.json()).access_token;
  }
  const id = process.env.RM_CLIENT_ID;
  const secret = process.env.RM_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Set RM_CLIENT_ID/RM_CLIENT_SECRET or --broker');
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`auth HTTP ${res.status}`);
  return (await res.json()).access_token;
}

mkdirSync(dirname(outPath), { recursive: true });
const out = createWriteStream(outPath, { flags: 'a' });
const t0 = Date.now();
let frames = 0;

function write(kind, data) {
  out.write(JSON.stringify({ t: Date.now() - t0, kind, data }) + '\n');
  frames++;
  if (frames % 100 === 0) console.log(`${frames} frames, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

async function getJson(path) {
  const res = await fetch(`${API_BASE}/v2/Events/${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : null;
}

if (publicMode) {
  // Latest-started session is the current one (session 95 is a long-lived shadow).
  const sessions = await getJson(`LoadSessions?eventId=${eventId}`);
  const current = [...sessions].sort((a, b) => new Date(b.st) - new Date(a.st))[0];
  console.log(`Polling LoadSessionResults for session ${current.sid} (${current.n}) every ${intervalMs / 1000}s -> ${outPath}`);
  let prev = new Map();
  const poll = async () => {
    try {
      const state = await getJson(`LoadSessionResults?eventId=${eventId}&sessionId=${current.sid}`);
      const cars = state?.carPositions ?? [];
      let changed = 0;
      const next = new Map();
      for (const c of cars) {
        const sig = `${c.llp}|${c.ltm}|${c.ip}|${c.ovp}`;
        next.set(c.n, sig);
        if (prev.get(c.n) !== sig) changed++;
      }
      prev = next;
      write('results', state);
      console.log(`${new Date().toISOString()} race ${state?.runningRaceTime} flag ${state?.currentFlag} changed ${changed}/${cars.length}`);
    } catch (err) {
      console.warn(String(err));
    }
  };
  await poll();
  const timer = setInterval(poll, intervalMs);
  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log(`\nStopping. ${frames} frames written to ${outPath}`);
    out.end(() => process.exit(0));
  });
} else {
  // 1. Snapshot (the live snapshot endpoint requires a token since 2026-09)
  const snapToken = await getToken();
  const snapRes = await fetch(`${API_BASE}/v2/Events/GetCurrentSessionStateJson?eventId=${eventId}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${snapToken}` },
  });
  const snapText = snapRes.ok ? await snapRes.text() : '';
  if (snapText.trim()) write('snapshot', JSON.parse(snapText));
  else console.warn(`No live session state (HTTP ${snapRes.status}) — recording patches only.`);

  // 2. Patch stream via SignalR
  const connection = new signalr.HubConnectionBuilder()
    .withUrl(`${API_BASE}/event-status`, { accessTokenFactory: getToken })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => 5000 })
    .configureLogging(signalr.LogLevel.Information)
    .build();

  connection.on('ReceiveSessionPatch', (p) => write('session', p));
  connection.on('ReceiveCarPatches', (p) => write('cars', p));
  connection.on('ReceiveReset', () => write('reset', null));
  connection.onreconnected(async () => {
    console.log('reconnected — resubscribing');
    await connection.invoke('SubscribeToEventV2', eventId);
  });

  await connection.start();
  await connection.invoke('SubscribeToEventV2', eventId);
  console.log(`Recording event ${eventId} -> ${outPath} (Ctrl-C to stop)`);

  process.on('SIGINT', async () => {
    console.log(`\nStopping. ${frames} frames written to ${outPath}`);
    await connection.stop().catch(() => {});
    out.end(() => process.exit(0));
  });
}
