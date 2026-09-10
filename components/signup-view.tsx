"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type AuthActionState } from "@/app/(auth)/actions";

export function SignupView() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    signUpAction,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-2xl font-bold">Crea tu hogar</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Un solo login por hogar — cada integrante elige su perfil adentro,
          como hasta ahora.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Correo</Label>
          <Input id="signup-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-account-password">Contraseña de la cuenta</Label>
          <Input
            id="signup-account-password"
            name="accountPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-action-password">Clave de acciones</Label>
          <Input
            id="signup-action-password"
            name="actionPassword"
            type="password"
            autoComplete="off"
            required
          />
          <p className="text-xs text-muted-foreground">
            Se pedirá al repartir/reiniciar la semana o reasignar una tarea —
            distinta de tu contraseña de acceso; puedes cambiarla luego desde
            Ajustes.
          </p>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando hogar…" : "Crear hogar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-foreground underline">
          Entra aquí
        </Link>
      </p>
    </div>
  );
}
