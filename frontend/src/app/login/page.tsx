"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/services/userService";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/login/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
        credentials: "include", 
      });

      if (response.ok) {
        // Consultamos el rol del usuario para redirigir al panel correcto.
        // role_id 1 = Admin, 2 = Técnico → panel de administración.
        // role_id 3 = Cliente → dashboard normal.
        const me = await getMe();
        if (me.role_id === 1 || me.role_id === 2) {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error de red tratando de contactar al servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Support App
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Inicia sesión en tu cuenta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-sm sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Correo Electrónico
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3 text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-semibold text-blue-500 hover:text-blue-400">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
