import { useEffect, useState } from "react";
import { Text, View, StyleSheet, Alert, Switch, TouchableOpacity } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/components/theme";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import { isStaffRole } from "@magaza/shared";

type StoreUser = { id: string; username: string };

type Store = {
  id: string;
  name: string;
  storeNumber: string;
  address?: string | null;
  active: boolean;
  users: StoreUser[];
  _count: { avmEntries: number; outdoorEntries: number; changeRequests: number };
};

export default function AdminStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [name, setName] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [extraUsername, setExtraUsername] = useState("");
  const [extraPassword, setExtraPassword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStoreNumber, setEditStoreNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [storeSearch, setStoreSearch] = useState("");

  async function load() {
    try {
      setStores(await api.get<Store[]>("/api/v1/admin/stores"));
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    getUser().then((u) => {
      setIsAdmin(u?.role === "ADMIN");
      setCanManage(u ? isStaffRole(u.role) : false);
    });
    load();
  }, []);

  async function createStore() {
    if (!isAdmin) return;
    try {
      await api.post("/api/v1/admin/stores", {
        name,
        storeNumber,
        address,
        active: true,
        username,
        password,
      });
      setName("");
      setStoreNumber("");
      setAddress("");
      setUsername("");
      setPassword("");
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Mağaza oluşturulamadı");
    }
  }

  async function addUser(storeId: string) {
    if (!isAdmin) return;
    try {
      await api.post(`/api/v1/admin/stores/${storeId}`, { username: extraUsername, password: extraPassword });
      setExtraUsername("");
      setExtraPassword("");
      setAddingFor(null);
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Kullanıcı eklenemedi");
    }
  }

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditName(store.name);
    setEditStoreNumber(store.storeNumber);
    setEditAddress(store.address ?? "");
    setEditActive(store.active);
    setAddingFor(null);
  }

  async function saveStore(storeId: string) {
    if (!canManage) return;
    try {
      await api.patch(`/api/v1/admin/stores/${storeId}`, {
        name: editName,
        storeNumber: editStoreNumber,
        address: editAddress || null,
        active: editActive,
      });
      setEditingId(null);
      load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Mağaza güncellenemedi");
    }
  }

  function confirmDelete(store: Store) {
    if (!canManage) return;
    Alert.alert(
      "Mağazayı Sil",
      `"${store.name}" ve tüm verileri silinsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/v1/admin/stores/${store.id}`);
              if (editingId === store.id) setEditingId(null);
              load();
            } catch (e) {
              Alert.alert("Hata", e instanceof Error ? e.message : "Mağaza silinemedi");
            }
          },
        },
      ]
    );
  }

  return (
    <Screen title="Mağazalar" subtitle="Mağaza ve kullanıcı yönetimi" menuItems={ADMIN_MENU}>
      <Card>
        <InputField
          label="Mağaza ara"
          value={storeSearch}
          onChangeText={setStoreSearch}
          placeholder="İsme veya numaraya göre ara"
        />
      </Card>

      {isAdmin && (
        <Card>
          <Text style={styles.cardTitle}>Yeni Mağaza + Kullanıcı</Text>
          <InputField label="Mağaza Adı" value={name} onChangeText={setName} />
          <InputField label="Mağaza No" value={storeNumber} onChangeText={setStoreNumber} />
          <InputField label="Adres" value={address} onChangeText={setAddress} />
          <InputField label="Kullanıcı Adı" value={username} onChangeText={setUsername} />
          <InputField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
          <PrimaryButton label="Oluştur" onPress={createStore} />
        </Card>
      )}

      {stores
        .filter((store) => {
          const q = storeSearch.trim().toLocaleLowerCase("tr");
          if (!q) return true;
          return (
            store.name.toLocaleLowerCase("tr").includes(q) ||
            store.storeNumber.toLocaleLowerCase("tr").includes(q)
          );
        })
        .map((store) => (
        <Card key={store.id}>
          {editingId === store.id ? (
            <>
              <Text style={styles.cardTitle}>Mağazayı Düzenle</Text>
              <InputField label="Mağaza Adı" value={editName} onChangeText={setEditName} />
              <InputField label="Mağaza No" value={editStoreNumber} onChangeText={setEditStoreNumber} />
              <InputField label="Adres" value={editAddress} onChangeText={setEditAddress} />
              <View style={localStyles.switchRow}>
                <Text style={localStyles.switchLabel}>Aktif mağaza</Text>
                <Switch value={editActive} onValueChange={setEditActive} trackColor={{ true: colors.primary }} />
              </View>
              <PrimaryButton label="Kaydet" onPress={() => saveStore(store.id)} />
              <View style={{ marginTop: spacing.sm }}>
                <SecondaryButton label="İptal" onPress={() => setEditingId(null)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{store.name}</Text>
              <Text style={styles.cardSubtitle}>
                No: {store.storeNumber} · {store.address || "Adres yok"}
              </Text>
              <Text style={localStyles.status}>{store.active ? "Aktif" : "Pasif"}</Text>
              <Text style={styles.cardBody}>
                AVM: {store._count.avmEntries} · Açık Hava: {store._count.outdoorEntries} · Talep:{" "}
                {store._count.changeRequests}
              </Text>
              {canManage && (
                <View style={localStyles.actions}>
                  <TouchableOpacity style={localStyles.editBtn} onPress={() => startEdit(store)}>
                    <Text style={localStyles.editBtnText}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={localStyles.deleteBtn} onPress={() => confirmDelete(store)}>
                    <Text style={localStyles.deleteBtnText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {editingId !== store.id && (
            <>
              <View style={localStyles.usersBox}>
                <Text style={localStyles.usersTitle}>Kullanıcılar ({store.users.length})</Text>
                {store.users.map((u) => (
                  <Text key={u.id} style={localStyles.userRow}>
                    • {u.username}
                  </Text>
                ))}
              </View>
              {isAdmin &&
                (addingFor === store.id ? (
                  <View style={{ marginTop: spacing.md }}>
                    <InputField label="Yeni kullanıcı" value={extraUsername} onChangeText={setExtraUsername} />
                    <InputField
                      label="Şifre"
                      value={extraPassword}
                      onChangeText={setExtraPassword}
                      secureTextEntry
                    />
                    <PrimaryButton label="Ekle" onPress={() => addUser(store.id)} />
                    <View style={{ marginTop: spacing.sm }}>
                      <SecondaryButton label="İptal" onPress={() => setAddingFor(null)} />
                    </View>
                  </View>
                ) : (
                  <SecondaryButton label="Kullanıcı Ekle" onPress={() => setAddingFor(store.id)} />
                ))}
            </>
          )}
        </Card>
      ))}
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  usersBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usersTitle: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  userRow: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  status: { fontSize: 12, fontWeight: "600", color: colors.primary, marginTop: 4 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  editBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.bgCard,
  },
  editBtnText: { color: colors.text, fontWeight: "600" },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteBtnText: { color: "#B91C1C", fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
});
