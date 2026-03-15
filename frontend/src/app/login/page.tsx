"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * LoginPage Component
 * 
 * @description
 * Renderiza el formulario de inicio de sesión de la aplicación.
 * Captura las credenciales del usuario (email y contraseña) y las envía al endpoint de autenticación del backend.
 * Si las credenciales son válidas, el backend establece una cookie HTTP-only con el JWT y el usuario es redirigido al panel principal.
 * 
 * @returns {JSX.Element} Formulario de inicio de sesión renderizado.
 * 
 * @dependencies
 * - `useState`: Para la gestión de los datos del formulario (email, password) y estados de UI (error, carga).
 * - `useRouter`: Para controlar la navegación post-login hacia el dashboard.
 * - `fetch`: Función nativa para realizar la petición HTTP al backend de FastAPI.
 * 
 * @notes
 * El endpoint de login de FastAPI espera los datos en formato URL-encoded (`application/x-www-form-urlencoded`) 
 * en lugar de JSON, como lo dicta el estándar de OAuth2 con Password Flow.
 */
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Maneja el evento de envío (submit) del formulario de login.
   * 
   * @param {React.FormEvent} e - El evento del formulario disparado por el envío.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      /*
       * Construir los datos del formulario.
       * 
       * ¿Dónde se guardan al enviar?
       * La varibale `formData` crea un objeto temporal en la memoria del navegador
       * con la información que recolectó de las variables `email` y `password`.
       * Luego, este objeto temporal viaja completo por internet a través de la petición HTTP (fetch).
       * No se guarda en el disco duro; vive solo durante la transacción.
       */
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("http://localhost:8000/login/token", {
        method: "POST",
        /*
         * Encabezados de la petición (Headers):
         * 
         * FastAPI por defecto usa el estándar OAuth2, el cual especifica
         * que los formularios de login deben enviar los datos codificados en la URL,
         * como si los hubieses puesto en la barra superior (ej: username=abc&password=123).
         * 
         * Decirle esto mediante el "Content-Type" le "enseña" al servidor cómo
         * deconstruir y entender el paquete de datos que acabamos de enviarle en el cuerpo (body).
         */
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (response.ok) {
        // Redirigir al dashboard si la autenticación es exitosa y la cookie se ha guardado.
        router.push("/dashboard");
      } else {
        // Extraer y mostrar el mensaje de error provisto por FastAPI (ej. 401 Unauthorized).
        const errorData = await response.json();
        setError(errorData.detail || "Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error de red.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Iniciar Sesión
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border text-slate-900 border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border text-slate-900 border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"}`}
          >
            {isLoading ? "Iniciando sesión..." : "Entrar a mi Cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
