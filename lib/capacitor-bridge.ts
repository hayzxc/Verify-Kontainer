import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';

export interface NativePosition {
  latitude: number;
  longitude: number;
}

/** Check if running inside native mobile shell (iOS / Android) */
export const isNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
};

/** Get native platform name ('ios' | 'android' | 'web') */
export const getPlatformName = (): string => {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform();
};

/**
 * Capture photo using Capacitor native Camera plugin.
 * Returns base64 data URL string (e.g. 'data:image/jpeg;base64,...') or null.
 */
export const captureNativePhoto = async (): Promise<string | null> => {
  if (!isNativePlatform()) return null;
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      width: 1920,
      height: 1080,
      correctOrientation: true,
    });
    if (photo.base64String) {
      const format = photo.format || 'jpeg';
      return `data:image/${format};base64,${photo.base64String}`;
    }
    return null;
  } catch (error) {
    console.warn('[CapacitorBridge] Camera capture error or cancelled:', error);
    return null;
  }
};

/**
 * Get GPS coordinates using Capacitor native Geolocation plugin.
 */
export const getNativePosition = async (): Promise<NativePosition | null> => {
  if (!isNativePlatform()) return null;
  try {
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location !== 'granted') {
      const requestStatus = await Geolocation.requestPermissions();
      if (requestStatus.location !== 'granted') {
        throw new Error('Location permission denied on device.');
      }
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.warn('[CapacitorBridge] Geolocation error:', error);
    return null;
  }
};

/**
 * Open external URL using native SFSafariViewController / Chrome Custom Tabs
 * for secure OAuth flows.
 */
export const openNativeBrowser = async (url: string): Promise<void> => {
  if (isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.location.href = url;
  }
};
