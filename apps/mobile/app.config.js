const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Mağaza Platform",
  slug: "magaza-platform",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "magaza",
  userInterfaceStyle: "light",
  primaryColor: "#2563EB",
  backgroundColor: "#F8FAFC",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#0F172A",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.magaza.platform",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0F172A",
    },
    package: "com.magaza.platform",
    softwareKeyboardLayoutMode: "resize",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: apiUrl.startsWith("http://"),
        },
      },
    ],
    [
      "expo-notifications",
      {
        color: "#2563EB",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Görsel yüklemek için kamera erişimi gerekli",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Görsel seçmek için galeri erişimi gerekli",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "0828ca68-cb6e-4ec1-a87e-41a240418c42",
    },
  },
};

module.exports = config;
