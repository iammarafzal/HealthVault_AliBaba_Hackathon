'use client';

import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import EmergencyToastCard from '@/components/emergency/EmergencyToastCard';
import { showDesktopNotification } from '@/utils/desktopNotification';

export interface SharedAlertStream {
  patientName: string;
  topic: string;
  patientId?: string;
  healthId?: string;
}

// Module-level timestamp map for client-side alert deduplication across components (15s debounce)
const RECENT_ALERT_TRIGGER_TIMES = new Map<string, number>();

function showStandardNotification(title: string, options: NotificationOptions, url: string) {
  try {
    const n = new Notification(title, options);
    n.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch {
        // Safe ignore
      }
      window.location.href = url;
    };
  } catch (e) {
    console.warn('Standard Window Notification failed:', e);
  }
}

/**
 * Helper to reliably trigger native OS desktop notifications across all browsers.
 */
export const triggerDesktopNotification = (
  title: string,
  body: string,
  url: string,
  tag: string
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        triggerDesktopNotification(title, body, url, tag);
      }
    }).catch(() => {});
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Browser notification permission is not granted:', Notification.permission);
    return;
  }

  const options: NotificationOptions = {
    body,
    tag, // Replaces any duplicate notification card
    requireInteraction: true,
    data: { url },
  };

  try {
    // 1. If active serviceWorker controller exists, use getRegistration() non-blocking
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, options);
          } else {
            showStandardNotification(title, options, url);
          }
        })
        .catch(() => {
          showStandardNotification(title, options, url);
        });
      return;
    }

    // 2. Direct instant standard Window Notification
    showStandardNotification(title, options, url);
  } catch (err) {
    console.error('Failed to trigger native desktop notification:', err);
  }
};

/**
 * Plays the emergency alert siren sound with a Web Audio API fallback chime.
 */
function playEmergencySound() {
  try {
    const audio = new Audio('/sounds/emergency-alert-siren.mp3');
    audio.play().catch(() => {
      // Fallback: Synthesize urgent dual-tone siren using Web Audio API
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.25);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.5);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.75);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch {
        // Audio playback restricted by user gesture policy
      }
    });
  } catch {
    // Ignore audio initialization errors
  }
}

export function useSharedEmergencyListeners(sharedStreams: SharedAlertStream[] | any) {
  const eventSources = useRef<EventSource[]>([]);

  useEffect(() => {
    if (!sharedStreams || !Array.isArray(sharedStreams) || sharedStreams.length === 0) return;

    // 1. Close any existing open streams
    eventSources.current.forEach((es) => es.close());
    eventSources.current = [];

    // 2. Request Notification permission if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // 3. Iterate through all shared streams from backend
    sharedStreams.forEach(({ patientName, topic, healthId }) => {
      if (!topic) return;
      const es = new EventSource(`https://ntfy.sh/${topic}/sse`);
      eventSources.current.push(es);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message') {
            const alertKey = healthId || topic || patientName;
            const now = Date.now();
            const lastTrigger = RECENT_ALERT_TRIGGER_TIMES.get(alertKey) || 0;

            // 15-second client-side deduplication window
            if (now - lastTrigger < 15000) {
              return;
            }
            RECENT_ALERT_TRIGGER_TIMES.set(alertKey, now);

            // 🚨 Handle Incoming Emergency Alert For the Designated Patient
            playEmergencySound();

            let rawLocation = data.location || '';
            const isLocationKnown =
              rawLocation &&
              rawLocation.toLowerCase() !== 'unknown' &&
              !rawLocation.toLowerCase().includes('unknown');

            let bodyText =
              data.message && !data.message.includes('near Unknown')
                ? data.message
                : isLocationKnown
                ? `Emergency card was scanned near ${rawLocation}. First responders may be reviewing vitals.`
                : 'Emergency card was scanned. Live location and first responder activity are being monitored.';

            const targetUrl = healthId
              ? `/emergency/activity?health_id=${healthId}`
              : '/emergency/activity';

            // Show Custom High-Impact Emergency Toast Card with sonner ID deduplication
            toast.custom(
              (t) => (
                <EmergencyToastCard
                  toastId={t}
                  patientName={patientName}
                  descriptionText={bodyText}
                  healthId={healthId}
                  location={isLocationKnown ? rawLocation : undefined}
                />
              ),
              {
                id: `emergency-toast-${alertKey}`,
                duration: Infinity,
              }
            );

            // Trigger Native OS Desktop Notification via Service Worker or Window Notification
            showDesktopNotification(
              `🚨 Emergency Scan: ${patientName}`,
              bodyText,
              targetUrl,
              `emergency-scan-${healthId || patientName}`
            );

            // Sync In-App Notification Center in Navbar
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('healthvault:new-notification', {
                  detail: { patientName, message: bodyText, healthId },
                })
              );
            }
          }
        } catch (err) {
          console.error('Failed to parse ntfy event stream', err);
        }
      };

      es.onerror = (err) => {
        console.warn(`ntfy stream error on topic ${topic}:`, err);
      };
    });

    return () => {
      eventSources.current.forEach((es) => es.close());
      eventSources.current = [];
    };
  }, [sharedStreams]);
}
