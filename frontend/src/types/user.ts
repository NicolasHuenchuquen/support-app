/**
 * Representa la estructura de datos para un usuario en la aplicación.
 * Refleja los esquemas Pydantic definidos en la API del backend.
 */

/**
 * Carga útil (payload) requerida para crear un nuevo usuario.
 * 
 * @property {string} email - La dirección de correo electrónico del usuario.
 * @property {string} password - La contraseña en texto plano (será hasheada por el backend).
 * @property {string} [full_name] - Nombre completo opcional del usuario.
 * @property {number} [role_id] - ID opcional de asignación de rol. Por defecto es 2 (Cliente).
 */
export interface UserCreate {
    email: string;
    password: string;
    full_name?: string;
    role_id?: number;
}

/**
 * Representación de un usuario devuelto por el backend.
 * 
 * @property {number} id - Identificador único del usuario.
 * @property {string} email - La dirección de correo electrónico del usuario.
 * @property {string | null} full_name - El nombre completo del usuario, o nulo si no se proporcionó.
 * @property {boolean} is_active - Indica si la cuenta del usuario está activa.
 * @property {number} role_id - El ID del rol asignado al usuario.
 */
export interface UserRead {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
    role_id: number;
}
