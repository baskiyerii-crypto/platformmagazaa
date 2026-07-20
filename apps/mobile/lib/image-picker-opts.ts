import * as ImagePicker from "expo-image-picker";

/** Prefer JPEG/PNG over HEIC so uploads work on all backends (iOS). */
const compatibleMode =
  ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Compatible ??
  ("compatible" as ImagePicker.UIImagePickerPreferredAssetRepresentationMode);

export const IMAGE_PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  quality: 0.85,
  allowsEditing: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  preferredAssetRepresentationMode: compatibleMode,
};

export const IMAGE_PICKER_CAMERA_OPTS: ImagePicker.ImagePickerOptions = {
  quality: 0.85,
  allowsEditing: true,
  preferredAssetRepresentationMode: compatibleMode,
};

export const IMAGE_PICKER_GALLERY_OPTS: ImagePicker.ImagePickerOptions = {
  quality: 0.85,
  allowsEditing: true,
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  preferredAssetRepresentationMode: compatibleMode,
};

export function assetAsJpegUpload(
  asset: ImagePicker.ImagePickerAsset,
  name = "photo.jpg"
) {
  const uri = asset.uri;
  const lower = (asset.fileName || uri).toLowerCase();
  const isHeic = lower.endsWith(".heic") || lower.endsWith(".heif");
  return {
    uri,
    name: isHeic ? name : asset.fileName || name,
    type: isHeic ? "image/jpeg" : asset.mimeType || "image/jpeg",
  };
}
