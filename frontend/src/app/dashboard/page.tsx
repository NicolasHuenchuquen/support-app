export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-lg text-center">
        <h1 className="text-4xl font-extrabold text-green-600 mb-4">
          ¡Ingreso Exitoso!
        </h1>
        <p className="text-gray-600 mb-6 text-lg">
          Esta es la página secreta de Dashboard. Solo se llega hasta aquí si el frontend de Next.js recibió el HTTP 200 de FastAPI mediante <code>router.push()</code>.
        </p>
        <p className="text-sm text-gray-500 mb-8 border-t pt-4">
          Revisar herramientas de desarrollador:
          <br />
          (F12 → Pestaña Application → Cookies → localhost).
          <br />¡El Token seguro está ahí guardado!
        </p>

        <a
          href="/login"
          className="text-blue-500 hover:text-blue-700 hover:underline font-medium"
        >
          ← Volver al Login
        </a>
      </div>
    </div>
  );
}
