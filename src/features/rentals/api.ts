import { apiRequest } from "@/lib/api-client";

import {
  PaginatedResult,
  RentalCategory,
  RentalProduct,
  RentalTripOption,
} from "@/features/rentals/types";

type Envelope<T> = T | { data: T };

type BookingListItem = {
  id: string;
  status: string;
  trip: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
  };
};

type BookingListResult = {
  items: BookingListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type PrivateTrip = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
};

type EligibilityResult = {
  eligible: boolean;
  reason?: string;
  rentalCutoffAt?: string;
  contextVersion?: number;
};

type MediaDelivery = {
  url: string;
};

function unwrap<T>(payload: Envelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: T }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });

  return params.toString();
}

async function resolveProductImage(
  product: RentalProduct,
  variant: "CATALOG_CARD" | "CATALOG_DETAIL",
) {
  const mediaId = product.imageMediaIds[0];
  if (!mediaId) return product;

  try {
    const response = await apiRequest<Envelope<MediaDelivery>>(
      `/api/v1/media/${mediaId}/delivery?variant=${variant}&format=AUTO`,
    );

    return { ...product, imageUrl: unwrap(response).url };
  } catch {
    // Catalog remains usable when a legacy/invalid media id cannot be resolved.
    return product;
  }
}

async function getEligibility(
  tripId: string,
  accessToken: string,
): Promise<EligibilityResult> {
  const response = await apiRequest<Envelope<EligibilityResult>>(
    `/api/v1/trips/${tripId}/rental-eligibility`,
    { method: "GET", accessToken },
  );

  return unwrap(response);
}

async function attachEligibility(
  trip: Omit<RentalTripOption, "eligible">,
  accessToken: string,
): Promise<RentalTripOption> {
  try {
    const eligibility = await getEligibility(trip.id, accessToken);
    return { ...trip, ...eligibility };
  } catch (error) {
    return {
      ...trip,
      eligible: false,
      eligibilityReason:
        error instanceof Error ? error.message : "Không thể kiểm tra điều kiện thuê.",
    };
  }
}

export const rentalApi = {
  async listCategories() {
    const response = await apiRequest<Envelope<PaginatedResult<RentalCategory>>>(
      "/api/v1/rental-categories?page=1&pageSize=100",
    );

    return unwrap(response);
  },

  async listProducts(input?: { search?: string; categoryId?: string }) {
    const query = queryString({
      page: 1,
      pageSize: 100,
      search: input?.search?.trim(),
      categoryId: input?.categoryId,
    });
    const response = await apiRequest<Envelope<PaginatedResult<RentalProduct>>>(
      `/api/v1/rental-products?${query}`,
    );
    const result = unwrap(response);

    return {
      ...result,
      items: await Promise.all(
        result.items.map((product) =>
          resolveProductImage(product, "CATALOG_CARD"),
        ),
      ),
    };
  },

  async getProduct(productId: string) {
    const response = await apiRequest<Envelope<RentalProduct>>(
      `/api/v1/rental-products/${productId}`,
    );

    return resolveProductImage(unwrap(response), "CATALOG_DETAIL");
  },

  async listTripOptions(accessToken: string) {
    const [bookingResponse, privateTripResponse] = await Promise.all([
      apiRequest<Envelope<BookingListResult>>(
        "/api/v1/bookings?page=1&pageSize=50",
        { method: "GET", accessToken },
      ),
      apiRequest<Envelope<PrivateTrip[]>>("/api/v1/private-trips?page=1", {
        method: "GET",
        accessToken,
      }),
    ]);

    const now = Date.now();
    const bookings = unwrap(bookingResponse).items
      .filter(
        (booking) =>
          booking.status === "CONFIRMED" &&
          new Date(booking.trip.endAt).getTime() > now,
      )
      .map((booking) => ({
        id: booking.trip.id,
        title: booking.trip.title,
        type: "PUBLIC" as const,
        startAt: booking.trip.startAt,
        endAt: booking.trip.endAt,
        sourceStatus: booking.status,
      }));

    const privateTrips = unwrap(privateTripResponse)
      .filter(
        (trip) =>
          trip.status === "OPEN" && new Date(trip.endAt).getTime() > now,
      )
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        type: "PRIVATE" as const,
        startAt: trip.startAt,
        endAt: trip.endAt,
        sourceStatus: trip.status,
      }));

    const uniqueTrips = Array.from(
      new Map(
        [...bookings, ...privateTrips].map((trip) => [trip.id, trip]),
      ).values(),
    );

    return Promise.all(
      uniqueTrips.map((trip) => attachEligibility(trip, accessToken)),
    );
  },
};
