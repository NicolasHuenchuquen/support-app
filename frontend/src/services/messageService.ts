/**
 * services/messageService.ts — Funciones para interactuar con el sistema de mensajes
 *
 * Este archivo sigue el mismo patrón que ticketService.ts:
 * funciones puras que abstraen la comunicación con el backend.
 *
 * Contiene dos tipos de comunicación:
 *   1. HTTP (fetch):    getMessages() — carga el historial al abrir la página.
 *   2. WebSocket:       openChatSocket() — abre el canal de chat en tiempo real.
 *
 * Justificación de la separación de protocolos:
 *   Las operaciones se abstraen en funciones distintas debido a sus ciclos de vida:
 *   - getMessages() opera bajo el modelo request-response estándar.
 *   - openChatSocket() mantiene una conexión persistente vinculada al ciclo de vida del componente.
 *
 * Flujo de lectura:
 *   backend/routers/message.py → types/message.ts → este archivo → components/ChatBox.tsx
 */

import type { MessageRead, WebSocketEvent } from "@/types/message";

/**
 * URL base de la API REST del backend.
 * Inyectada por Next.js desde las variables de entorno NEXT_PUBLIC_*.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * URL base para conexiones WebSocket.
 *
 * Conversión de protocolo HTTP/HTTPS a WS/WSS requerida por el estándar WebSocket.
 * La variable de entorno NEXT_PUBLIC_API_URL define el protocolo base, el cual
 * es reemplazado mediante expresiones regulares para establecer la URL del canal.
 *
 *   Ejemplo:
 *     "http://localhost:8000"              → "ws://localhost:8000"
 *     "https://mi-backend.render.com"     → "wss://mi-backend.render.com"
 */
const WS_URL = API_URL.replace(/^https/, "wss").replace(/^http/, "ws");

/**
 * Obtiene el historial completo de mensajes de un ticket.
 *
 * @description
 * Realiza un `GET /tickets/{ticketId}/messages`. Es una petición HTTP normal
 * (no WebSocket). Se usa al cargar la página para mostrar los mensajes previos
 * antes de conectar el canal en tiempo real.
 *
 * Incluye tanto mensajes de chat humanos (is_system=false) como logs de
 * auditoría del sistema (is_system=true), ordenados cronológicamente
 * del más antiguo al más reciente.
 *
 * El campo `author` de cada mensaje ya viene con {id, email, full_name}
 * para poder mostrar el nombre en la UI sin requests adicionales.
 *
 * @param ticketId - ID del ticket cuyos mensajes se desean cargar.
 *
 * @returns {Promise<MessageRead[]>} Lista de mensajes ordenados cronológicamente.
 *                                   Vacía si el ticket no tiene mensajes.
 *
 * @throws {Error} Si el ticket no existe (404), el usuario no tiene acceso (403),
 *                 o si no está autenticado (401).
 *
 * @dependencies
 * - `credentials: "include"`: Necesario para enviar la cookie JWT en cross-origin.
 * - `MessageRead`: Interface TypeScript para tipar la respuesta.
 */
export async function getMessages(ticketId: number): Promise<MessageRead[]> {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/messages`, {
    method: "GET",
    credentials: "include", // Envía la cookie JWT automáticamente
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "Error al cargar los mensajes");
  }

  return response.json() as Promise<MessageRead[]>;
}

/**
 * Abre un canal WebSocket para el chat en tiempo real de un ticket.
 *
 * @description
 * Crea una conexión WebSocket persistente con el backend. A diferencia de
 * fetch() que hace una sola petición y termina, este canal queda abierto
 * mientras el usuario tiene la página activa.
 *
 * Retorno del objeto WebSocket:
 *   La instancia se retorna para permitir que el componente de interfaz controle
 *   el cierre explícito de la conexión (`socket.close()`) durante el ciclo de
 *   desmontaje, evitando así fugas de memoria y acumulación de conexiones huérfanas.
 *
 * Autenticación:
 *   Las credenciales son gestionadas automáticamente por el navegador a través
 *   de cookies (`access_token`) durante el handshake HTTP→WebSocket inicial.
 *
 * Eventos que el servidor puede enviar (tipo WebSocketEvent):
 *   - { type: "chat_message", ...MessageRead }  → Nuevo mensaje de chat
 *   - { type: "ticket_assigned", assigned_to }  → Alguien tomó el ticket
 *   - { type: "ticket_unassigned" }             → El ticket fue devuelto
 *
 * @param ticketId  - ID del ticket al que se conecta el usuario.
 * @param onMessage - Callback que se ejecuta cada vez que el servidor envía un evento.
 *                    El componente ChatBox usa este callback para actualizar su estado.
 * @param onError   - Callback opcional ejecutado si la conexión falla o se cierra inesperadamente.
 *
 * @returns {WebSocket} El objeto WebSocket activo. Guárdalo en un ref o state para
 *                       poder cerrarlo con socket.close() al desmontar el componente.
 *
 * @dependencies
 * - `WS_URL`: URL base WebSocket derivada de NEXT_PUBLIC_API_URL.
 * - `WebSocketEvent`: Tipo discriminado para los eventos del servidor.
 */
export function openChatSocket(
  ticketId: number,
  onMessage: (event: WebSocketEvent) => void,
  onError?: () => void,
): WebSocket {
  // Construir la URL del WebSocket: ws://localhost:8000/ws/tickets/5
  const socket = new WebSocket(`${WS_URL}/ws/tickets/${ticketId}`);

  // Evento: se recibe un mensaje/evento del servidor
  socket.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as WebSocketEvent;
      onMessage(data);
    } catch {
      // Ignorar mensajes mal formados (no deberían ocurrir en producción)
      console.warn("[ChatSocket] Mensaje inválido recibido:", event.data);
    }
  };

  // Evento: error de conexión (ej. servidor caído, autenticación fallida)
  socket.onerror = () => {
    // Delegamos al componente. Él sabe si fue un desmontaje intencional (Strict Mode) o un error real.
    onError?.();
  };

  // Retornar el socket para que el componente pueda cerrarlo en el cleanup
  return socket;
}

/**
 * Envía un mensaje de chat a través de un WebSocket activo.
 *
 * @description
 * Serializa el contenido del mensaje a JSON y lo envía por el canal WS.
 * El backend lo recibe, lo guarda en BD y lo reenvía (broadcast) a todos
 * los usuarios conectados al mismo ticket.
 *
 * Formato del payload:
 *   Se emplea JSON (`JSON.stringify`) en lugar de texto plano para mantener
 *   extensibilidad en el protocolo, posibilitando futuras integraciones
 *   (ej. envío de metadatos o adjuntos) sin alterar la estructura base.
 *
 * @param socket  - El WebSocket activo obtenido de openChatSocket().
 * @param content - El texto del mensaje a enviar.
 *
 * @throws Nada directamente, pero si el socket está cerrado, WebSocket
 *         lo ignora silenciosamente. El componente debería verificar
 *         socket.readyState === WebSocket.OPEN antes de llamar esta función.
 */
export function sendMessage(socket: WebSocket, content: string): void {
  if (socket.readyState !== WebSocket.OPEN) {
    console.warn("[ChatSocket] Intento de enviar mensaje con socket cerrado");
    return;
  }

  socket.send(JSON.stringify({ content }));
}
