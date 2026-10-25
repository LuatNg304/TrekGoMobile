import { apiRequest } from "@/lib/api-client";
import type { CreateUserGearInput, GearExtractionDraft, UserGearItem } from "@/features/gear/types";

type Envelope<T> = T | { data: T };
function unwrap<T>(payload: Envelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && (payload as { data?: T }).data !== undefined) return (payload as { data: T }).data;
  return payload as T;
}

async function resolvePhoto(item: UserGearItem, accessToken: string) {
  if (!item.photoRef) return item;
  try {
    const response = await apiRequest<Envelope<{ url: string }>>(
      `/api/v1/media/${item.photoRef}/delivery?variant=CATALOG_CARD&format=AUTO`,
      { method: "GET", accessToken },
    );
    return { ...item, photoUrl: unwrap(response).url };
  } catch { return item; }
}

export const gearApi = {
  async listMyGear(accessToken: string) {
    const response = await apiRequest<Envelope<{ items: UserGearItem[] }>>(
      "/api/v1/gear/items?page=1&limit=100", { method: "GET", accessToken },
    );
    const result = unwrap(response);
    return { ...result, items: await Promise.all((result.items ?? []).map((item) => resolvePhoto(item, accessToken))) };
  },
  async createMyGear(input: CreateUserGearInput, accessToken: string) {
    const response = await apiRequest<Envelope<UserGearItem>>("/api/v1/gear/items", { method: "POST", accessToken, body: JSON.stringify(input) });
    return resolvePhoto(unwrap(response), accessToken);
  },
  async updateMyGear(itemId: string, input: Partial<CreateUserGearInput> & { expectedVersion: number }, accessToken: string) {
    const response = await apiRequest<Envelope<UserGearItem>>(`/api/v1/gear/items/${encodeURIComponent(itemId)}`, { method: "PATCH", accessToken, body: JSON.stringify(input) });
    return resolvePhoto(unwrap(response), accessToken);
  },
  async deleteMyGear(itemId: string, accessToken: string) {
    await apiRequest<void>(`/api/v1/gear/items/${encodeURIComponent(itemId)}`, { method: "DELETE", accessToken });
  },
  async createExtraction(source: { source: "IMAGE"; uploadId: string } | { source: "LINK"; url: string }, accessToken: string) {
    const response = await apiRequest<Envelope<GearExtractionDraft>>("/api/v1/gear/extractions", { method: "POST", accessToken, body: JSON.stringify(source) });
    return unwrap(response);
  },
  async confirmExtraction(draftId: string, input: { expectedVersion: number; item: CreateUserGearInput; acknowledgeDuplicate?: boolean }, accessToken: string) {
    const response = await apiRequest<Envelope<{ item: UserGearItem; replayed: boolean }>>(`/api/v1/gear/extractions/${encodeURIComponent(draftId)}/confirm`, { method: "POST", accessToken, body: JSON.stringify(input) });
    const result = unwrap(response);
    return { ...result, item: await resolvePhoto(result.item, accessToken) };
  },
};

export async function uploadUserGearPhoto(asset: { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number }, accessToken: string) {
  const fallbackName = `gear-${Date.now()}.jpg`;
  const intentPayload = await apiRequest<Envelope<{ mediaId: string; upload: { uploadUrl: string; method: string; formFields: Record<string, string | number> } }>>("/api/v1/media/upload-intents", {
    method: "POST", accessToken,
    body: JSON.stringify({ scope: "USER_GEAR", resourceType: "IMAGE", fileName: asset.fileName || fallbackName, contentType: asset.mimeType || "image/jpeg", sizeBytes: asset.fileSize, captureSource: "CAMERA", clientCapturedAt: new Date().toISOString() }),
  });
  const intent = unwrap(intentPayload);
  const data = new FormData();
  Object.entries(intent.upload.formFields).forEach(([key, value]) => data.append(key, String(value)));
  const local = await fetch(asset.uri);
  if (!local.ok) throw new Error("Không thể đọc ảnh trên thiết bị.");
  data.append("file", await local.blob(), asset.fileName || fallbackName);
  const uploadedResponse = await fetch(intent.upload.uploadUrl, { method: intent.upload.method || "POST", body: data });
  if (!uploadedResponse.ok) throw new Error("Không thể tải ảnh trang bị lên kho media.");
  const uploaded = await uploadedResponse.json() as { public_id: string; version: number; signature: string };
  await apiRequest(`/api/v1/media/${intent.mediaId}/complete`, { method: "POST", accessToken, body: JSON.stringify({ publicId: uploaded.public_id, version: uploaded.version, signature: uploaded.signature }) });
  return intent.mediaId;
}
