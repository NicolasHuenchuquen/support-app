"use client"

import { useEffect, useState } from "react"

export default function HomePage() {
  const [message, setMessage] = useState<string | null>(null)
  const [health, setHealth] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => console.log("Error al obtener el mensaje"))

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => console.log("Error al obtener el estado"))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Support App</h1>
      <p>Status: {message}</p>
      <p>Health: {health}</p>
    </main>
  )
}