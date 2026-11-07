// バックグラウンド移行の検知（@capacitor/app の状態イベント + ブラウザの visibilitychange）
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
let active = true;

function set(next: boolean): void {
  if (next === active) return;
  active = next;
  for (const l of listeners) l(active);
}

export function isAppActive(): boolean {
  return active;
}

export function onAppStateChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function initLifecycle(): void {
  document.addEventListener('visibilitychange', () => set(document.visibilityState === 'visible'));
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => set(isActive)).catch(() => undefined);
    void StatusBar.hide().catch(() => undefined);
  }
}
