// src/components/pages/Landing.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Heart,
  Shield,
  Clock,
  Users,
  FileText,
  QrCode,
  ArrowRight,
  Phone,
  Sparkles,
  User,
  Settings
} from 'lucide-react';
import { authApi } from '../../services/api';
import { adminLogin } from '../../services/adminApi';
import toast, { Toaster } from 'react-hot-toast';

// Verificar si el modo demo está habilitado (solo en desarrollo)
const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false';

// Usuarios demo para presentaciones (solo visibles si DEMO_ENABLED)
const DEMO_ACCOUNTS = {
  user: {
    email: 'demo@sistemavida.mx',
    password: 'Demo123!',
    name: 'Carlos García',
    type: 'Usuario Premium',
    redirect: '/dashboard',
  },
  admin: {
    email: 'admin@sistemavida.mx',
    password: 'Admin123!',
    name: 'Administrador',
    type: 'Panel Admin',
    redirect: '/admin/dashboard',
  },
};

const features = [
  {
    icon: FileText,
    title: 'Voluntad Anticipada Digital',
    description: 'Crea y almacena tu voluntad anticipada de forma segura, con validez legal conforme a la legislación mexicana.',
  },
  {
    icon: QrCode,
    title: 'Acceso de Emergencia',
    description: 'Un código QR único permite a profesionales de salud acceder a tu información crítica en segundos.',
  },
  {
    icon: Users,
    title: 'Representantes Designados',
    description: 'Notificación automática a tus seres queridos cuando se accede a tu información en emergencias.',
  },
  {
    icon: Shield,
    title: 'Seguridad de Grado Militar',
    description: 'Cifrado AES-256 y cumplimiento con NOM-151 para garantizar la integridad de tus documentos.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Regístrate',
    description: 'Crea tu cuenta con tu CURP y verifica tu identidad.',
  },
  {
    number: '02',
    title: 'Completa tu Perfil',
    description: 'Añade tu información médica y preferencias de tratamiento.',
  },
  {
    number: '03',
    title: 'Genera tu QR',
    description: 'Obtén tu código único para acceso de emergencia.',
  },
  {
    number: '04',
    title: 'Comparte con Confianza',
    description: 'Tu información estará disponible cuando más la necesites.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<'user' | 'admin' | null>(null);

  const handleDemoLogin = async (type: 'user' | 'admin') => {
    setIsLoading(type);
    const account = DEMO_ACCOUNTS[type];

    try {
      if (type === 'user') {
        const response = await authApi.login({ email: account.email, password: account.password });
        if (response.success && response.data) {
          localStorage.setItem('accessToken', response.data.tokens.accessToken);
          localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
          toast.success(`¡Bienvenido ${account.name}!`);
          navigate(account.redirect);
        }
      } else {
        await adminLogin(account.email, account.password);
        toast.success(`¡Bienvenido ${account.name}!`);
        navigate(account.redirect);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-vida-600" />
              <span className="text-xl font-bold text-vida-800">VIDA</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-vida-600 font-medium">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="btn-primary">
                Registrarse
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Banner de Demo Flotante (solo visible si DEMO_ENABLED) */}
      {DEMO_ENABLED && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-violet-200 p-4 w-72">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-violet-800">Demo Rápido</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleDemoLogin('user')}
                disabled={isLoading !== null}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading === 'user' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">Usuario Demo</div>
                  <div className="text-xs opacity-80">Ver dashboard completo</div>
                </div>
              </button>
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading !== null}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading === 'admin' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Settings className="w-5 h-5" />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">Panel Admin</div>
                  <div className="text-xs opacity-80">Ver métricas y gestión</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-vida-50 via-white to-vida-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-12">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-vida-100 rounded-full text-vida-700 text-sm font-medium">
                <Shield className="w-4 h-4" />
                Protegido por la ley mexicana
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Tu voluntad,<br />
                <span className="text-vida-600">siempre respetada</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                VIDA garantiza que tus decisiones médicas anticipadas estén disponibles 
                en el momento crítico, protegiendo tu autonomía y dignidad.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn-primary text-lg px-8 py-3">
                  Comenzar Ahora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link to="#features" className="btn-outline text-lg px-8 py-3">
                  Conocer Más
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-vida-200 border-2 border-white flex items-center justify-center">
                      <span className="text-xs font-medium text-vida-700">{String.fromCharCode(65 + i)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">+10,000</span> mexicanos confían en VIDA
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-vida-400 to-vida-600 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-xl p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-salud-50 rounded-xl">
                  <div className="w-12 h-12 bg-salud-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-salud-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Acceso en segundos</p>
                    <p className="text-sm text-gray-500">Información crítica disponible 24/7</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-vida-50 rounded-xl">
                  <div className="w-12 h-12 bg-vida-100 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-vida-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Validez Legal</p>
                    <p className="text-sm text-gray-500">Conforme a la legislación de tu estado</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-coral-50 rounded-xl">
                  <div className="w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-coral-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Notificación Inmediata</p>
                    <p className="text-sm text-gray-500">Tus representantes son alertados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para proteger tus decisiones
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Una plataforma integral diseñada específicamente para el contexto legal y médico mexicano.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-hover text-center">
                <div className="w-14 h-14 bg-vida-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-vida-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Cómo funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              En solo 4 pasos, protege tus decisiones médicas para el futuro.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-vida-100 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 w-1/2 border-t-2 border-dashed border-vida-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-vida-600 to-vida-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Protege tu voluntad hoy
          </h2>
          <p className="text-xl text-vida-100 mb-8 max-w-2xl mx-auto">
            No esperes a una emergencia. Registra tus decisiones médicas ahora y 
            garantiza que sean respetadas cuando más importa.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-vida-700 font-semibold px-8 py-4 rounded-lg hover:bg-vida-50 transition-colors text-lg">
            Crear mi cuenta gratuita
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-vida-400" />
              <span className="text-xl font-bold text-white">VIDA</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white">Términos de Uso</a>
              <a href="#" className="hover:text-white">Política de Privacidad</a>
              <a href="#" className="hover:text-white">Contacto</a>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 Sistema VIDA. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
