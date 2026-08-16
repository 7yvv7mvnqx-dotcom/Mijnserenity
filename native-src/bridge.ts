import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

const isNative = Capacitor.isNativePlatform();
let watchId: string | null = null;

function safeFileName(value = 'serenity-route.gpx') {
  const name = String(value || 'serenity-route.gpx')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return name.toLowerCase().endsWith('.gpx') ? name : `${name}.gpx`;
}

async function shareGpx(gpx: string, filename = 'serenity-route.gpx', title = 'Serenity route') {
  if (!gpx || !String(gpx).includes('<gpx')) {
    throw new Error('Geen geldig GPX-bestand ontvangen.');
  }

  if (!isNative) {
    const file = new File([gpx], safeFileName(filename), { type: 'application/gpx+xml' });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title, files: [file] });
      return { shared: true, native: false };
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { shared: false, downloaded: true, native: false };
  }

  const path = `exports/${safeFileName(filename)}`;
  await Filesystem.writeFile({
    path,
    data: gpx,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true
  });
  const file = await Filesystem.getUri({ path, directory: Directory.Cache });
  await Share.share({
    title,
    text: 'Open deze Serenity-route in Waterkaarten.',
    files: [file.uri]
  });
  return { shared: true, native: true, uri: file.uri };
}

async function getCurrentPosition() {
  const permissions = await Geolocation.checkPermissions();
  if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
    await Geolocation.requestPermissions();
  }
  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 3000
  });
  return position;
}

async function startLocationWatch(callback?: (position: any, error?: any) => void) {
  if (watchId) await Geolocation.clearWatch({ id: watchId });
  watchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    (position, error) => {
      if (position) {
        window.dispatchEvent(new CustomEvent('mijnserenity:native-position', { detail: position }));
      }
      callback?.(position, error);
    }
  );
  return watchId;
}

async function stopLocationWatch() {
  if (!watchId) return;
  await Geolocation.clearWatch({ id: watchId });
  watchId = null;
}

async function shareText(title: string, text: string) {
  await Share.share({ title, text });
}

const bridge = {
  version: '0.1.0',
  isNative,
  platform: Capacitor.getPlatform(),
  shareGpx,
  shareText,
  getCurrentPosition,
  startLocationWatch,
  stopLocationWatch
};

Object.defineProperty(window, 'MijnSerenityNative', {
  value: bridge,
  configurable: false,
  writable: false
});

document.documentElement.classList.toggle('mijnserenity-native', isNative);
window.dispatchEvent(new CustomEvent('mijnserenity:native-ready', { detail: bridge }));

if (isNative) {
  App.addListener('appUrlOpen', ({ url }) => {
    window.dispatchEvent(new CustomEvent('mijnserenity:app-url-open', { detail: { url } }));
  });
}

declare global {
  interface Window {
    MijnSerenityNative: typeof bridge;
  }
}
