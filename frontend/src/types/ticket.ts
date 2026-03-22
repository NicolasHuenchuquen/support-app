/**
 * @file ticket.ts
 * @description Definición de tipos TypeScript para el dominio de Tickets de soporte.
 *              Estos tipos deben mantenerse sincronizados con los schemas Pydantic
 *              del backend (`app/schemas/ticket.py`).
 */

/**
 * Datos necesarios para crear un nuevo ticket de soporte.
 *
 * @remarks
 * Corresponde al schema `TicketCreate` del backend.
 * Se envía como JSON en el body de `POST /tickets/`.
 */
export interface TicketCreate {
  /** Título corto y descriptivo del problema (5-255 caracteres). */
  title: string;
  /** Descripción detallada del incidente (mínimo 10 caracteres). */
  description: string;
  /** ID de la prioridad. Debe existir en la tabla `priorities` de la BD. */
  priority_id: number;
}

/**
 * Datos que retorna el backend al leer un ticket existente.
 *
 * @remarks
 * Corresponde al schema `TicketRead` del backend.
 * Se usa para tipar las respuestas de `GET /tickets/me`.
 */
export interface TicketRead {
  /** Identificador único del ticket, generado por la base de datos. */
  id: number;
  /** Título del ticket. */
  title: string;
  /** Descripción completa del problema. */
  description: string;
  /**
   * Estado actual del ticket.
   * - `"open"` — recién creado, sin atender.
   * - `"in_progress"` — siendo atendido por un técnico.
   * - `"closed"` — resuelto.
   */
  status: "open" | "in_progress" | "closed";
  /** ID de la prioridad asociada al ticket. */
  priority_id: number;
  /** ID del usuario que creó el ticket. */
  user_id: number;
  /** Fecha y hora UTC de creación del ticket (ISO 8601). */
  created_at: string;
  /** Fecha y hora UTC de la última actualización del ticket (ISO 8601). */
  updated_at: string;
}
