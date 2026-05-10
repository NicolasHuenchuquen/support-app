import type { TicketCreate, TicketRead } from "@/types/ticket";

/**
 * URL base de la API del backend, inyectada por Next.js desde las variables de entorno.
 * @see {@link https://nextjs.org/docs/app/building-your-application/configuring/environment-variables}
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Obtiene todos los tickets del usuario autenticado.
 *
 * @description
 * Realiza un `GET /tickets/me`. El backend identifica al usuario a través
 * de la cookie `access_token` (JWT HTTP-only) almacenada en el navegador.
 * No es necesario enviar el user ID manualmente — la cookie viaja sola.
 *
 * La clave `credentials: "include"` en el fetch le indica al navegador que
 * debe adjuntar automáticamente las cookies al request cross-origin.
 * Sin esta opción, la cookie no se envía y el backend retorna 401.
 *
 * @returns {Promise<TicketRead[]>} Lista de tickets del usuario (activos y resueltos),
 *                                  ordenados del más reciente al más antiguo.
 *                                  Retorna un array vacío si no tiene tickets.
 *
 * @throws {Error} Si el servidor retorna un error (ej. 401 no autenticado,
 *                 429 rate limit superado, 500 error interno).
 *
 * @dependencies
 * - `TicketRead`: Interface TypeScript para tipar la respuesta.
 * - `credentials: "include"`: Necesario para enviar la cookie JWT cross-origin.
 */
export async function getMyTickets(): Promise<TicketRead[]> {
  const response = await fetch(`${API_URL}/tickets/me`, {
    method: "GET",
    // La directiva `credentials: "include"` instruye al navegador a
    // adjuntar la cookie access_token en solicitudes cross-origin,
    // previniendo errores de autorización (HTTP 401).
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "Error al obtener los tickets");
  }

  return response.json() as Promise<TicketRead[]>;
}

/**
 * Crea un nuevo ticket de soporte para el usuario autenticado.
 *
 * @description
 * Realiza un `POST /tickets/` enviando los datos del ticket como JSON.
 * El backend asocia automáticamente el ticket al usuario del JWT en la cookie.
 *
 * Rate limit del backend: 10 requests por minuto por usuario.
 * Si se supera, el backend retorna HTTP 429.
 *
 * @param {TicketCreate} data - Datos del ticket a crear:
 *   - `title`: Título del problema (5-255 caracteres).
 *   - `description`: Descripción detallada (mínimo 10 caracteres).
 *   - `priority_id`: ID de la prioridad seleccionada.
 *
 * @returns {Promise<TicketRead>} El ticket recién creado con su ID asignado,
 *                                 estado inicial "open" y timestamps generados.
 *
 * @throws {Error} Si la validación del backend falla (422), el rate limit se
 *                 supera (429), o el usuario no está autenticado (401).
 *
 * @dependencies
 * - `TicketCreate`: Interface que tipea el objeto `data` esperado.
 * - `TicketRead`: Interface que tipea la respuesta del backend.
 * - `credentials: "include"`: Para enviar la cookie JWT.
 */
