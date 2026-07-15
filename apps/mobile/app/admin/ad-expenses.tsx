import { useEffect, useState } from "react";
import { Text, View, Alert, ScrollView } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, StatusPill, styles } from "@/components/ui";
import { api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
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
  announcement?: { title: string } | null;
};
type Summary = {
  grandTotal: number;
  count: number;
  byCampaignStore: Array<{ announcementTitle: string; storeName: string; total: number; count: number }>;
};

function money(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminAdExpenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [categoryId, setCategoryId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const q = `period=${period}${categoryId ? `&categoryId=${categoryId}` : ""}`;
      const [cats, list, sum, camps] = await Promise.all([
        api.get<Category[]>("/api/v1/admin/ad-expense-categories?includeInactive=1"),
        api.get<Expense[]>(`/api/v1/ad-expenses?${q}`),
        api.get<Summary>(`/api/v1/ad-expenses?summary=1&${q}`),
        api.get<Campaign[]>("/api/v1/ad-expenses?campaigns=1"),
      ]);
      setCategories(cats);
      setExpenses(list);
      setSummary(sum);
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

  return (
    <Screen title="Reklam Giderleri" subtitle="Kategori, özet ve liste" menuItems={ADMIN_MENU}>
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
        <Text style={[styles.cardBody, { marginTop: 12 }]}>
          Excel: web panelinden dönem/kategori filtreleriyle indirin.
        </Text>
        {campaigns.length > 0 && (
          <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>Aktif kampanya: {campaigns.length}</Text>
        )}
      </Card>

      {summary && (
        <Card>
          <Text style={styles.cardTitle}>
            Özet · {summary.count} kayıt · {money(summary.grandTotal)} TL
          </Text>
          {summary.byCampaignStore.map((row, i) => (
            <View key={i} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={styles.cardSubtitle}>{row.announcementTitle} · {row.storeName}</Text>
              <Text style={styles.cardBody}>{row.count} satır · {money(row.total)} TL</Text>
            </View>
          ))}
        </Card>
      )}

      {expenses.map((e) => (
        <Card key={e.id}>
          <Text style={styles.cardTitle}>{e.title}</Text>
          <Text style={styles.cardBody}>
            {e.store.name} · {e.category.name}
            {e.announcement ? ` · ${e.announcement.title}` : " · Kampanya dışı"}
          </Text>
          <Text style={styles.cardSubtitle}>
            {e.quantity} adet · {money(e.totalPrice)} TL · {new Date(e.expenseDate).toLocaleDateString("tr-TR")}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
