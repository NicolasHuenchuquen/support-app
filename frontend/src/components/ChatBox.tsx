"use client";

/**
 * components/ChatBox.tsx — Componente de Chat en Tiempo Real
 *
 * Funcionalidad principal:
 *   1. Al montarse: carga el historial de mensajes via HTTP (getMessages).
 *   2. Al montarse: abre un canal WebSocket para recibir mensajes en tiempo real.
 *   3. Renderiza mensajes diferenciados:
 *      - is_system=true  → Log de auditoría (gris, centrado, pequeño).
 *      - is_system=false → Burbuja de chat:
 *          - Mensaje propio → alineado a la derecha (fondo índigo).
 *          - Mensaje ajeno  → alineado a la izquierda, nombre del autor arriba.
 *   4. Maneja eventos de control del WebSocket:
 *      - "ticket_assigned"   → Muestra banner si el ticket fue tomado por alguien más.
 *      - "ticket_unassigned" → Oculta el banner si el ticket vuelve a estar disponible.
 *   5. Al desmontarse: cierra el WebSocket para evitar memory leaks.
 *
 * Dependencias:
 *   - messageService: getMessages(), openChatSocket(), sendMessage()
 *   - types/message.ts: MessageRead, WebSocketEvent
 *   - types/user.ts: UserRead
 */

import { useEffect, useRef, useState } from "react";
import type { MessageRead, WebSocketEvent, TicketAssignedEvent } from "@/types/message";
import type { UserRead } from "@/types/user";
import { getMessages, openChatSocket, sendMessage } from "@/services/messageService";

// ---------------------------------------------------------------------------
// Props del componente
// ---------------------------------------------------------------------------

interface ChatBoxProps {
  /**
   * ID del ticket cuyo chat se muestra.
   * Usado para cargar el historial y conectar al WebSocket correcto.
   */
  ticketId: number;

  /**
   * El usuario actualmente autenticado.
   * Usado para determinar si un mensaje es "mío" (alineado a la derecha)
   * o "de otro" (alineado a la izquierda con nombre del autor).
   */
  currentUser: UserRead;

  /**
   * role_id del usuario actual (1=Admin, 2=Técnico, 3=Cliente).
   * Determina si el input de chat está habilitado o no cuando el ticket
   * es tomado por otra persona:
   *   - Admin (rol 1): puede leer el chat aunque no sea el asignado.
   *   - Técnico (rol 2): input bloqueado si el ticket fue asignado a otro.
   *   - Cliente (rol 3): siempre puede escribir en su propio ticket.
   */
  roleId: number;

  /**
   * ID del técnico actualmente asignado al ticket (null si no hay ninguno).
   * Estado inicial desde la página padre. El componente actualiza su propio
   * estado local cuando recibe eventos WebSocket de asignación/desasignación.
   */
  initialAssignedTechnicianId: number | null;
}

// ---------------------------------------------------------------------------
// Helper: Formatear la hora del mensaje
// ---------------------------------------------------------------------------

/**
 * Convierte un timestamp ISO 8601 a una hora legible con fecha relativa.
 * Ejemplo: "Hoy 14:35", "Ayer 09:15", "12/04/26 10:00"
 */
