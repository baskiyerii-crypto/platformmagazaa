import { ImageStyle, StyleProp } from "react-native";
import { Image } from "expo-image";
import { API_URL } from "@/lib/config";
import { thumbUrl } from "@magaza/shared";

type Props = {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
};

export function CachedImage({ uri, style }: Props) {
  if (!uri) return null;
  const full = uri.startsWith("http") ? uri : `${API_URL}${thumbUrl(uri)!}`;
  return (
    <Image
      source={full}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
    />
  );
}
