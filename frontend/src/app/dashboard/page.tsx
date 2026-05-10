"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyTickets, createTicket, logout } from "@/services/ticketService";
import type { TicketRead, TicketCreate } from "@/types/ticket";

// ---------------------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------------------

/**
 * Retorna las clases CSS de Tailwind para el badge de estado de un ticket.
 *
 * @param {TicketRead["status"]} status - Estado del ticket.
 * @returns {string} Clases CSS para el color del badge.
 */
function getStatusStyle(status: TicketRead["status"]): string {
  const styles: Record<TicketRead["status"], string> = {
    open: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    in_progress: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    closed: "bg-green-500/20 text-green-300 border border-green-500/30",
  };
  return styles[status] ?? "bg-gray-500/20 text-gray-300";
}

/**
 * Traduce el valor de `status` de la BD a un texto legible en español.
 *
 * @param {TicketRead["status"]} status - Estado del ticket en inglés.
 * @returns {string} Etiqueta en español para mostrar en la UI.
 */
function getStatusLabel(status: TicketRead["status"]): string {
  const labels: Record<TicketRead["status"], string> = {
    open: "Abierto",
    in_progress: "En proceso",
    closed: "Cerrado",
  };
  return labels[status] ?? status;
}

/**
 * Retorna las clases CSS según el `priority_id` del ticket.
 * Los IDs de prioridad dependen de cómo estén cargados en la BD
 * (generalmente: 1=low, 2=medium, 3=high).
 *
 * @param {number} priorityId - ID de prioridad del ticket.
 * @returns {string} Clases CSS para el indicador de prioridad.
 */
function getPriorityStyle(priorityId: number): string {
  const styles: Record<number, string> = {
    1: "text-gray-400",           // low
    2: "text-yellow-400",         // medium
    3: "text-red-400",            // high
  };
  return styles[priorityId] ?? "text-gray-400";
}

