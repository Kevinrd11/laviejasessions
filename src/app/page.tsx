import { redirect } from "next/navigation";

// La raíz de esta app de Sessions lleva directo a la sección.
export default function Home() {
  redirect("/sessions");
}
