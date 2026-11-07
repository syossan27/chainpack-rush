// 振動（レア以上の取得、ボス撃破、状態コンボ成立時）
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

const native = (): boolean => Capacitor.isNativePlatform();

export function hapticLight(): void {
  if (!enabled) return;
  if (native()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  else navigator.vibrate?.(10);
}

export function hapticMedium(): void {
  if (!enabled) return;
  if (native()) void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
  else navigator.vibrate?.(25);
}

export function hapticSuccess(): void {
  if (!enabled) return;
  if (native())
    void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  else navigator.vibrate?.([30, 40, 60]);
}
