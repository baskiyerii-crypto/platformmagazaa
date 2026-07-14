import { useEffect, useState } from "react";
import { Text, Alert } from "react-native";
import { Screen, Card, InputField, PrimaryButton, styles } from "@/components/ui";
import { api } from "@/lib/auth";
import { STORE_MENU } from "@/lib/menus";
import { SUPPORT_TICKET_STATUS_LABELS, type PaginatedResponse, type SupportTicketStatus } from "@magaza/shared";

type Ticket = { id: string; subject: string; message: string; status: SupportTicketStatus; adminNote?: string | null };

export default function StoreSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const d = await api.get<PaginatedResponse<Ticket>>("/api/v1/support-tickets");
    setTickets(d.items);
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    try {
      await api.post("/api/v1/support-tickets", { subject, message });
      setSubject("");
      setMessage("");
      load();
      Alert.alert("Başarılı", "Destek talebi gönderildi");
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Gönderilemedi");
    }
  }

  return (
    <Screen title="Destek" subtitle="Yöneticiye mesaj gönderin" menuItems={STORE_MENU}>
      <Card>
        <Text style={styles.cardTitle}>Yeni Talep</Text>
        <InputField label="Konu" value={subject} onChangeText={setSubject} />
        <InputField label="Mesaj" value={message} onChangeText={setMessage} multiline />
        <PrimaryButton label="Gönder" onPress={submit} />
      </Card>
      {tickets.map((t) => (
        <Card key={t.id}>
          <Text style={styles.cardTitle}>{t.subject}</Text>
          <Text style={styles.cardSubtitle}>{SUPPORT_TICKET_STATUS_LABELS[t.status]}</Text>
          <Text style={styles.cardBody}>{t.message}</Text>
          {t.adminNote ? <Text style={styles.cardBody}>Yanıt: {t.adminNote}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}
