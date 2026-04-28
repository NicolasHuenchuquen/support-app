"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTicketById, assignTicket, unassignTicket } from "@/services/ticketService";
import { getMe } from "@/services/userService";
import type { TicketRead } from "@/types/ticket";
import type { UserRead } from "@/types/user";
import Link from "next/link";
import React from "react";

function getStatusLabel(status: string): string {
  return { open: "Abierto", in_progress: "En proceso", closed: "Cerrado" }[status] || status;
}

export default function AdminTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // En Next.js 15, `params` es una Promise. React.use() la "desenvuelve"
  // de forma segura y sincrona dentro del componente.
  const { id } = React.use(params);
  const ticketId = parseInt(id, 10);

  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [ticket, setTicket] = useState<TicketRead | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getMe();
        if (user.role_id === 3) {
          router.push("/dashboard");
          return;
        }
        setCurrentUser(user);

        const data = await getTicketById(ticketId);
        setTicket(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar el ticket");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ticketId, router]);

  const handleAssign = async () => {
    setIsProcessing(true);
    try {
      const updatedTicket = await assignTicket(ticketId);
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnassign = async () => {
    setIsProcessing(true);
    try {
      const updatedTicket = await unassignTicket(ticketId);
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-white bg-slate-950 min-h-screen">Cargando detalles...</div>;
  if (error || !ticket) return <div className="p-8 bg-slate-950 min-h-screen text-red-400">Error: {error}</div>;

  const isAssignedToMe = ticket.assigned_technician_id === currentUser?.id;
  const isAssignedToOther = ticket.assigned_technician_id !== null && !isAssignedToMe;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
         
         {/* Navegación */}
         <Link href="/dashboard/admin" className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 inline-block">
            ← Volver al Panel Admin
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
               
               {/* Controles de Asignación */}
               <div className="flex flex-col items-end">
                   {isAssignedToMe ? (
                       <button onClick={handleUnassign} disabled={isProcessing} className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          {isProcessing ? "Procesando..." : "Devolver Ticket"}
                       </button>
                   ) : isAssignedToOther ? (
                       <div className="text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-lg text-sm">
                          Asignado a ID: {ticket.assigned_technician_id}
                          {/* Opcional: El admin podría "robar" el asignamiento usando el mismo router, pero dejémoslo informativo */}
                       </div>
                   ) : (
                       <button onClick={handleAssign} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          {isProcessing ? "Procesando..." : "Asignarme Ticket"}
                       </button>
                   )}
               </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800">
               <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Descripción Reportada</h3>
               <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            </div>
         </div>
         
         {/* Interfaz de Chat Estática (Fake para demostrar ubicación) */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 h-64 flex flex-col items-center justify-center text-center">
             <h2 className="text-lg text-gray-400 font-medium mb-2">Sección de Mensajes</h2>
             <p className="text-sm text-gray-500 max-w-md">
                 Aquí iría el recuadro del CHAT. Los mensajes de auditoria (<em>is_system = true/false</em>) de nuestros nuevos endpoints se mostrarán como globos centrados grises. El modelo y migración están listos en el backend!
             </p>
         </div>
      </div>
    </div>
  );
}
