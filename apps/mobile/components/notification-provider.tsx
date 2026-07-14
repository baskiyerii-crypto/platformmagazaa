import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { api, getUser } from "@/lib/auth";

type NotificationContextValue = {
  unread: number;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  unread: 0,
  refresh: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) {
        setUnread(0);
        return;
      }
      const data = await api.getCached<{ count: number }>(
        "/api/v1/notifications/unread-count",
        30_000
      );
      setUnread(data.count ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const t = setInterval(refresh, 120_000);
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ unread, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
