export type RentalDepositPolicy = {
  type: string;
  amount?: number;
  referenceValue?: number;
  percentage?: number;
};

export type RentalCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
};

export type RentalProduct = {
  id: string;
  sku: string;
  name: string;
  category: {
    id: string;
    name: string;
    status: string;
  };
  description: string | null;
  dailyPrice: number;
  depositPolicy: RentalDepositPolicy;
  currency: string;
  replacementValue: number;
  status: string;
  version: number;
  imageMediaIds: string[];
  imageUrl?: string;
  spec: unknown;
  recommendationTags: string[];
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: Pagination;
};

export type RentalTripType = "PUBLIC" | "PRIVATE";

export type RentalTripOption = {
  id: string;
  title: string;
  type: RentalTripType;
  startAt: string;
  endAt: string;
  sourceStatus: string;
  eligible: boolean;
  eligibilityReason?: string;
  rentalCutoffAt?: string;
  contextVersion?: number;
};

export function calculateProductDeposit(product: RentalProduct) {
  if (typeof product.depositPolicy.amount === "number") {
    return product.depositPolicy.amount;
  }

  if (typeof product.depositPolicy.percentage === "number") {
    return Math.round(
      product.replacementValue * (product.depositPolicy.percentage / 100),
    );
  }

  return 0;
}

export function rentalProductSpecs(product: RentalProduct) {
  if (!product.spec || typeof product.spec !== "object") return [];

  if (Array.isArray(product.spec)) {
    return product.spec.map(String);
  }

  return Object.entries(product.spec as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
}
