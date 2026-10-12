import { useEffect, useState } from 'react';
import { subscriptionApi } from '../services/subscriptionApi';
import type { ReferralSettings } from '../types/subscription';

export function useReferralSettings() {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);

  useEffect(() => {
    subscriptionApi.getReferralSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  return settings;
}
