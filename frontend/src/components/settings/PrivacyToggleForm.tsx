"use client";

import { Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { PrivacySettings } from "@/types/models";

interface ToggleConfig {
  key: keyof PrivacySettings;
  label: string;
  description: string;
}

const toggleConfigs: ToggleConfig[] = [
  {
    key: "show_blood_group",
    label: "Show Blood Group",
    description:
      "Display your blood group on the Emergency QR card visible to first responders.",
  },
  {
    key: "show_allergies",
    label: "Show Known Allergies",
    description:
      "Display known drug & environmental allergies on the emergency card.",
  },
  {
    key: "show_active_meds",
    label: "Show Active Medications",
    description:
      "Display your current medication list on the emergency card.",
  },
  {
    key: "show_emergency_contacts",
    label: "Show Emergency Contacts",
    description:
      "Allow emergency responders to see your designated contact numbers.",
  },
  {
    key: "show_chronic_conditions",
    label: "Show Chronic Conditions",
    description:
      "Display chronic health conditions on the emergency card.",
  },
];

interface PrivacyToggleFormProps {
  settings: PrivacySettings;
  onToggle: (key: keyof PrivacySettings) => void;
}

/**
 * Interactive privacy toggle form with shadcn/ui-style Switch controls.
 * Each toggle controls field visibility on the public emergency card.
 */
export default function PrivacyToggleForm({
  settings,
  onToggle,
}: PrivacyToggleFormProps) {
  return (
    <div className="space-y-3">
      {toggleConfigs.map((config) => {
        const isOn = settings[config.key];
        return (
          <div
            key={config.key}
            className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              {isOn ? (
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </div>
            {/* Switch control */}
            <Switch
              checked={isOn as boolean}
              onCheckedChange={() => onToggle(config.key)}
              aria-label={config.label}
            />
          </div>
        );
      })}
    </div>
  );
}
