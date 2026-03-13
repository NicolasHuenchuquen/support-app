import type { UserCreate, UserRead } from "@/types/user";

/**
 * URL base de la API del backend.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Registra un nuevo usuario en el sistema.
 *
 * Envía una petición POST a la ruta /users/ con los datos del usuario.
 *
 * @param {UserCreate} data - La carga útil que contiene la información del nuevo usuario.
 * @returns {Promise<UserRead>} Una promesa que se resuelve con los datos públicos del perfil del usuario creado.
 * @throws {Error} Lanza un error si la solicitud de registro falla (ej. correo duplicado) o si el servidor devuelve una respuesta distinta a 200.
 */
export async function registerUser(data: UserCreate): Promise<UserRead> {
    const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail ?? "Error al registrar el usuario");
    }

    return response.json() as Promise<UserRead>;
}

/**
 * Obtiene una lista de todos los usuarios registrados.
 *
 * @returns {Promise<UserRead[]>} Una promesa que se resuelve con un arreglo de los datos públicos de los usuarios.
 * @throws {Error} Lanza un error si la solicitud falla o si el servidor devuelve una respuesta distinta a 200.
 */
export async function getUsers(): Promise<UserRead[]> {
    const response = await fetch(`${API_URL}/users/`);

    if (!response.ok) {
        throw new Error("Error al obtener los usuarios");
    }

    return response.json() as Promise<UserRead[]>;
}
