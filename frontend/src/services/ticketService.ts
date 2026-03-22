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
    // `credentials: "include"` es la instrucción al navegador para
    // adjuntar la cookie access_token en este request cross-origin.
    // Sin esto, la API retornaría 401 aunque el usuario esté logueado.
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
