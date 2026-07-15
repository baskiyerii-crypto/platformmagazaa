import { useEffect, useMemo, useState } from "react";
import { Text, Alert, View, TextInput } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen, Card, PrimaryButton, SecondaryButton, StatusPill, styles } from "@/components/ui";
import { api, getToken, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { API_URL } from "@/lib/config";
import { colors } from "@/components/theme";
import {
  SUPPORT_TICKET_STATUS_LABELS,
  type PaginatedResponse,
  type SupportTicketStatus,
} from "@magaza/shared";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminNote?: string | null;
  store?: { name: string };
  createdAt: string;
};

type TabKey = "OPEN" | "IN_PROGRESS" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "OPEN", label: "Bekleyen" },
  { key: "IN_PROGRESS", label: "İşlemde" },
  { key: "completed", label: "Tamamlanan" },
];

function matchesTab(status: SupportTicketStatus, tab: TabKey) {
  if (tab === "OPEN") return status === "OPEN";
  if (tab === "IN_PROGRESS") return status === "IN_PROGRESS";
  return status === "RESOLVED" || status === "CLOSED";
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [tab, setTab] = useState<TabKey>("OPEN");
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const d = await api.get<PaginatedResponse<Ticket>>(
      "/api/v1/admin/support-tickets?limit=100"
    );
    setTickets(d.items);
  }

  useEffect(() => {
    getUser().then((u) => setIsStaff(u?.role === "ADMIN" || u?.role === "MANAGER"));
    load().catch(() => {});
  }, []);

  const counts = useMemo(
    () => ({
      OPEN: tickets.filter((t) => t.status === "OPEN").length,
      IN_PROGRESS: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED")
        .length,
    }),
    [tickets]
  );

  const visible = useMemo(
    () => tickets.filter((t) => matchesTab(t.status, tab)),
    [tickets, tab]
  );

  async function updateStatus(id: string, status: SupportTicketStatus) {
    setBusyId(id);
    try {
      await api.patch(`/api/v1/admin/support-tickets/${id}`, {
        status,
        adminNote: noteDraft[id]?.trim() || null,
      });
      await load();
      if (status === "IN_PROGRESS") setTab("IN_PROGRESS");
      if (status === "RESOLVED" || status === "CLOSED") setTab("completed");
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadExcel() {
    try {
      const token = await getToken();
      const filename = `destek-talepleri-${tab}.xlsx`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/admin/export/support-tickets?tab=${tab}`,
        path,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (result.status !== 200) throw new Error("Excel indirilemedi");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Destek Excel",
        });
      }
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İndirilemedi");
    }
  }

  function actionsFor(status: SupportTicketStatus): SupportTicketStatus[] {
    if (status === "OPEN") return ["IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (status === "IN_PROGRESS") return ["RESOLVED", "CLOSED"];
    if (status === "RESOLVED") return ["CLOSED", "IN_PROGRESS"];
    return ["IN_PROGRESS"];
  }

  return (
    <Screen title="Destek" subtitle="Bekleyen / İşlemde / Tamamlanan" menuItems={ADMIN_MENU}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {TABS.map((t) => (
          <SecondaryButton
            key={t.key}
            label={`${t.label} (${counts[t.key]})`}
            onPress={() => setTab(t.key)}
          />
        ))}
      </View>
      <SecondaryButton label="Excel İndir (bu sekme)" onPress={downloadExcel} />

      {visible.map((t) => (
        <Card key={t.id}>
          <Text style={styles.cardTitle}>
            {t.store?.name} — {t.subject}
          </Text>
          <StatusPill label={SUPPORT_TICKET_STATUS_LABELS[t.status]} backgroundColor="#e2e8f0" />
          <Text style={styles.cardBody}>{t.message}</Text>
          {t.adminNote ? <Text style={styles.cardSubtitle}>Not: {t.adminNote}</Text> : null}
          {isStaff ? (
            <>
              <TextInput
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  minHeight: 64,
                  textAlignVertical: "top",
                }}
                placeholder="Admin notu (opsiyonel)"
                multiline
                value={noteDraft[t.id] ?? t.adminNote ?? ""}
                onChangeText={(v) => setNoteDraft((prev) => ({ ...prev, [t.id]: v }))}
              />
              <View style={{ gap: 8, marginTop: 10 }}>
                {actionsFor(t.status).map((s) => (
                  <PrimaryButton
                    key={s}
                    label={SUPPORT_TICKET_STATUS_LABELS[s]}
                    loading={busyId === t.id}
                    onPress={() => updateStatus(t.id, s)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ))}

      {!visible.length ? (
        <Text style={styles.cardBody}>Bu kategoride talep yok</Text>
      ) : null}
    </Screen>
  );
}
