"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Visual placeholder only — defining a period and running the assignment
// sorteo is not implemented in this change (see openspec/changes/ui-shell-mockup).
export function AssignButton() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Asignar tareas</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar tareas</DialogTitle>
          <DialogDescription>
            Próximamente vas a poder definir el periodo y revisar las tareas
            fijas antes de sortear. Por ahora esta pantalla es solo una vista
            previa.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
