// src/utils/notificationFeedback.ts
// Utilidad para feedback de audio y vibracion en notificaciones

type SoundType = 'alert' | 'panic' | 'success' | 'info';

// URLs de sonidos (pueden ser archivos locales o data URIs)
const SOUNDS: Record<SoundType, string> = {
  // Sonido de alerta general
  alert: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JiYJ0aGNscH2Fg4B5cm1wdXt/gIB9e3h3eXt9f39/fn18e3p6ent8fX5+fn59fHt6eXl5eXp7fH1+fn5+fXx7enl4eHh4eXp7fH19fn5+fXx7enl4d3d3eHl6e3x9fn5+fn18e3p5eHd3d3h5ent8fX5+fn59fHt6eXh3dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6fH1+f35+fXx7enh3dnV1dnd4eXp7fX5/f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1',

  // Sonido de panico (mas urgente)
  panic: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JiYJ0aGNscH2Fg4B5cm1wdXt/gIB9e3h3eXt9f39/fn18e3p6ent8fX5+fn59fHt6eXl5eXp7fH1+fn5+fXx7enl4eHh4eXp7fH19fn5+fXx7enl4d3d3eHl6e3x9fn5+fn18e3p5eHd3d3h5ent8fX5+fn59fHt6eXh3dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6fH1+f35+fXx7enh3dnV1dnd4eXp7fX5/f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1',

  // Sonido de exito
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JiYJ0aGNscH2Fg4B5cm1wdXt/gIB9e3h3eXt9f39/fn18e3p6ent8fX5+fn59fHt6eXl5eXp7fH1+fn5+fXx7enl4eHh4eXp7fH19fn5+fXx7enl4d3d3eHl6e3x9fn5+fn18e3p5eHd3d3h5ent8fX5+fn59fHt6eXh3dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6fH1+f35+fXx7enh3dnV1dnd4eXp7fX5/f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1',

  // Sonido informativo
  info: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JiYJ0aGNscH2Fg4B5cm1wdXt/gIB9e3h3eXt9f39/fn18e3p6ent8fX5+fn59fHt6eXl5eXp7fH1+fn5+fXx7enl4eHh4eXp7fH19fn5+fXx7enl4d3d3eHl6e3x9fn5+fn18e3p5eHd3d3h5ent8fX5+fn59fHt6eXh3dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6e3x9fn5/f359fHt5eHd2dnZ3eHl6fH1+f35+fXx7enh3dnV1dnd4eXp7fX5/f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1dnd4eXp7fH5+f39/fn18e3p4d3Z1dXV2d3h5ent8fn5/f39+fXx7enh3dnV1dXZ3eHl6e3x+fn9/f359fHt6eHd2dXV1',
};

// Cache de objetos Audio
const audioCache: Map<SoundType, HTMLAudioElement> = new Map();

// Verificar si el audio esta habilitado
let audioEnabled = true;

// Cargar preferencia de audio
try {
  const stored = localStorage.getItem('vida_audio_enabled');
  if (stored !== null) {
    audioEnabled = stored === 'true';
  }
} catch (e) {
  // localStorage no disponible
}

/**
 * Habilitar/deshabilitar audio de notificaciones
 */
export function setAudioEnabled(enabled: boolean): void {
  audioEnabled = enabled;
  try {
    localStorage.setItem('vida_audio_enabled', String(enabled));
  } catch (e) {
    // localStorage no disponible
  }
}

/**
 * Verificar si el audio esta habilitado
 */
export function isAudioEnabled(): boolean {
  return audioEnabled;
}

/**
 * Reproducir un sonido de notificacion
 */
export function playNotificationSound(type: SoundType = 'alert', volume: number = 0.5): Promise<void> {
  return new Promise((resolve) => {
    if (!audioEnabled) {
      resolve();
      return;
    }

    try {
      // Reutilizar audio cacheado o crear uno nuevo
      let audio = audioCache.get(type);

      if (!audio) {
        audio = new Audio(SOUNDS[type]);
        audioCache.set(type, audio);
      }

      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0;

      audio.play()
        .then(() => resolve())
        .catch((error) => {
          console.warn('No se pudo reproducir sonido:', error);
          resolve(); // No rechazar, solo advertir
        });
    } catch (error) {
      console.warn('Error al reproducir sonido:', error);
      resolve();
    }
  });
}

/**
 * Vibrar el dispositivo (si esta soportado)
 */
export function vibrate(pattern: number | number[] = 200): boolean {
  if (!('vibrate' in navigator)) {
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('No se pudo vibrar:', error);
    return false;
  }
}

/**
 * Patron de vibracion para alertas de panico
 */
export const PANIC_VIBRATION_PATTERN = [200, 100, 200, 100, 200, 100, 400];

/**
 * Patron de vibracion para notificaciones generales
 */
export const NOTIFICATION_VIBRATION_PATTERN = [200, 100, 200];

/**
 * Retroalimentacion completa para alertas de panico
 */
export function panicAlertFeedback(): void {
  playNotificationSound('panic', 0.8);
  vibrate(PANIC_VIBRATION_PATTERN);
}

/**
 * Retroalimentacion para acceso QR
 */
export function qrAccessFeedback(): void {
  playNotificationSound('alert', 0.5);
  vibrate(NOTIFICATION_VIBRATION_PATTERN);
}

/**
 * Retroalimentacion para notificaciones generales
 */
export function notificationFeedback(): void {
  playNotificationSound('info', 0.3);
  vibrate(200);
}

/**
 * Retroalimentacion de exito
 */
export function successFeedback(): void {
  playNotificationSound('success', 0.4);
  vibrate(100);
}

export default {
  playNotificationSound,
  vibrate,
  panicAlertFeedback,
  qrAccessFeedback,
  notificationFeedback,
  successFeedback,
  setAudioEnabled,
  isAudioEnabled,
};
