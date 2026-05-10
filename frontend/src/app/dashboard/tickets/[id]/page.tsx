"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTicketById } from "@/services/ticketService";
import { getMe } from "@/services/userService";
import type { TicketRead } from "@/types/ticket";
import type { UserRead } from "@/types/user";
import Link from "next/link";
import React from "react";
import ChatBox from "@/components/ChatBox";

function getStatusLabel(status: string): string {
  return { open: "Abierto", in_progress: "En proceso", closed: "Cerrado" }[status] || status;
}

export default function ClientTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const ticketId = parseInt(id, 10);

  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [ticket, setTicket] = useState<TicketRead | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getMe();
        setCurrentUser(user);

        const data = await getTicketById(ticketId);
        // Validar que el cliente solo vea su propio ticket
        if (user.role_id === 3 && data.user_id !== user.id) {
            router.push("/dashboard");
            return;
        }
        setTicket(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar el ticket");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ticketId, router]);

  if (loading) return <div className="p-8 text-white bg-slate-950 min-h-screen">Cargando detalles...</div>;
  if (error || !ticket || !currentUser) return <div className="p-8 bg-slate-950 min-h-screen text-red-400">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
         
         {/* Navegación */}
         <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 inline-block">
            ← Volver a Mis Tickets
         </Link>
         
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-6">
            <div className="flex justify-between items-start">
               <div>
                 <h1 className="text-2xl font-bold text-white mb-2">{ticket.title}</h1>
                 <p className="text-gray-400 text-sm">Ticket #{ticket.id} • Creado el {new Date(ticket.created_at).toLocaleString()}</p>
                 <span className="inline-block mt-3 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30">
                   Estado: {getStatusLabel(ticket.status)}
                 </span>
               </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800">
               <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Descripción Reportada</h3>
               <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            </div>
         </div>
         
         {/* Chat en tiempo real */}
         <ChatBox
           ticketId={ticketId}
           currentUser={currentUser}
           roleId={currentUser.role_id}
           initialAssignedTechnicianId={ticket.assigned_technician_id ?? null}
         />
      </div>
    </div>
  );
}
