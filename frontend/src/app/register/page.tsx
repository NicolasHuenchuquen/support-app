"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { registerUser } from "@/services/userService";

/**
 * Esquema de validación para el formulario de registro de usuario.
 * Impone formato de correo y reglas estrictas de complejidad para la contraseña.
 */
const registerSchema = z.object({
    email: z
        .string()
        .min(1, "El correo es obligatorio")
        .email("Ingresá un correo válido (ej: usuario@dominio.com)"),
    password: z
        .string()
        .min(1, "La contraseña es obligatoria")
        .min(8, "Debe tener al menos 8 caracteres")
        .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
        .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
        .regex(/[0-9]/, "Debe contener al menos un número")
        .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial (ej. !@#$%^&*)"),
    full_name: z.string().optional(),
});

type FormData = z.infer<typeof registerSchema>;

/**
 * Componente de la Página de Registro de Usuario.
 *
 * Proporciona una interfaz de formulario para que nuevos usuarios creen una cuenta.
 * Integra React Hook Form con Zod para una validación robusta en el cliente
 * antes de enviar la carga útil a la API del backend.
 *
 * @returns {JSX.Element} La página de registro renderizada.
 */
export default function RegisterPage() {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(registerSchema),
        criteriaMode: "all",
    });

    /**
     * Maneja el envío exitoso del formulario después de pasar la validación de Zod.
     *
     * @param {FormData} data - La carga útil del formulario validada.
     */
    const onSubmit: SubmitHandler<FormData> = async (data) => {
        setSuccessMessage(null);
        setServerError(null);

        try {
            const newUser = await registerUser(data);
            setSuccessMessage(`✅ Usuario "${newUser.email}" registrado exitosamente.`);
        } catch (error) {
            if (error instanceof Error) {
                setServerError(error.message);
            } else {
                setServerError("Error inesperado. Intenta de nuevo.");
            }
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
                <h1 className="mb-6 text-2xl font-bold text-gray-800">Crear cuenta</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

                    <div>
                        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                            Correo electrónico *
                        </label>
                        <input
                            id="email"
                            type="email"
                            {...register("email")}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="tu@email.com"
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                            Contraseña *
                        </label>
                        <input
                            id="password"
                            type="password"
                            {...register("password")}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mínimo 8 caracteres"
                        />
                        {errors.password && errors.password.types && (
                            <ul className="mt-1 flex flex-col gap-1 text-xs text-red-600">
                                {Object.values(errors.password.types).map((mensajeErrorGrupo, idxGrupo) => {
                                    const mensajesSeparados = String(mensajeErrorGrupo)
                                        .split(/(?=Debe)/)
                                        .filter((m) => m.trim() !== "");

                                    return mensajesSeparados.map((mensaje, index) => {
                                        const textoLimpio = mensaje.trim().replace(/,$/, "");
                                        return <li key={`${idxGrupo}-${index}`}>• {textoLimpio}</li>;
                                    });
                                })}
                            </ul>
                        )}
                        {errors.password && !errors.password.types && (
                            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-gray-700">
                            Nombre completo
                        </label>
                        <input
                            id="full_name"
                            type="text"
                            {...register("full_name")}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Juan Pérez (opcional)"
                        />
                    </div>

                    {serverError && (
                        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                            ❌ {serverError}
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Registrando..." : "Crear cuenta"}
                    </button>
                </form>
            </div>
        </main>
    );
}
