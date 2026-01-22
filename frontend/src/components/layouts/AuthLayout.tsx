// src/components/layouts/AuthLayout.tsx
import { Outlet, Link } from 'react-router-dom';
import { Heart, Shield, CheckCircle } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-vida-600 to-vida-800 p-12 flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center gap-3">
            <Heart className="w-10 h-10 text-white" />
            <span className="text-2xl font-bold text-white">VIDA</span>
          </Link>
        </div>
        
        <div className="space-y-8">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Tu voluntad anticipada,<br />
            siempre accesible
          </h1>
          <p className="text-vida-100 text-lg">
            Garantiza que tus decisiones médicas sean respetadas cuando más importa.
          </p>
          
          <div className="space-y-4">
            {[
              'Registro seguro con verificación de identidad',
              'Cifrado de grado militar (AES-256)',
              'Acceso de emergencia para profesionales de salud',
              'Cumplimiento con NOM-151 y LFPDPPP',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white">
                <CheckCircle className="w-5 h-5 text-vida-200" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-vida-200 text-sm">
          <Shield className="w-4 h-4" />
          <span>Datos protegidos bajo la Ley Federal de Protección de Datos Personales</span>
        </div>
      </div>
      
      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <Heart className="w-10 h-10 text-vida-600" />
              <span className="text-2xl font-bold text-vida-800">VIDA</span>
            </Link>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
}
