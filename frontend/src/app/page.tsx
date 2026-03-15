"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // --------------------------------------------------------------------------------
    // NOTA: Aquí iría tu lógica real llamando a tu servicio de backend (UserService)
    // Ejemplo: const response = await login(email, password);
    // const role = response.user.role;
    // --------------------------------------------------------------------------------

    // Simulación para mostrar el redireccionamiento según el rol:
    if (email === "admin@soporte.com") {
      // Redirige al panel de Administrador
      router.push("/admin/dashboard");
    } else if (email) {
      // Redirige al panel de Usuario común
      router.push("/dashboard");
    } else {
      setError("Por favor ingresa credenciales válidas.");
    }
  };

  return (
    // Fondo temático: Tecnología/Soporte (Degradado de azul oscuro a cian/pizarra)
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 flex items-center justify-center p-4">
      
      {/* Tarjeta del Login */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Encabezado de la Tarjeta */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          {/* Elemento de diseño de fondo (círculos decorativos) */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-cyan-400 rounded-full opacity-50"></div>
          
          <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">
            Support<span className="text-cyan-300">Desk</span>
          </h1>
          <p className="text-blue-100 mt-2 text-sm relative z-10">
            Portal de Asistencia Técnica
          </p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Iniciar Sesión
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 outline-none text-gray-800"
                placeholder="usuario@correo.com"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 outline-none text-gray-800"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex justify-center items-center"
            >
              Ingresar al sistema
            </button>
          </form>

          {/* Enlace a Registro (Footer de la tarjeta) */}
          <div className="mt-8 text-center bg-slate-50 -mx-8 -mb-8 p-5 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta de soporte?{" "}
              <Link 
                href="/register" 
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}