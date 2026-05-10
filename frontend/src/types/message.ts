/**
 * types/message.ts — Tipos TypeScript para el sistema de mensajes
 *
 * Estos tipos son el espejo del schema Pydantic `MessageRead` del backend.
 * ¿Para qué sirven si Pydantic ya valida en el servidor?
 *   - Guían al desarrollador mientras programa (autocompletado en VS Code).
 *   - Detectan errores de tipado en tiempo de compilación (no en producción).
 *   - Son eliminados por TypeScript al compilar — no existen en el navegador.
 *
 * Nota sobre `created_at: string` (no `Date`):
 *   Python serializa datetime a ISO 8601 string ("2026-05-02T14:35:00.000Z")
 *   al viajar por HTTP/WebSocket. TypeScript recibe ese string. La conversión
 *   a objeto Date se hace en el componente cuando se quiere formatear la hora.
 *
 * Flujo de lectura:
 *   backend/schemas/message.py → este archivo → services/messageService.ts → ChatBox.tsx
 */

/**
 * Datos del autor de un mensaje.
 *
 * Espejo del schema `MessageAuthor` de Pydantic.
 * Se usa para mostrar el nombre completo del autor (estilo Teams).
 *
 * @property id        - ID numérico del usuario en la BD.
 * @property email     - Email del usuario. Usado como fallback si full_name es null.
 * @property full_name - Nombre completo. Puede ser null si el usuario no lo configuró.
 */
export interface MessageAuthor {
  id: number;
  email: string;
  full_name: string | null;
}

/**
 * Representa un mensaje completo con los datos de su autor.
 *
 * Espejo del schema `MessageRead` de Pydantic.
 *
 * @property id        - ID autoincremental del mensaje.
 * @property content   - Texto del mensaje.
 * @property is_system - true = generado por el sistema (log de auditoría, ej. "Ticket asignado a X").
 *                       false = escrito por un humano (mensaje de chat normal).
 * @property ticket_id - ID del ticket al que pertenece.
 * @property author_id - ID del autor (útil para comparar con currentUser.id y saber si el mensaje es "mío").
 * @property author    - Objeto con datos completos del autor para mostrar en la UI.
 * @property created_at - Timestamp ISO 8601 de cuándo se creó el mensaje.
 */
export interface MessageRead {
  id: number;
  content: string;
  is_system: boolean;
  ticket_id: number;
  author_id: number;
  author: MessageAuthor;
  created_at: string;
}

/**
 * Eventos que el servidor puede enviar por WebSocket.
 *
 * El campo `type` actúa como discriminador para que el frontend sepa
 * cómo manejar cada evento. Hay tres tipos posibles:
 *
 * - "chat_message":      Nuevo mensaje de chat (humano). Incluye todos los campos de MessageRead.
 * - "ticket_assigned":   Alguien se asignó el ticket. Incluye datos del nuevo responsable.
 * - "ticket_unassigned": El ticket fue devuelto a la bandeja sin responsable.
 */
export type ChatMessageEvent = MessageRead & { type: "chat_message" };

export interface TicketAssignedEvent {
  type: "ticket_assigned";
  assigned_to: MessageAuthor;
}

export interface TicketUnassignedEvent {
  type: "ticket_unassigned";
}

/** Unión de todos los eventos posibles que puede enviar el servidor por WebSocket */
export type WebSocketEvent = ChatMessageEvent | TicketAssignedEvent | TicketUnassignedEvent;
