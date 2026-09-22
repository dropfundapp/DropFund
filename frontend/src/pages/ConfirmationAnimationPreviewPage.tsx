import { Check, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

type Settings = {
  enterMs: number;
  holdMs: number;
  exitMs: number;
  pauseMs: number;
  startScale: number;
  easing: string;
};

const defaultSettings: Settings = {
  enterMs: 300,
  holdMs: 1_000,
  exitMs: 300,
  pauseMs: 700,
  startScale: 0.94,
  easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

function Control({ label, value, min, max, step = 1, suffix, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-white/65">{label}</span>
        <span className="font-mono text-white">{value}{suffix}</span>
      </div>
      <input className="h-1.5 w-full cursor-pointer accent-[#4b54ff]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function ConfirmationAnimationPreviewPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [title, setTitle] = useState('Donation sent');
  const [runId, setRunId] = useState(0);

  const animationCss = useMemo(() => {
    const total = settings.enterMs + settings.holdMs + settings.exitMs + settings.pauseMs;
    const enteredAt = (settings.enterMs / total) * 100;
    const exitAt = ((settings.enterMs + settings.holdMs) / total) * 100;
    const goneAt = ((settings.enterMs + settings.holdMs + settings.exitMs) / total) * 100;
    return `
      @keyframes confirmation-preview-card-${runId} {
        0% { opacity: 1; transform: scale(1); }
        ${exitAt}% { opacity: 1; transform: scale(1); }
        ${goneAt}% { opacity: 0; transform: scale(${settings.startScale}); }
        100% { opacity: 0; transform: scale(${settings.startScale}); }
      }
      @keyframes confirmation-preview-check-${runId} {
        0%, ${Math.max(0, enteredAt * 0.1)}% { opacity: 0; transform: scale(0.65); }
        ${enteredAt * 0.65}% { opacity: 1; transform: scale(1.2); }
        ${enteredAt}% { opacity: 1; transform: scale(1); }
        ${exitAt}% { opacity: 1; transform: scale(1); }
        ${goneAt}% { opacity: 0; transform: scale(${settings.startScale}); }
        100% { opacity: 0; transform: scale(${settings.startScale}); }
      }
      .confirmation-preview-card-${runId} {
        animation: confirmation-preview-card-${runId} ${total}ms ${settings.easing} infinite;
      }
      .confirmation-preview-check-${runId} {
        animation: confirmation-preview-check-${runId} ${total}ms ${settings.easing} infinite;
      }
    `;
  }, [runId, settings]);

  const updateSetting = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setRunId((current) => current + 1);
  };

  const restart = () => setRunId((current) => current + 1);
  const reset = () => {
    setSettings(defaultSettings);
    setRunId((current) => current + 1);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-[#111111] px-4 py-10 text-white sm:py-14">
      <style>{animationCss}</style>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[500px] overflow-hidden rounded-lg border border-[#252528] bg-[#181819] p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Confirmation Animation Lab</h1>
              <p className="mt-2 text-sm text-white/55">This page is isolated from the live transaction flow.</p>
            </div>
            <Button type="button" size="icon" variant="secondary" className="shrink-0 bg-[#252528] text-white hover:bg-[#303035]" onClick={restart} aria-label="Restart animation">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-8 flex min-h-[360px] items-center justify-center rounded-lg border border-[#252528] bg-[#111111] p-5">
            <div className={`confirmation-preview-card-${runId} w-full max-w-[320px] rounded-[24px] border border-[#252528] bg-[#181819] p-8 text-center shadow-2xl`}>
              <div className={`confirmation-preview-check-${runId} mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#58d16e] text-black`}>
                <Check className="h-9 w-9" strokeWidth={3} />
              </div>
              <h2 className="mt-5 text-xl font-semibold">{title || 'Donation sent'}</h2>
            </div>
          </div>
          <div className="mt-8 flex min-h-[520px] items-center justify-center rounded-lg border border-[#252528] bg-[#111111] p-5">
            <div className="w-full max-w-[440px] rounded-[24px] border border-[#252528] bg-[#181819] p-5 text-white shadow-2xl sm:p-6">
              <div className="relative mb-6 flex items-center justify-end">
                <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight">Withdraw complete</h2>
                <Button type="button" variant="ghost" size="icon" aria-label="Close withdrawal dialog" className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-sm">
                <div className="py-5 text-center">
                  <div className={`confirmation-preview-check-${runId} mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#58d16e] text-black`}>
                    <Check className="h-9 w-9" strokeWidth={3} />
                  </div>
                </div>
                <p className="mt-4 text-center text-sm text-white/55">Your withdrawal has been confirmed.</p>
              </div>
              <Button type="button" className="mt-8 h-14 w-full rounded-2xl bg-[#4b54ff] text-lg font-semibold text-white hover:bg-[#4149e6]">Close</Button>
            </div>
          </div>
        </section>

        <aside className="self-start rounded-lg border border-[#252528] bg-[#181819] p-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold">Settings</h2>
            <button type="button" className="text-sm text-white/55 hover:text-white" onClick={reset}>Reset</button>
          </div>
          <div className="space-y-5">
            <Control label="Enter" value={settings.enterMs} min={100} max={1_000} step={25} suffix="ms" onChange={(value) => updateSetting('enterMs', value)} />
            <Control label="Visible" value={settings.holdMs} min={300} max={3_000} step={50} suffix="ms" onChange={(value) => updateSetting('holdMs', value)} />
            <Control label="Exit" value={settings.exitMs} min={100} max={1_000} step={25} suffix="ms" onChange={(value) => updateSetting('exitMs', value)} />
            <Control label="Loop pause" value={settings.pauseMs} min={0} max={2_000} step={50} suffix="ms" onChange={(value) => updateSetting('pauseMs', value)} />
            <Control label="Exit scale" value={settings.startScale} min={0.8} max={0.99} step={0.01} suffix="" onChange={(value) => updateSetting('startScale', value)} />
            <label className="block text-sm text-white/65">
              Easing
              <select value={settings.easing} onChange={(event) => updateSetting('easing', event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#252528] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#4b54ff]">
                <option value="ease-out">Ease out</option>
                <option value="cubic-bezier(0.22, 1, 0.36, 1)">Spring</option>
                <option value="ease-in-out">Ease in-out</option>
                <option value="linear">Linear</option>
              </select>
            </label>
            <label className="block text-sm text-white/65">
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#252528] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#4b54ff]" />
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}