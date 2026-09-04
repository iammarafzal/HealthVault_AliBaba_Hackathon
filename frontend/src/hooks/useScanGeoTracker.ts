import { useEffect } from "react";
import apiClient from "@/services/apiClient";

/**
 * Hook to automatically acquire and transmit high-accuracy GPS coordinates
 * when a responder opens the emergency triage viewer page (/emergency/{health_id}/view).
 */
export function useScanGeoTracker(healthId: string) {
  useEffect(() => {
    if (!healthId || typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await apiClient.post(
            `/emergency/${healthId}/scan-location`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy_meters: position.coords.accuracy,
            },
            { withCredentials: true }
          );
        } catch (err) {
          console.error("Failed to sync precise scan coordinates:", err);
        }
      },
      (error) => {
        console.log("GPS location skipped or denied:", error.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [healthId]);
}

export default useScanGeoTracker;
