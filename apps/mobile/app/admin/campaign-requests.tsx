import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Screen, Card, StatusPill, styles } from "@/components/ui";
import { api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";
import {
  CHANGE_REQUEST_STATUS_LABELS,
  type ChangeRequestStatus,
  type PaginatedResponse,
} from "@magaza/shared";

type CampaignRequest = {
  id: string;
  store: { name: string };
  campaign?: { name: string } | null;
  catalogItem: { name: string; category?: { name: string } | null };
  quantity?: number | null;
  status: ChangeRequestStatus;
};

export default function AdminCampaignRequests() {
  const [items, setItems] = useState<CampaignRequest[]>([]);

  useEffect(() => {
    api
      .get<PaginatedResponse<CampaignRequest>>("/api/v1/catalog-requests?scope=campaign&limit=500")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  return (
    <Screen title="Kampanya Talepleri" subtitle="Mağaza kampanya ürün adetleri" menuItems={ADMIN_MENU}>
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={styles.cardTitle}>{item.store.name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.campaign?.name ?? "Kampanya"} · {item.catalogItem.category?.name ?? "Kategori"} · {item.catalogItem.name}
          </Text>
          <Text style={styles.cardBody}>{item.quantity ?? 0} adet</Text>
          <StatusPill label={CHANGE_REQUEST_STATUS_LABELS[item.status]} backgroundColor="#e2e8f0" />
        </Card>
      ))}
      {items.length === 0 ? <Text style={styles.cardSubtitle}>Kampanya talebi yok.</Text> : null}
    </Screen>
  );
}
