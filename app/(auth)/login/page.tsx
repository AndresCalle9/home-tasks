import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";

export function generateMetadata(): Metadata {
  return {
    title: "Iniciar sesión",
    description: "Entra a tu hogar en Nest.",
  };
}

export default function LoginPage() {
  return <LoginView />;
}
