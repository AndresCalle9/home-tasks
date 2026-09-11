import type { Metadata } from "next";
import { SignupView } from "@/components/signup-view";

export function generateMetadata(): Metadata {
  return {
    title: "Crear cuenta",
    description: "Crea tu hogar en Nest y empieza a repartir tareas.",
  };
}

export default function SignupPage() {
  return <SignupView />;
}
