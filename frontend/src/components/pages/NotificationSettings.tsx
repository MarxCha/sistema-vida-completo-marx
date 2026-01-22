// src/components/pages/NotificationSettings.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  BellOff,
  AlertTriangle,
  QrCode,
  FileText,
  Users,
  ArrowLeft,
  Moon,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  Check,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NotificationPreferences {
  // Por tipo de notificacion
  panicAlerts: boolean;
  qrAccess: boolean;
  systemNotifications: boolean;
  representativeUpdates: boolean;
  documentUpdates: boolean;

  // Canales
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;

  // No molestar
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;

  // Sonido
  soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  panicAlerts: true,
  qrAccess: true,
  systemNotifications: true,
  representativeUpdates: true,
  documentUpdates: true,
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  doNotDisturbEnabled: false,
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '08:00',
  soundEnabled: true,
};

const STORAGE_KEY = 'vida_notification_preferences';

function loadPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading notification preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving notification preferences:', e);
  }
}

export default function NotificationSettings() {
  const { permission, supported, requestPermission } = useNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(loadPreferences);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar cambios
  useEffect(() => {
    const stored = loadPreferences();
    const changed = JSON.stringify(stored) !== JSON.stringify(preferences);
    setHasChanges(changed);
  }, [preferences]);

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      savePreferences(preferences);
      toast.success('Preferencias guardadas');
      setHasChanges(false);
    } catch (error) {
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success('Notificaciones activadas');
      updatePreference('pushEnabled', true);
    } else if (result === 'denied') {
      toast.error('Permisos denegados. Activalos desde la configuracion del navegador.');
    }
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
    disabled = false
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled
          ? 'bg-gray-200 cursor-not-allowed'
          : enabled
            ? 'bg-vida-600'
            : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/notifications"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuracion de Notificaciones</h1>
          <p className="text-gray-600 mt-1">Personaliza como y cuando recibir alertas</p>
        </div>
      </div>

      {/* Estado de permisos del navegador */}
      {supported && permission !== 'granted' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BellOff className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">Notificaciones del navegador desactivadas</h3>
              <p className="text-sm text-amber-700 mt-1">
                Para recibir notificaciones push, necesitas activar los permisos del navegador.
              </p>
              <button
                onClick={handleRequestPermission}
                className="mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Activar permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {permission === 'granted' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-900">Notificaciones push activas</h3>
              <p className="text-sm text-green-700">Recibiras alertas incluso cuando no estes en la app</p>
            </div>
          </div>
        </div>
      )}

      {/* Tipos de notificaciones */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Tipos de Notificaciones</h2>
          <p className="text-sm text-gray-500 mt-1">Elige que notificaciones deseas recibir</p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Alertas de panico */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Alertas de Panico</h3>
                <p className="text-sm text-gray-500">Notificaciones cuando se activa una alerta de emergencia</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.panicAlerts}
              onChange={(v) => updatePreference('panicAlerts', v)}
            />
          </div>

          {/* Accesos QR */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Accesos a tu Informacion</h3>
                <p className="text-sm text-gray-500">Cuando alguien escanea tu codigo QR de emergencia</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.qrAccess}
              onChange={(v) => updatePreference('qrAccess', v)}
            />
          </div>

          {/* Representantes */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Actualizaciones de Representantes</h3>
                <p className="text-sm text-gray-500">Cambios en tus representantes legales</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.representativeUpdates}
              onChange={(v) => updatePreference('representativeUpdates', v)}
            />
          </div>

          {/* Documentos */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Documentos</h3>
                <p className="text-sm text-gray-500">Actualizaciones sobre tus directivas y documentos</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.documentUpdates}
              onChange={(v) => updatePreference('documentUpdates', v)}
            />
          </div>

          {/* Sistema */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Notificaciones del Sistema</h3>
                <p className="text-sm text-gray-500">Actualizaciones, mantenimiento y novedades</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.systemNotifications}
              onChange={(v) => updatePreference('systemNotifications', v)}
            />
          </div>
        </div>
      </div>

      {/* Canales de notificacion */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Canales de Notificacion</h2>
          <p className="text-sm text-gray-500 mt-1">Como deseas recibir las notificaciones</p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Push */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-vida-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-vida-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Notificaciones Push</h3>
                <p className="text-sm text-gray-500">Alertas instantaneas en tu dispositivo</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.pushEnabled && permission === 'granted'}
              onChange={(v) => updatePreference('pushEnabled', v)}
              disabled={permission !== 'granted'}
            />
          </div>

          {/* Email */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Correo Electronico</h3>
                <p className="text-sm text-gray-500">Resumen de actividad y alertas importantes</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.emailEnabled}
              onChange={(v) => updatePreference('emailEnabled', v)}
            />
          </div>

          {/* SMS */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">SMS</h3>
                <p className="text-sm text-gray-500">Mensajes de texto para alertas criticas</p>
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Info className="w-3 h-3" />
                  Requiere plan Premium
                </span>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.smsEnabled}
              onChange={(v) => updatePreference('smsEnabled', v)}
            />
          </div>
        </div>
      </div>

      {/* Horario de no molestar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Horario de No Molestar</h2>
              <p className="text-sm text-gray-500 mt-1">Silenciar notificaciones durante cierto horario</p>
            </div>
            <ToggleSwitch
              enabled={preferences.doNotDisturbEnabled}
              onChange={(v) => updatePreference('doNotDisturbEnabled', v)}
            />
          </div>
        </div>

        {preferences.doNotDisturbEnabled && (
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <Moon className="w-5 h-5 text-indigo-500" />
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde</label>
                  <input
                    type="time"
                    value={preferences.doNotDisturbStart}
                    onChange={(e) => updatePreference('doNotDisturbStart', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <span className="text-gray-400 mt-5">-</span>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                  <input
                    type="time"
                    value={preferences.doNotDisturbEnd}
                    onChange={(e) => updatePreference('doNotDisturbEnd', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 ml-9">
              Las alertas de panico siempre se mostraran, incluso en horario de no molestar.
            </p>
          </div>
        )}
      </div>

      {/* Sonido */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              {preferences.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-gray-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Sonido de Notificaciones</h3>
              <p className="text-sm text-gray-500">Reproducir sonido al recibir notificaciones</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={preferences.soundEnabled}
            onChange={(v) => updatePreference('soundEnabled', v)}
          />
        </div>
      </div>

      {/* Boton guardar */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-vida-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-vida-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
