import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { Screen, Card, InputField, PrimaryButton, SecondaryButton, styles } from "@/components/ui";
import { api, getUser } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";

type Product = { id: string; name: string; code: string };

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    setProducts(await api.get<Product[]>("/api/v1/admin/catalog?scope=product"));
  }

  useEffect(() => {
    getUser().then((user) => setIsAdmin(user?.role === "ADMIN"));
    void load();
  }, []);

  async function createProduct() {
    try {
      await api.post("/api/v1/admin/catalog", { name, code, type: "FIXED" });
      setName("");
      setCode("");
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Ürün eklenemedi");
    }
  }

  async function deactivate(id: string) {
    await api.delete(`/api/v1/admin/catalog/${id}`);
    await load();
  }

  return (
    <Screen title="Ürün Kataloğu" subtitle="Kampanyadan bağımsız ürünler" menuItems={ADMIN_MENU}>
      {isAdmin ? (
        <Card>
          <InputField label="Ürün Adı" value={name} onChangeText={setName} />
          <InputField label="Kod" value={code} onChangeText={setCode} />
          <PrimaryButton label="Ürün Ekle" onPress={createProduct} />
        </Card>
      ) : null}

      {products.map((product) => (
        <Card key={product.id}>
          <Text style={styles.cardTitle}>{product.name}</Text>
          <Text style={styles.cardSubtitle}>{product.code}</Text>
          {isAdmin ? <SecondaryButton label="Pasif Et" onPress={() => deactivate(product.id)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}
