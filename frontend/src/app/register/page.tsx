"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { registerUser } from "@/services/userService";
import Link from "next/link";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Ingresa un correo válido"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Una mayúscula")
    .regex(/[a-z]/, "Una minúscula")
    .regex(/[0-9]/, "Un número")
    .regex(/[^A-Za-z0-9]/, "Un carácter especial"),
  full_name: z.string().optional(),
});

type FormData = z.infer<typeof registerSchema>;

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

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setSuccessMessage(null);
    setServerError(null);

    try {
      const newUser = await registerUser(data);
      setSuccessMessage(`Usuario registrado exitosamente.`);
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError("Error inesperado en el servidor.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-white">
          Crear Cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Únete a la plataforma de soporte
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-sm sm:rounded-xl sm:px-10">
          
          {successMessage ? (
            <div className="text-center bg-green-500/10 border border-green-500/20 p-6 rounded-lg text-green-400">
              <p className="mb-4 font-medium">{successMessage}</p>
              <Link href="/login" className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-md transition-colors">
                Ir al Login
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Correo Electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    {...register("password")}
                    className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-300">
                  Nombre Completo
                </label>
                <div className="mt-1">
                  <input
                    id="full_name"
                    type="text"
                    {...register("full_name")}
                    className="block w-full rounded-md border-0 bg-slate-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 px-3"
                  />
                </div>
              </div>

              {serverError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3 text-center">
                  {serverError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Registrando..." : "Crear cuenta"}
                </button>
              </div>
            </form>
          )}

          {!successMessage && (
            <div className="mt-6 text-center text-sm text-slate-400">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400">
                Inicia sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
