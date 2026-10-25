export type GearCategory =
  | "JACKET" | "FOOTWEAR" | "PANTS" | "BACKPACK"
  | "SLEEPING_BAG" | "TENT" | "TREKKING_POLE" | "RAIN_GEAR";

export type GearCondition = "new" | "good" | "worn" | "poor";
export type GearSource = "manual" | "ai_image" | "ai_link";
export type UserGearPhoto = { id: string; storageRef: string; position: number };

export type UserGearItem = {
  id: string;
  name: string;
  category: GearCategory;
  brand: string | null;
  condition: GearCondition;
  attributes: Record<string, unknown>;
  photoRef: string | null;
  photos?: UserGearPhoto[];
  photoUrl?: string;
  source: GearSource;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserGearInput = {
  name: string;
  category: GearCategory;
  brand?: string | null;
  condition: GearCondition;
  attributes?: Record<string, unknown>;
  photoRef?: string | null;
  acknowledgeDuplicate?: boolean;
};

export type GearExtractionDraft = {
  id: string;
  sourceType: "IMAGE" | "LINK";
  status: "PENDING" | "READY" | "FAILED" | "CONFIRMED";
  extractedData: Partial<CreateUserGearInput> & { attributes?: Record<string, unknown> };
  version: number;
  expiresAt: string;
};
