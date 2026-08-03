import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AssignButton() {
  return (
    <Button render={<Link href="/calendario/asignar" />}>
      Asignar tareas
    </Button>
  );
}
