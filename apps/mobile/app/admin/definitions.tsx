import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Screen, Card, styles } from "@/components/ui";
import { api } from "@/lib/auth";
import { ADMIN_MENU } from "@/lib/menus";

type Definitions = {
  categories: Array<{ type: string; name: string; subTypes: Array<{ id: string; name: string; code: string }> }>;
  placements: Array<{ id: string; name: string }>;
  reyonCategories: Array<{ id: string; name: string; code: string }>;
};

export default function AdminDefinitions() {
  const [defs, setDefs] = useState<Definitions | null>(null);

  useEffect(() => {
    api.getCached<Definitions>("/api/v1/definitions", 300_000).then(setDefs).catch(() => {});
  }, []);

  return (
    <Screen title="Tanımlar" subtitle="Alt tür, konum ve reyon kategorileri" menuItems={ADMIN_MENU}>
      {defs?.categories.map((cat) => (
        <Card key={cat.type}>
          <Text style={styles.cardTitle}>{cat.name}</Text>
          {cat.subTypes.map((st) => (
            <Text key={st.id} style={styles.cardBody}>• {st.name} ({st.code})</Text>
          ))}
        </Card>
      ))}
      <Card>
        <Text style={styles.cardTitle}>Yerleşim Seçenekleri</Text>
        {defs?.placements.map((p) => (
          <Text key={p.id} style={styles.cardBody}>• {p.name}</Text>
        ))}
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Reyon Kategorileri</Text>
        {defs?.reyonCategories.map((r) => (
          <Text key={r.id} style={styles.cardBody}>• {r.name} ({r.code})</Text>
        ))}
        {!defs?.reyonCategories.length && (
          <Text style={styles.cardBody}>Henüz reyon kategorisi yok</Text>
        )}
      </Card>
    </Screen>
  );
}
