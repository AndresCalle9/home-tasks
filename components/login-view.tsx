"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type AuthActionState } from "@/app/(auth)/actions";

export function LoginView() {
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    signInAction,
    {}
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-2xl font-bold">Bienvenido de vuelta</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Entra con el correo y la contraseña de tu hogar.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Correo</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Contraseña</Label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Primera vez por aquí?{" "}
        <Link href="/signup" className="font-semibold text-foreground underline">
          Crea tu hogar
        </Link>
      </p>
    </div>
  );
}
