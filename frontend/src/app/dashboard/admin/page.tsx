"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllTickets } from "@/services/ticketService";
import { getMe } from "@/services/userService";
import type { TicketRead } from "@/types/ticket";
import type { UserRead } from "@/types/user";
import Link from "next/link";

// Helpers visuales (podrían extraerse a un archivo compartido utils.ts)
function getStatusStyle(status: TicketRead["status"]): string {
  const styles: Record<TicketRead["status"], string> = {
    open: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    in_progress: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    closed: "bg-green-500/20 text-green-300 border border-green-500/30",
  };
  return styles[status] ?? "bg-gray-500/20 text-gray-300";
}

function getStatusLabel(status: TicketRead["status"]): string {
  return { open: "Abierto", in_progress: "En proceso", closed: "Cerrado" }[status] ?? status;
}

function getPriorityLabel(p: number) { return { 1: "Baja", 2: "Media", 3: "Alta" }[p] ?? "N/A"; }
function getPriorityColor(p: number) { return { 1: "text-gray-400", 2: "text-yellow-400", 3: "text-red-400" }[p] ?? "text-white"; }

export default function AdminDashboardPage() {
  const router = useRouter();

  // Guardamos los datos del usuario administrador de la sesión actual
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);

  // Tickets completos del sistema
  const [tickets, setTickets] = useState<TicketRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gestión de estado para las pestañas de navegación
  // 'inbox': Tickets no asignados (bandeja pública).
  // 'mytickets': Tickets asignados explícitamente al técnico actual.
  const [activeTab, setActiveTab] = useState<"inbox" | "mytickets">("inbox");

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  /**
   * Efecto de inicialización: Obtiene el perfil del usuario autenticado.
   * Redirige a usuarios sin privilegios administrativos (rol 3) al dashboard general.
   */
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getMe();
        if (user.role_id === 3) { // 3 = Cliente normal
          router.push("/dashboard"); // Redirección al dashboard estándar
          return;
        }
        setCurrentUser(user);
      } catch {
        router.push("/login");
      }
    }
    fetchUser();
  }, [router]);

  /**
   * Efecto reactivo: Actualiza la lista de tickets ante cambios en los parámetros de filtrado.
   */
  useEffect(() => {
    if (!currentUser) return; // Solo buscar si ya verificamos el auth

    async function fetchAll() {
      setLoading(true);
      try {
        const data = await getAllTickets(statusFilter || undefined, sortBy);
        setTickets(data);
      } catch (err: any) {
        setError(err.message || "Error cargando la lista global");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [currentUser, statusFilter, sortBy]);

  // Clasificación y filtrado de tickets por estado de asignación
  // 'inbox': Tickets activos (no cerrados) sin técnico asignado
  const inboxTickets = tickets.filter(t => t.assigned_technician_id === null && t.status !== "closed");

  // 'mytickets': Tickets asignados al usuario actual
  const myTickets = tickets.filter(t => t.assigned_technician_id === currentUser?.id);

  const displayList = activeTab === "inbox" ? inboxTickets : myTickets;

  if (!currentUser) return <div className="p-8 text-white min-h-screen bg-slate-950">Validando sesión...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin <span className="text-indigo-400">Dashboard</span></h1>
            <p className="text-gray-400">Bienvenido, {currentUser.full_name} ({currentUser.role_id === 1 ? "Admin" : "Técnico"}).</p>
          </div>
        </header>

        {/* Action Bar (Filtros y Tabs) */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "inbox" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-slate-800"}`}
            >
              📥 Bandeja Pública ({inboxTickets.length})
            </button>
            <button
              onClick={() => setActiveTab("mytickets")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === "mytickets" ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-slate-800"}`}
            >
              🙋‍♂️ Mis Asignaciones ({myTickets.length})
            </button>
          </div>

          <div className="flex space-x-4 mt-4 md:mt-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring focus:ring-indigo-500"
            >
              <option value="">Todos los Estados</option>
              <option value="open">Solo Abiertos</option>
              <option value="in_progress">Solo En Proceso</option>
              <option value="closed">Solo Cerrados</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring focus:ring-indigo-500"
            >
              <option value="newest">Más Próximos</option>
              <option value="oldest">Más Antiguos</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center py-20 text-indigo-400"><div className="animate-spin w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent" /></div>
        ) : error ? (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-xl">{error}</div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-20 bg-slate-900 rounded-xl border border-slate-800">
            <p className="text-gray-400 text-lg">No hay tickets en esta sección.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayList.map(ticket => (
              <div key={ticket.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between hover:border-indigo-500/50 transition">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                    <span className={`text-xs flex items-center gap-1 ${getPriorityColor(ticket.priority_id)}`}>
                      ● {getPriorityLabel(ticket.priority_id)}
                    </span>
                    <span className="text-gray-500 text-xs">#{ticket.id}</span>
                  </div>
                  <h3 className="text-white font-semibold mt-2 text-lg">{ticket.title}</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-2xl truncate">{ticket.description}</p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <span className="text-gray-500 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/dashboard/admin/tickets/${ticket.id}`}
                    className="mt-2 bg-slate-800 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm transition"
                  >
                    Ver Detalles →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
