import { useEffect, useState } from "react";
import { Text, View, Alert } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { api } from "@/lib/auth";
import { STORE_MENU } from "@/lib/menus";
import { colors } from "@/components/theme";

type Category = { id: string; name: string };
type Campaign = { id: string; title: string };
type Expense = {
  id: string;
  title: string;
  quantity: number;
  totalPrice: number;
  expenseDate: string;
  category: { name: string };
  announcement?: { title: string } | null;
};

type Draft = {
  categoryId: string;
  announcementId: string;
  title: string;
  quantity: string;
  totalPrice: string;
  expenseDate: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    categoryId: "",
    announcementId: "",
    title: "",
    quantity: "1",
    totalPrice: "",
    expenseDate: today(),
  };
}

function money(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StoreAdExpenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [cats, camps, list] = await Promise.all([
        api.get<Category[]>("/api/v1/admin/ad-expense-categories"),
        api.get<Campaign[]>("/api/v1/ad-expenses?campaigns=1"),
        api.get<Expense[]>("/api/v1/ad-expenses"),
      ]);
      setCategories(cats);
      setCampaigns(camps);
      setExpenses(list);
    } catch {
      /* handled */
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      await api.post("/api/v1/ad-expenses", {
        items: drafts.map((d) => ({
          categoryId: d.categoryId,
          announcementId: d.announcementId || null,
          title: d.title.trim(),
          quantity: Number(d.quantity),
          totalPrice: Number(d.totalPrice),
          expenseDate: d.expenseDate,
        })),
      });
      setDrafts([emptyDraft()]);
      await load();
      Alert.alert("Tamam", "Giderler kaydedildi");
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    Alert.alert("Silinsin mi?", "Bu gider kaydı silinecek", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/v1/ad-expenses/${id}`);
            await load();
          } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Silinemedi");
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Reklam Giderleri" subtitle="Kampanya veya bağımsız gider" menuItems={STORE_MENU}>
      {drafts.map((d, idx) => (
        <Card key={idx}>
          <Text style={styles.cardTitle}>Satır {idx + 1}</Text>
          <Text style={styles.inputLabel}>Kategori</Text>
          <View style={{ gap: 6, marginBottom: 8 }}>
            {categories.map((c) => (
              <Text
                key={c.id}
                style={{ color: d.categoryId === c.id ? colors.primary : colors.textMuted }}
                onPress={() => updateDraft(idx, { categoryId: c.id })}
              >
                {d.categoryId === c.id ? "●" : "○"} {c.name}
              </Text>
            ))}
          </View>
          <Text style={styles.inputLabel}>Kampanya (opsiyonel)</Text>
          <Text
            style={{ color: !d.announcementId ? colors.primary : colors.textMuted, marginBottom: 4 }}
            onPress={() => updateDraft(idx, { announcementId: "" })}
          >
            {!d.announcementId ? "●" : "○"} Kampanya dışı
          </Text>
          {campaigns.map((c) => (
            <Text
              key={c.id}
              style={{ color: d.announcementId === c.id ? colors.primary : colors.textMuted, marginBottom: 4 }}
              onPress={() => updateDraft(idx, { announcementId: c.id })}
            >
              {d.announcementId === c.id ? "●" : "○"} {c.title}
            </Text>
          ))}
          <InputField label="Başlık" value={d.title} onChangeText={(t) => updateDraft(idx, { title: t })} />
          <InputField label="Adet" value={d.quantity} onChangeText={(t) => updateDraft(idx, { quantity: t })} keyboardType="numeric" />
          <InputField label="Toplam fiyat (TL)" value={d.totalPrice} onChangeText={(t) => updateDraft(idx, { totalPrice: t })} keyboardType="numeric" />
          <InputField label="Tarih (YYYY-MM-DD)" value={d.expenseDate} onChangeText={(t) => updateDraft(idx, { expenseDate: t })} />
          {drafts.length > 1 && (
            <SecondaryButton label="Satırı kaldır" onPress={() => setDrafts((prev) => prev.filter((_, i) => i !== idx))} />
          )}
        </Card>
      ))}

      <PrimaryButton label="Satır Ekle" onPress={() => setDrafts((prev) => [...prev, emptyDraft()])} />
      <PrimaryButton label={saving ? "Kaydediliyor..." : "Tamamla / Kaydet"} onPress={save} loading={saving} />

      <Text style={[styles.cardTitle, { marginTop: 16 }]}>Geçmiş</Text>
      {expenses.map((e) => (
        <Card key={e.id}>
          <Text style={styles.cardTitle}>{e.title}</Text>
          <Text style={styles.cardBody}>
            {e.category.name}
            {e.announcement ? ` · ${e.announcement.title}` : " · Kampanya dışı"} · {e.quantity} adet
          </Text>
          <Text style={styles.cardSubtitle}>
            {money(e.totalPrice)} TL · {new Date(e.expenseDate).toLocaleDateString("tr-TR")}
          </Text>
          <SecondaryButton label="Sil" onPress={() => remove(e.id)} />
        </Card>
      ))}
    </Screen>
  );
}
