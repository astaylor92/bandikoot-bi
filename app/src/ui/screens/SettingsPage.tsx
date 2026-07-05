import { useState } from 'react';
import { useAppStore } from '../../state/appStore';
import { TokenProvider } from '../../api/tokenProvider';

export function SettingsPage() {
  const brokerUrl = useAppStore((s) => s.brokerUrl);
  const teamKey = useAppStore((s) => s.teamKey);
  const setBroker = useAppStore((s) => s.setBroker);
  const [url, setUrl] = useState(brokerUrl);
  const [key, setKey] = useState(teamKey);
  const [testResult, setTestResult] = useState('');

  const save = () => {
    setBroker(url.trim(), key.trim());
    setTestResult('Saved.');
  };

  const test = async () => {
    setTestResult('Testing…');
    try {
      const provider = new TokenProvider(url.trim(), key.trim() || undefined);
      await provider.getToken();
      setTestResult('✓ Token broker OK — live SignalR streaming will be used.');
    } catch (err) {
      setTestResult(`✗ ${String(err)} — the app will fall back to REST polling (still works).`);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="rounded-lg border border-pit-line bg-pit-panel p-4">
        <h3 className="mb-2 font-bold">Token broker</h3>
        <p className="mb-3 text-sm text-pit-dim">
          The broker (a small Cloudflare Worker, see <code>worker/</code>) holds your Red Mist relay
          credentials and hands the app short-lived tokens for the live SignalR stream. Without it
          the app still works via public REST polling (~5s updates).
        </p>
        <label className="text-xs uppercase text-pit-dim">Broker URL</label>
        <input
          className="mb-3 mt-1 w-full rounded border border-pit-line bg-pit-bg px-2 py-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/api/token or https://your-worker.workers.dev/api/token"
        />
        <label className="text-xs uppercase text-pit-dim">Team key (optional)</label>
        <input
          className="mb-3 mt-1 w-full rounded border border-pit-line bg-pit-bg px-2 py-1"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="shared passphrase if your broker requires one"
        />
        <div className="flex gap-2">
          <button className="rounded bg-accent px-3 py-1 font-bold text-black" onClick={save}>
            Save
          </button>
          <button className="rounded border border-pit-line px-3 py-1" onClick={test}>
            Test connection
          </button>
        </div>
        {testResult && <p className="mt-2 text-sm">{testResult}</p>}
      </div>

      <div className="rounded-lg border border-pit-line bg-pit-panel p-4 text-sm text-pit-dim">
        <h3 className="mb-1 font-bold text-pit-text">About</h3>
        <p>
          Timing data from the{' '}
          <a className="text-accent" href="https://docs.redmist.racing/" target="_blank" rel="noreferrer">
            Red Mist Timing &amp; Scoring API
          </a>
          . Strategy projections are estimates for planning, not official results.
        </p>
      </div>
    </div>
  );
}
