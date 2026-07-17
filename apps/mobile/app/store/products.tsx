import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Screen, Card, InputField, PrimaryButton, StatusPill, styles } from "@/components/ui";
import { CachedImage } from "@/components/cached-image";
import { api } from "@/lib/auth";
import { STORE_MENU } from "@/lib/menus";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  referenceImageUrl?: string | null;
};

type ProductRequest = {
  id: string;
  quantity?: number | null;
  status: ChangeRequestStatus;
  catalogItem: Product;
};

export default function StoreProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");

  async function load() {
    const [catalog, requestData] = await Promise.all([
      api.get<Product[]>("/api/v1/admin/catalog?scope=product"),
      api.get<PaginatedResponse<ProductRequest>>("/api/v1/catalog-requests?scope=product&limit=100"),
    ]);
    setProducts(catalog);
    setRequests(requestData.items);
    if (!selectedId && catalog[0]) setSelectedId(catalog[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    if (!selectedId || Number(quantity) < 1) {
      Alert.alert("Hata", "Geçerli bir adet girin");
      return;
    }
    try {
      await api.post("/api/v1/catalog-requests", {
        catalogItemId: selectedId,
        quantity: Number(quantity),
      });
      Alert.alert("Başarılı", "Ürün talebi oluşturuldu");
      setQuantity("1");
      await load();
    } catch (e) {
      Alert.alert("Hata", e instanceof Error ? e.message : "Talep oluşturulamadı");
    }
  }

  const selected = products.find((product) => product.id === selectedId);

  return (
    <Screen title="Ürün Talepleri" subtitle="Kampanyadan bağımsız ürünler" menuItems={STORE_MENU}>
      {products.map((product) => (
        <Card key={product.id}>
          <View onTouchEnd={() => setSelectedId(product.id)}>
            <CachedImage uri={product.referenceImageUrl} style={{ width: "100%", height: 100 }} />
            <Text style={styles.cardTitle}>{product.name}</Text>
            {product.description ? <Text style={styles.cardSubtitle}>{product.description}</Text> : null}
          </View>
        </Card>
      ))}

      {selected ? (
        <Card>
          <Text style={styles.cardTitle}>{selected.name} — Talep Aç</Text>
          <InputField label="Adet" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <PrimaryButton label="Talep Oluştur" onPress={submit} />
        </Card>
      ) : null}

      {requests.map((request) => (
        <Card key={request.id}>
          <Text style={styles.cardTitle}>{request.catalogItem.name}</Text>
          <Text style={styles.cardBody}>{request.quantity ?? 0} adet</Text>
          <StatusPill label={CHANGE_REQUEST_STATUS_LABELS[request.status]} backgroundColor="#e2e8f0" />
        </Card>
      ))}
    </Screen>
  );
}