export async function createTicket(data: TicketCreate): Promise<TicketRead> {
  const response = await fetch(`${API_URL}/tickets/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "Error al crear el ticket");
  }

  return response.json() as Promise<TicketRead>;
}

/**
 * Cierra la sesión del usuario eliminando la cookie JWT del navegador.
 *
 * @description
 * Realiza un `POST /login/logout`. El backend responde con `delete_cookie`,
 * lo cual instruye al navegador a eliminar la cookie `access_token`.
 *
 * @returns {Promise<void>} Resuelve cuando el servidor confirma el logout.
 *
 * @throws {Error} Si el servidor retorna un error inesperado.
 *
 * @notes
 * Aunque el JWT sigue siendo válido hasta su expiración (30 min),
 * al borrar la cookie el navegador no lo puede enviar más, lo que
 * equivale funcionalmente a cerrar sesión.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_URL}/login/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/**
 * Obtiene todos los tickets del sistema (privilegiado: solo Admins/Técnicos).
 *
 * @description
 * Realiza un `GET /tickets/all` enviando filtros por Query String.
 * Este endpoint está protegido y solo devuelve resultados si el usuario
 * tiene rol de Administrador o Soporte Técnico.
 *
 * @param {string} [status_filter] - Filtro opcional por estado del ticket (ej. "open", "in_progress").
 * @param {string} [sort_by="newest"] - Ordenamiento de los tickets ("newest" o "oldest").
 *
 * @returns {Promise<TicketRead[]>} Lista de tickets filtrados y ordenados.
 *
 * @throws {Error} Si el usuario no tiene permisos (403), no está autenticado (401),
 *                 o si ocurre un error en el servidor.
 *
 * @dependencies
 * - `TicketRead`: Interface TypeScript para tipar la respuesta.
 * - URL y URLSearchParams: APIs nativas para construir el Query String de forma segura.
 * - `credentials: "include"`: Necesario para enviar la cookie JWT cross-origin.
 */
export async function getAllTickets(status_filter?: string, sort_by: string = "newest"): Promise<TicketRead[]> {
  const url = new URL(`${API_URL}/tickets/all`);
  if (status_filter) url.searchParams.append("status_filter", status_filter);
  url.searchParams.append("sort_by", sort_by);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "Error al obtener los tickets globales");
  }

  return response.json() as Promise<TicketRead[]>;
}

/**
 * Obtiene los detalles de un ticket específico a través de su ID.
 *
 * @description
 * Realiza un `GET /tickets/{ticketId}`.
 * Si el usuario es un cliente regular (rol 3), el backend verificará
 * que el ticket le pertenezca. Si es un administrador o técnico (rol 1 o 2),
 * podrá acceder al ticket sin importar el propietario.
 *
 * @param {number} ticketId - El identificador único numérico del ticket a consultar.
 *
 * @returns {Promise<TicketRead>} El objeto con todos los detalles del ticket solicitado.
 *
 * @throws {Error} Si el ticket no existe (404), si un cliente intenta ver un ticket
 *                 ajeno (403), o si ocurre algún error de conexión.
 *
 * @dependencies
 * - `TicketRead`: Interface TypeScript para tipar la respuesta.
 * - `credentials: "include"`: Necesario para enviar la cookie JWT cross-origin.
 */
export async function getTicketById(ticketId: number): Promise<TicketRead> {
  const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Error al obtener el ticket");
  }
  return response.json() as Promise<TicketRead>;
}

/**
 * Asigna un ticket al usuario autenticado (Admin/Técnico).
 *
 * @description
 * Realiza un `PATCH /tickets/{ticketId}/assign`.
 * El backend identifica al administrador/técnico usando la cookie JWT y lo asigna
 * como responsable del ticket, cambiando el estado a "in_progress" automáticamente.
 * Además, genera un mensaje de sistema para dejar trazabilidad de la acción.
 *
 * @param {number} ticketId - ID del ticket que se desea tomar.
 *
 * @returns {Promise<TicketRead>} El ticket actualizado con el técnico asignado y
 *                                el nuevo estado.
 *
 * @throws {Error} Si el ticket no existe (404), si el usuario no tiene permisos (403),
 *                 o si ocurre un error en la solicitud.
 *
 * @dependencies
 * - `TicketRead`: Interface TypeScript para tipar la respuesta.
 * - `credentials: "include"`: Necesario para enviar la cookie JWT cross-origin.
 */
export async function assignTicket(ticketId: number): Promise<TicketRead> {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/assign`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error al asignar el ticket");
  return response.json() as Promise<TicketRead>;
}

/**
 * Remueve la asignación técnica de un ticket, regresándolo a la bandeja general.
 *
 * @description
 * Realiza un `PATCH /tickets/{ticketId}/unassign`.
 * El backend quita al técnico asignado (lo vuelve `null`), cambia el estado del
 * ticket de vuelta a "open", y genera un mensaje de sistema para auditoría.
 *
 * @param {number} ticketId - ID del ticket que se desea devolver (desasignar).
 *
 * @returns {Promise<TicketRead>} El ticket actualizado, en estado "open" y sin técnico.
 *
 * @throws {Error} Si el ticket no existe (404), si el usuario no tiene permisos (403),
 *                 o si ocurre un error en la solicitud.
 *
 * @dependencies
 * - `TicketRead`: Interface TypeScript para tipar la respuesta.
 * - `credentials: "include"`: Necesario para enviar la cookie JWT cross-origin.
 */
export async function unassignTicket(ticketId: number): Promise<TicketRead> {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/unassign`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Error al desasignar el ticket");
  return response.json() as Promise<TicketRead>;
}
