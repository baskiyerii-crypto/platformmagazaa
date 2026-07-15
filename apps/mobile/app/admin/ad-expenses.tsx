import { useEffect, useMemo, useState } from "react";
import { Text, View, Alert, ScrollView } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, StatusPill, styles } from "@/components/ui";
import { api, getToken } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { API_URL } from "@/lib/config";
import { colors } from "@/components/theme";

type Category = { id: string; name: string; active: boolean };
type Campaign = { id: string; title: string };
type Expense = {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  expenseDate: string;
  store: { name: string };
  category: { name: string };
  announcement?: { id?: string; title: string } | null;
};

function money(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminAdExpenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [categoryId, setCategoryId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<"campaign" | "general" | "all" | null>(null);

  const campaignExpenses = useMemo(
    () => expenses.filter((e) => e.announcement?.title),
    [expenses]
  );
  const specialExpenses = useMemo(
    () => expenses.filter((e) => !e.announcement?.title),
    [expenses]
  );

  async function load() {
    try {
      const q = `period=${period}${categoryId ? `&categoryId=${categoryId}` : ""}`;
      const [cats, list, camps] = await Promise.all([
        api.get<Category[]>("/api/v1/admin/ad-expense-categories?includeInactive=1"),
        api.get<Expense[]>(`/api/v1/ad-expenses?${q}`),
        api.get<Campaign[]>("/api/v1/ad-expenses?campaigns=1"),
      ]);
      setCategories(cats);
      setExpenses(list);
      setCampaigns(camps);
    } catch {
      /* handled */
    }
  }

  useEffect(() => {
    load();
  }, [period, categoryId]);

  async function addCategory() {
    if (!catName.trim() || busy) return;
    setBusy(true);
    try {
      await api.post("/api/v1/admin/ad-expense-categories", { name: catName.trim() });
      setCatName("");
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setBusy(false);
    }
  }

  async function downloadReport(link?: "campaign" | "general") {
    const kind = link ?? "all";
    setDownloading(kind);
    try {
      const token = await getToken();
      const p = new URLSearchParams({ format: "excel", period });
      if (categoryId) p.set("categoryId", categoryId);
      if (link) p.set("link", link);
      const type = link === "campaign" ? "kampanya" : link === "general" ? "ozel" : "tum";
      const filename = `reklam-giderleri-${type}-${period}.xlsx`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/v1/admin/export/ad-expenses?${p.toString()}`,
        path,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      if (result.status !== 200) throw new Error("Excel indirilemedi");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Raporu kaydet",
        });
      } else {
        Alert.alert("Başarılı", `Kaydedildi: ${result.uri}`);
      }
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "İndirilemedi");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Screen title="Reklam Giderleri" subtitle="Kampanya ve özel raporlar ayrı" menuItems={ADMIN_MENU}>
      <Card>
        <Text style={styles.cardTitle}>Kategori Ekle</Text>
        <InputField label="Ad" value={catName} onChangeText={setCatName} />
        <PrimaryButton label="Ekle" onPress={addCategory} loading={busy} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {categories.filter((c) => c.active).map((c) => (
            <StatusPill key={c.id} label={c.name} backgroundColor="#e2e8f0" />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Dönem</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <SecondaryButton label="Gün" onPress={() => setPeriod("day")} />
          <SecondaryButton label="Ay" onPress={() => setPeriod("month")} />
          <SecondaryButton label="Yıl" onPress={() => setPeriod("year")} />
        </View>
        <Text style={styles.inputLabel}>Kategori filtresi</Text>
        <ScrollView horizontal>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <SecondaryButton label="Tümü" onPress={() => setCategoryId("")} />
            {categories.filter((c) => c.active).map((c) => (
              <SecondaryButton key={c.id} label={c.name} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </ScrollView>
        {campaigns.length > 0 && (
          <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>Aktif kampanya: {campaigns.length}</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Kampanya Giderleri</Text>
        <Text style={styles.cardSubtitle}>
          {campaignExpenses.length} satır ·{" "}
          {money(campaignExpenses.reduce((s, e) => s + e.totalPrice, 0))} TL
        </Text>
        <PrimaryButton
          label={downloading === "campaign" ? "İndiriliyor..." : "Kampanya Raporu İndir"}
          onPress={() => downloadReport("campaign")}
          loading={downloading === "campaign"}
        />
        {campaignExpenses.map((e) => (
          <View key={e.id} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={styles.cardSubtitle}>{e.store.name} · {e.announcement?.title}</Text>
            <Text style={styles.cardBody}>
              {e.title} · {e.quantity} adet · {money(e.totalPrice)} TL
            </Text>
          </View>
        ))}
        {!campaignExpenses.length && <Text style={styles.cardBody}>Kampanya gideri yok</Text>}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Özel Giderler</Text>
        <Text style={styles.cardSubtitle}>
          {specialExpenses.length} satır ·{" "}
          {money(specialExpenses.reduce((s, e) => s + e.totalPrice, 0))} TL
        </Text>
        <PrimaryButton
          label={downloading === "general" ? "İndiriliyor..." : "Özel Rapor İndir"}
          onPress={() => downloadReport("general")}
          loading={downloading === "general"}
        />
        {specialExpenses.map((e) => (
          <View key={e.id} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={styles.cardSubtitle}>{e.store.name} · {e.category.name}</Text>
            <Text style={styles.cardBody}>
              {e.title} · {e.quantity} adet · {money(e.totalPrice)} TL
            </Text>
          </View>
        ))}
        {!specialExpenses.length && <Text style={styles.cardBody}>Özel gider yok</Text>}
      </Card>

      <SecondaryButton
        label={downloading === "all" ? "İndiriliyor..." : "Tümünü Birlikte İndir"}
        onPress={() => downloadReport()}
      />
    </Screen>
  );
}
