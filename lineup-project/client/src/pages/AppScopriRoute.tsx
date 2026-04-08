import { useLocation } from "wouter";
import AppScopri from "@/pages/AppScopri";
import { stashPendingScopriCreate } from "@/lib/scopriCreateBridge";

/** Pagina Scopri a tutto schermo: crea evento → salva prefill e torna alla Home con modale aperta. */
export default function AppScopriRoute() {
  const [, setLocation] = useLocation();

  return (
    <AppScopri
      embedded={false}
      onCreateEvent={(prefill) => {
        stashPendingScopriCreate(prefill);
        setLocation("/");
      }}
    />
  );
}
