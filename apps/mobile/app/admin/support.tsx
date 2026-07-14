import { useEffect, useState } from "react";
import { Text, Alert } from "react-native";
import { Screen, Card, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { SUPPORT_TICKET_STATUS_LABELS, type PaginatedResponse, type SupportTicketStatus } from "@magaza/shared";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminNote?: string | null;
  store?: { name: string };
};

const NEXT_STATUS: Partial<Record<SupportTicketStatus, SupportTicketStatus>> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "CLOSED",
};

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isStaff, setIsStaff] = useState(false);

  async function load() {
    const d = await api.get<PaginatedResponse<Ticket>>("/api/v1/admin/support-tickets");
    setTickets(d.items);
  }

  useEffect(() => {
    getUser().then((u) => setIsStaff(u?.role === "ADMIN" || u?.role === "MANAGER"));
    load();
  }, []);

  async function advance(id: string, status: SupportTicketStatus) {
    try {
      await api.patch(`/api/v1/admin/support-tickets/${id}`, { status });
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    }
  }

  return (
    <Screen title="Destek" subtitle="Mağaza destek talepleri" menuItems={ADMIN_MENU}>
      {tickets.map((t) => (
        <Card key={t.id}>
          <Text style={styles.cardTitle}>{t.store?.name} — {t.subject}</Text>
          <Text style={styles.cardSubtitle}>{SUPPORT_TICKET_STATUS_LABELS[t.status]}</Text>
          <Text style={styles.cardBody}>{t.message}</Text>
          {t.adminNote ? <Text style={styles.cardSubtitle}>Not: {t.adminNote}</Text> : null}
          {isStaff && NEXT_STATUS[t.status] && (
            <PrimaryButton
              label={`→ ${SUPPORT_TICKET_STATUS_LABELS[NEXT_STATUS[t.status]!]}`}
              onPress={() => advance(t.id, NEXT_STATUS[t.status]!)}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
}