function formatTime(isoString: string): string {
  // El backend de FastAPI (SQLAlchemy) devuelve la fecha en UTC pero sin la 'Z' final (naive).
  // Se agrega la 'Z' para forzar a que sea interpretado como UTC, permitiendo que
  // el navegador realice la conversión a la zona horaria local de manera automática.
  const utcString = isoString.endsWith("Z") ? isoString : `${isoString}Z`;
  const date = new Date(utcString);
  const now = new Date();
  
  // Limpiar horas para comparar solo las fechas
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Formato de hora (ej: 14:35)
  const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (targetDate.getTime() === today.getTime()) {
    return `Hoy ${timeString}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `Ayer ${timeString}`;
  } else {
    // Para fechas más antiguas: 12/04/26 10:00
    const dateString = date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
    return `${dateString} ${timeString}`;
  }
}

/**
 * Obtiene el nombre a mostrar de un autor.
 * Prioriza full_name sobre email (como fallback si full_name es null).
 */
function getDisplayName(author: MessageRead["author"]): string {
  return author.full_name ?? author.email;
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

export default function ChatBox({
  ticketId,
  currentUser,
  roleId,
  initialAssignedTechnicianId,
}: ChatBoxProps) {
  // --- ESTADO ---

  /** Lista de mensajes del historial + los nuevos que llegan por WebSocket */
  const [messages, setMessages] = useState<MessageRead[]>([]);

  /** Texto actual en el input de escritura */
  const [newMessage, setNewMessage] = useState("");

  /** true mientras se carga el historial inicial por HTTP */
  const [isLoading, setIsLoading] = useState(true);

  /** Mensaje de error si algo falla en la carga o conexión */
  const [error, setError] = useState("");

  /**
   * Estado de bloqueo: true cuando el ticket fue asignado a OTRA persona.
   * Cuando está bloqueado:
   *   - El input de texto se desactiva.
   *   - Se muestra un banner informativo con quién tomó el ticket.
   */
  const [isBlocked, setIsBlocked] = useState(false);

  /** Datos de quien asignó el ticket (para mostrar en el banner) */
  const [blockedBy, setBlockedBy] = useState<TicketAssignedEvent["assigned_to"] | null>(null);

  /**
   * ID del técnico asignado en el estado local del componente.
   * Se inicializa desde la prop y se actualiza con eventos WebSocket.
   */
  const [assignedTechnicianId, setAssignedTechnicianId] = useState<number | null>(
    initialAssignedTechnicianId,
  );

  /**
   * Referencia al WebSocket activo.
   * Se utiliza useRef en lugar de useState dado que el socket es un recurso de I/O
   * y su instanciación no debe desencadenar un re-render de la interfaz de usuario.
   */
  const socketRef = useRef<WebSocket | null>(null);

  /**
   * Ref al final de la lista de mensajes.
   * Lo usamos para hacer scroll automático hacia abajo cuando llega un mensaje nuevo,
   * igual que WhatsApp o Teams.
   */
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- CICLO DE VIDA ---

  /**
   * Sincronizar cambios en la prop desde el componente padre.
   * Cuando el admin hace clic en "Asignarme", el padre actualiza el ticket via API HTTP
   * y pasa el nuevo assigned_technician_id por props. Este efecto actualiza el estado
   * local para desbloquear el input instantáneamente, sin esperar al evento WebSocket.
   */
  useEffect(() => {
    setAssignedTechnicianId(initialAssignedTechnicianId);
    
    // Al desasignar el ticket, se restablece el estado de bloqueo
    if (initialAssignedTechnicianId === null) {
      setIsBlocked(false);
      setBlockedBy(null);
    }
  }, [initialAssignedTechnicianId]);

  useEffect(() => {
    /**
     * Fase 1: Carga de historial via HTTP.
     * Esto se ejecuta antes de la conexión WebSocket para evitar duplicados.
     * Si la conexión WS se estableciera primero, los mensajes nuevos se añadirían al estado,
     * y al cargar el historial, los mismos mensajes podrían duplicarse.
     */
    let cancelled = false; // Flag para evitar actualizar state si el componente se desmontó

    async function loadHistory() {
      try {
        const history = await getMessages(ticketId);
        if (!cancelled) {
          setMessages(history);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar mensajes");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    /**
     * Fase 2: Conexión WebSocket.
     *
     * Se provee un callback `onMessage` que se ejecuta al recibir datos del servidor,
     * evaluando la acción según el campo `type`:
     *
     * - "chat_message": mensaje de usuario → se añade al estado de mensajes.
     * - "ticket_assigned": asignación de ticket → se evalúa el bloqueo del input.
     * - "ticket_unassigned": desasignación de ticket → se desbloquea el input.
     */
    const socket = openChatSocket(
      ticketId,
      (event: WebSocketEvent) => {
        if (cancelled) return;

        if (event.type === "chat_message") {
          // Añadir nuevo mensaje al historial (se actualizará la vista)
          setMessages((prev) => [...prev, event]);
        } else if (event.type === "ticket_assigned") {
          setAssignedTechnicianId(event.assigned_to.id);

          // Bloquear el chat si el ticket fue asignado a otro usuario y no se poseen permisos de Admin o Cliente
          const isTakenByOther = event.assigned_to.id !== currentUser.id;
          const isTechnicianNotAssigned = roleId === 2 && isTakenByOther;

          if (isTechnicianNotAssigned) {
            setIsBlocked(true);
            setBlockedBy(event.assigned_to);
          }
        } else if (event.type === "ticket_unassigned") {
          // El ticket volvió a la bandeja → desbloquear el input
          setAssignedTechnicianId(null);
          setIsBlocked(false);
          setBlockedBy(null);
        }
      },
      () => {
        // onError: la conexión WS falló (servidor caído, auth inválida, etc.)
        if (!cancelled) {
          console.error("[ChatSocket] Error real de conexión WebSocket");
          setError("Conexión al chat perdida. Recarga la página.");
        }
      },
    );

    socketRef.current = socket;

    /**
     * Cleanup: se ejecuta en el desmontaje del componente.
     * Se cierra explícitamente la conexión WebSocket para liberar recursos en el servidor
     * y prevenir la persistencia de conexiones no activas.
     */
    return () => {
      cancelled = true;
      socket.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]); // Re-ejecutar únicamente ante cambios en ticketId

  /**
   * Desplazamiento automático al final de la lista al recibir nuevos mensajes.
   * Depende de los cambios en el arreglo `messages`.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- HANDLERS ---

  /**
   * Envía el mensaje escrito en el input utilizando la conexión WebSocket existente.
   *
   * Se prefiere el uso del canal WebSocket frente a una petición POST debido a su
   * menor latencia y ausencia de overhead de conexión TCP.
   */
  function handleSend() {
    const content = newMessage.trim();
    if (!content || !socketRef.current) return;

    sendMessage(socketRef.current, content);
    setNewMessage(""); // Limpiar el input inmediatamente tras enviar
  }

  /** Enviar con Enter (sin Shift para no bloquear saltos de línea futuros) */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --- RENDERIZADO ---

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando mensajes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-red-500/30 rounded-xl p-6 text-red-400 text-sm text-center">
        ⚠️ {error}
      </div>
    );
  }

  // Validación de estado deshabilitado para el input
  // Criterios de bloqueo:
  // 1. Rol Técnico (2) cuando el ticket está asignado a otro usuario.
  // 2. Ticket no asignado (assignedTechnicianId === null).
  const isUnassigned = assignedTechnicianId === null;
  const isInputDisabled = isBlocked || isUnassigned;

  // Filtrar mensajes: Ocultar mensajes de sistema a los clientes (Rol 3)
  const visibleMessages = messages.filter(msg => !(msg.is_system && roleId === 3));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
      {/* Encabezado del chat */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Chat del Ticket
        </h2>
      </div>

      {/* Banner de bloqueo: aparece cuando el técnico no es el asignado */}
      {isBlocked && blockedBy && (
        <div className="mx-4 mt-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <div>
            <p className="text-yellow-300 text-sm font-medium">
              Este ticket fue asignado a {blockedBy.full_name ?? blockedBy.email}
            </p>
            <p className="text-yellow-500/70 text-xs mt-0.5">
              Solo puedes leer la conversación. No puedes enviar mensajes.
            </p>
          </div>
        </div>
      )}

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[320px] max-h-[480px]">
        {visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">
              Aún no hay mensajes. Sé el primero en escribir.
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => <MessageBubble key={msg.id} message={msg} currentUserId={currentUser.id} />)
        )}
        {/* Elemento fantasma al final para el scroll automático */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de escritura */}
      <div className="px-4 py-4 border-t border-slate-800">
        {isBlocked ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <span className="text-gray-600 text-sm flex-1">
              Solo lectura — ticket asignado a otro técnico
            </span>
            <span className="text-gray-600 text-xs">🔒</span>
          </div>
        ) : isUnassigned ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
            <span className="text-indigo-300 text-sm flex-1 font-medium italic">
              El chat se habilitará cuando un técnico tome el ticket.
            </span>
            <span className="text-indigo-400 text-lg">⏳</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              className="flex-1 bg-slate-800 text-white placeholder-gray-500 border border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Enviar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: Burbuja de mensaje individual
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: MessageRead;
  currentUserId: number;
}

/**
 * Renderiza un mensaje individual con tres estilos posibles:
 *
 * 1. Sistema (is_system=true):
 *    → Texto pequeño gris centrado. Ej: "Ticket asignado a Carlos García"
 *    → Visible solo para admins/técnicos (los clientes no ven logs de sistema)
 *
 * 2. Mensaje propio (author_id === currentUserId, is_system=false):
 *    → Burbuja con alineación derecha y fondo índigo.
 *    → El nombre del autor se omite en la visualización por simplicidad.
 *
 * 3. De otro (author_id !== currentUserId, is_system=false):
 *    → Burbuja alineada a la IZQUIERDA con fondo gris oscuro.
 *    → Nombre del autor encima del mensaje (estilo Teams).
 */
function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isSystem = message.is_system;
  const isOwnMessage = message.author_id === currentUserId;

  // --- Mensaje del sistema: log de auditoría centrado ---
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 italic bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
          · {message.content} · {formatTime(message.created_at)}
        </span>
      </div>
    );
  }

  // --- Mensaje propio: burbuja derecha ---
  if (isOwnMessage) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[70%] bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-md">
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        <span className="text-xs text-gray-600 mr-1">{formatTime(message.created_at)}</span>
      </div>
    );
  }

  // --- Mensaje ajeno: burbuja izquierda con nombre ---
  const displayName = getDisplayName(message.author);

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Nombre del autor — estilo Teams */}
      <span className="text-xs font-semibold text-indigo-400 ml-1">{displayName}</span>
      <div className="max-w-[70%] bg-slate-800 text-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-md border border-slate-700/50">
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
      </div>
      <span className="text-xs text-gray-600 ml-1">{formatTime(message.created_at)}</span>
    </div>
  );
}
