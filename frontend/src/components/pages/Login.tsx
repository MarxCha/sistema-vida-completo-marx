// src/components/pages/Login.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Fingerprint, Sparkles, User, Shield } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import { webauthnApi } from '../../services/api';
import toast from 'react-hot-toast';

// Verificar si el modo demo está habilitado (solo en desarrollo)
const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false';

// Usuarios demo para presentaciones (solo visibles si DEMO_ENABLED)
const DEMO_USERS = [
  {
    email: 'demo@sistemavida.mx',
    password: 'Demo123!',
    name: 'Carlos García',
    description: 'Usuario Premium con perfil completo',
    plan: 'Premium',
    color: 'from-emerald-500 to-teal-500',
  },
];

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const { login, loginWithTokens } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');

  // Verificar soporte de WebAuthn
  useEffect(() => {
    setIsWebAuthnSupported(window.PublicKeyCredential !== undefined);
  }, []);

  // Verificar si el usuario tiene credenciales biométricas cuando cambia el email
  useEffect(() => {
    const checkBiometric = async () => {
      if (!emailValue || !isWebAuthnSupported) {
        setHasBiometric(false);
        return;
      }

      // Validar que sea un email válido
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        setHasBiometric(false);
        return;
      }

      try {
        const response = await webauthnApi.checkBiometric(emailValue);
        setHasBiometric(response.data?.hasBiometricCredentials || false);
      } catch {
        setHasBiometric(false);
      }
    };

    // Debounce para no hacer muchas peticiones
    const timer = setTimeout(checkBiometric, 500);
    return () => clearTimeout(timer);
  }, [emailValue, isWebAuthnSupported]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Login con usuario demo
  const handleDemoLogin = async (demoUser: typeof DEMO_USERS[0]) => {
    setIsLoading(true);
    try {
      await login({ email: demoUser.email, password: demoUser.password });
      toast.success(`¡Bienvenido ${demoUser.name}!`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!emailValue) {
      toast.error('Ingresa tu correo electrónico primero');
      return;
    }

    setIsBiometricLoading(true);
    try {
      // 1. Obtener opciones de autenticación del servidor
      const optionsResponse = await webauthnApi.getAuthenticationOptions(emailValue);

      if (!optionsResponse.success || !optionsResponse.data) {
        throw new Error('No se pudieron obtener las opciones de autenticación');
      }

      const { options, userId } = optionsResponse.data;

      // 2. Iniciar autenticación en el dispositivo (Face ID, Touch ID, etc.)
      const credential = await startAuthentication({ optionsJSON: options });

      // 3. Verificar la autenticación en el servidor
      const verifyResponse = await webauthnApi.verifyAuthentication(userId, credential);

      if (!verifyResponse.success || !verifyResponse.data) {
        throw new Error('Error verificando la autenticación');
      }

      // 4. Guardar tokens y navegar
      const { user, accessToken, refreshToken } = verifyResponse.data;
      loginWithTokens(user, { accessToken, refreshToken });

      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error en login biométrico:', error);

      // Mensajes de error más amigables
      let errorMessage = 'Error en la autenticación biométrica';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'La autenticación fue cancelada';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Error de seguridad. Asegúrate de estar en HTTPS';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
        <p className="text-gray-600">
          Accede a tu cuenta para gestionar tu voluntad anticipada
        </p>
      </div>

      {/* Sección de Demo - Acceso Rápido (solo visible si DEMO_ENABLED) */}
      {DEMO_ENABLED && (
        <>
          <div className="mb-8 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-semibold text-violet-800">Acceso Demo</span>
            </div>
            <p className="text-sm text-violet-600 mb-4">
              Prueba el sistema con un usuario de demostración
            </p>
            <div className="space-y-2">
              {DEMO_USERS.map((demoUser, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDemoLogin(demoUser)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 p-3 bg-gradient-to-r ${demoUser.color} text-white rounded-lg hover:opacity-90 transition-all shadow-md hover:shadow-lg disabled:opacity-50`}
                >
                  <User className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{demoUser.name}</div>
                    <div className="text-xs opacity-90">{demoUser.description}</div>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{demoUser.plan}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-violet-200">
              <Link
                to="/admin/login"
                className="flex items-center justify-center gap-2 text-sm text-violet-700 hover:text-violet-900 font-medium"
              >
                <Shield className="w-4 h-4" />
                Acceder como Administrador
              </Link>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">o ingresa tus credenciales</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
              placeholder="tu@email.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Botón de login biométrico - aparece si hay credenciales */}
        {hasBiometric && isWebAuthnSupported && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={isBiometricLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBiometricLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-6 h-6" />
                  <span className="font-medium">Acceder con Face ID / Touch ID</span>
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">o usa tu contraseña</span>
              </div>
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Forgot password */}
        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-vida-600 hover:text-vida-700 font-medium"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isBiometricLoading}
          className="btn-primary w-full py-3"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Iniciando sesión...
            </div>
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>

      {/* Mensaje informativo sobre biometría */}
      {isWebAuthnSupported && !hasBiometric && emailValue && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            <Fingerprint className="w-4 h-4 inline mr-1" />
            ¿Quieres usar Face ID / Touch ID? Configúralo en tu perfil después de iniciar sesión.
          </p>
        </div>
      )}

      {/* Register link */}
      <p className="mt-8 text-center text-gray-600">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-vida-600 hover:text-vida-700 font-medium">
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
}