function getPriorityLabel(priorityId: number): string {
  const labels: Record<number, string> = {
    1: "Baja",
    2: "Media",
    3: "Alta",
  };
  return labels[priorityId] ?? `Prioridad ${priorityId}`;
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

/**
 * Tarjeta individual para mostrar un ticket en la lista.
 *
 * @param {{ ticket: TicketRead }} props - El ticket a renderizar.
 * @returns {JSX.Element} Tarjeta con título, estado, prioridad y fecha.
 */
function TicketCard({ ticket }: { ticket: TicketRead }) {
  return (
    <Link href={`/dashboard/tickets/${ticket.id}`} className="block">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:bg-slate-800 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{ticket.title}</h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{ticket.description}</p>
          </div>
          {/* Badge de estado */}
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyle(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>

        {/* Fila inferior: prioridad y fecha */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className={`text-xs font-medium flex items-center gap-1 ${getPriorityStyle(ticket.priority_id)}`}>
            <span>●</span>
            {getPriorityLabel(ticket.priority_id)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(ticket.created_at).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Componente principal: DashboardPage
// ---------------------------------------------------------------------------

/**
 * DashboardPage Component
 *
 * @description
 * Panel principal del usuario autenticado. Gestiona la visualización de tickets
 * y la creación de nuevos tickets de soporte.
 *
 * Se divide en dos pestañas:
 * - **Mis Tickets**: lista los tickets activos (open, in_progress) y resueltos (closed).
 * - **Crear Ticket**: formulario para registrar un nuevo ticket de soporte.
 *
 * @returns {JSX.Element} Panel del dashboard con tabs, lista de tickets y formulario.
 *
 * @dependencies
 * - `getMyTickets`: Obtiene todos los tickets del usuario desde la API.
 * - `createTicket`:  Envía un nuevo ticket a la API.
 * - `logout`:        Elimina la cookie JWT y redirige al login.
 * - `useRouter`:     Para redirigir al login después del logout.
 * - `useState`:      Para manejar la tab activa, tickets, estado del formulario, etc.
 * - `useEffect`:     Para cargar los tickets automáticamente al montar el componente.
 *
 * @notes
 * La autenticación no se valida aquí explícitamente: si el usuario no tiene
 * cookie JWT, `getMyTickets` fallará con 401 y el error se muestra en la UI.
 * En una app de producción se añadiría un middleware de Next.js para redirigir
 * automáticamente a /login si no hay sesión activa.
 */
export default function DashboardPage() {
  const router = useRouter();

  // Tab activa: "tickets" o "create"
  const [activeTab, setActiveTab] = useState<"tickets" | "create">("tickets");

  // Estado de la lista de tickets
  const [tickets, setTickets] = useState<TicketRead[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  // Estado del formulario de creación
  const [form, setForm] = useState<TicketCreate>({
    title: "",
    description: "",
    priority_id: 2, // Prioridad "Media" por defecto
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  // Estado del logout
  const [loggingOut, setLoggingOut] = useState(false);

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------

  /**
   * Carga los tickets del usuario durante el montaje del componente.
   * La dependencia vacía asegura una única ejecución.
   * Utiliza useEffect para realizar el fetch a la API del backend.
   */
  useEffect(() => {
    async function fetchTickets() {
      try {
        const data = await getMyTickets();
        setTickets(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setTicketsError(message);
      } finally {
        setLoadingTickets(false);
      }
    }
    fetchTickets();
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Maneja el envío del formulario de creación de ticket.
   *
   * @param {React.FormEvent} e - El evento de submit del formulario.
   */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); // Evita el refresco nativo del navegador al enviar el form
    setCreateError("");
    setCreateSuccess(false);
    setCreating(true);

    try {
      const newTicket = await createTicket(form);

      // Añadir el ticket a la lista local inmediatamente sin necesidad de recargar,
      // optimizando el uso de la API y mejorando la respuesta de la interfaz.
      setTickets((prev) => [newTicket, ...prev]);

      setCreateSuccess(true);

      // Resetear el formulario a los valores por defecto
      setForm({ title: "", description: "", priority_id: 2 });

      setTimeout(() => {
        setActiveTab("tickets");
        setCreateSuccess(false);
      }, 1500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al crear el ticket";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  /**
   * Cierra la sesión del usuario.
   *
   * Llama al endpoint de logout (que borra la cookie en el navegador)
   * y redirige al login independientemente del resultado, ya que
   * si la cookie no existe el usuario ya está efectivamente deslogueado.
   */
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // Redirigir siempre, incluso si el endpoint falla
      router.push("/login");
    }
  }

  // ---------------------------------------------------------------------------
  // Derivaciones de datos
  // ---------------------------------------------------------------------------

  const activeTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress"
  );
  const resolvedTickets = tickets.filter((t) => t.status === "closed");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Contenido principal */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Support <span className="text-indigo-400">App</span>
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Panel de soporte técnico</p>
          </div>

          <button
            id="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-slate-800 hover:bg-slate-800 rounded-lg px-4 py-2 transition-all duration-200 disabled:opacity-50"
          >
            {loggingOut ? "Saliendo..." : "Cerrar sesión"}
            <span className="text-lg">→</span>
          </button>
        </header>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total", value: tickets.length, color: "text-white" },
            { label: "Activos", value: activeTickets.length, color: "text-indigo-400" },
            { label: "Resueltos", value: resolvedTickets.length, color: "text-green-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"
            >
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6">
          {(["tickets", "create"] as const).map((tab) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              {tab === "tickets" ? "📋 Mis Tickets" : "➕ Crear Ticket"}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Mis Tickets                                                    */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "tickets" && (
          <div className="space-y-6">

            {/* Estado de carga */}
            {loadingTickets && (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-3" />
                Cargando tickets...
              </div>
            )}

            {/* Error de carga */}
            {!loadingTickets && ticketsError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                ⚠️ {ticketsError}
              </div>
            )}

            {/* Sin tickets */}
            {!loadingTickets && !ticketsError && tickets.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <div className="text-5xl mb-4">🎫</div>
                <p className="text-lg font-medium text-gray-400">No tenés tickets aún</p>
                <p className="text-sm mt-1">
                  Usá la pestaña{" "}
                  <button
                    onClick={() => setActiveTab("create")}
                    className="text-indigo-400 hover:underline"
                  >
                    Crear Ticket
                  </button>{" "}
                  para registrar un problema.
                </p>
              </div>
            )}

            {/* Tickets Activos */}
            {!loadingTickets && activeTickets.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  Activos ({activeTickets.length})
                </h2>
                <div className="space-y-3">
                  {activeTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </section>
            )}

            {/* Tickets Resueltos */}
            {!loadingTickets && resolvedTickets.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Resueltos ({resolvedTickets.length})
                </h2>
                <div className="space-y-3 opacity-80">
                  {resolvedTickets.map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Tab: Crear Ticket                                                   */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "create" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Nuevo Ticket de Soporte</h2>
            <p className="text-sm text-gray-400 mb-6">
              Describí el problema con el mayor detalle posible para que el equipo técnico pueda ayudarte.
            </p>

            <form onSubmit={handleCreate} className="space-y-5">

              {/* Título */}
              <div>
                <label htmlFor="ticket-title" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Título <span className="text-red-400">*</span>
                </label>
                <input
                  id="ticket-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  minLength={5}
                  maxLength={255}
                  placeholder="Ej: No puedo acceder al sistema de inventario"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="ticket-description" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Descripción <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="ticket-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Describí qué pasó, cuándo ocurrió, y qué intentaste hacer para solucionarlo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Prioridad */}
              <div>
                <label htmlFor="ticket-priority" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Prioridad
                </label>
                <select
                  id="ticket-priority"
                  value={form.priority_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority_id: Number(e.target.value) }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value={1}>🟢 Baja — No urgente, puede esperar</option>
                  <option value={2}>🟡 Media — Afecta el trabajo pero hay alternativa</option>
                  <option value={3}>🔴 Alta — Bloquea completamente mi trabajo</option>
                </select>
              </div>

              {/* Mensajes de error y éxito */}
              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  ⚠️ {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                  ✅ Ticket creado correctamente. Redirigiendo...
                </div>
              )}

              {/* Botón de envío */}
              <button
                id="create-ticket-button"
                type="submit"
                disabled={creating}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando ticket...
                  </span>
                ) : (
                  "Crear Ticket"
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
