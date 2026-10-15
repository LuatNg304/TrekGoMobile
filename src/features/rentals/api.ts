import { apiRequest } from "@/lib/api-client";

import {
  DeliveryTaskDetail,
  DeliveryTaskSummary,
  PaginatedResult,
  RentalAvailability,
  RentalCategory,
  RentalDepositStatus,
  RentalHandoverPreview,
  RentalOrderDetail,
  RentalOrderCreated,
  RentalOrderSummary,
  RentalPaymentStatus,
  RentalPickupCode,
  RentalProduct,
  RentalQuote,
  RentalReturnObservationResult,
  RentalReturnScanResult,
  RentalReturnTransferResult,
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
  cutoffAt?: string;
  membershipRef?: string;
  rentalEligible?: boolean;
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
    return {
      ...trip,
      eligible: eligibility.eligible,
      eligibilityReason: eligibility.reason,
      rentalCutoffAt: eligibility.cutoffAt,
      membershipRef: eligibility.membershipRef,
      contextVersion: eligibility.contextVersion,
    };
  } catch (error) {
    return {
      ...trip,
      eligible: false,
      eligibilityReason:
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra điều kiện thuê.",
    };
  }
}

export const rentalApi = {
  async listCategories() {
    const response = await apiRequest<
      Envelope<PaginatedResult<RentalCategory>>
    >("/api/v1/rental-categories?page=1&pageSize=100");

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
    // Candidate sources only. The Rental eligibility endpoint remains the
    // single authority for whether a trip may be used to rent equipment.
    const [bookingResult, privateTripResult] = await Promise.allSettled([
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
    const bookings =
      bookingResult.status === "fulfilled"
        ? unwrap(bookingResult.value)
            .items.filter(
              (booking) => new Date(booking.trip.endAt).getTime() > now,
            )
            .map((booking) => ({
              id: booking.trip.id,
              title: booking.trip.title,
              type: "PUBLIC" as const,
              startAt: booking.trip.startAt,
              endAt: booking.trip.endAt,
              sourceStatus: booking.status,
            }))
        : [];

    const privateTrips =
      privateTripResult.status === "fulfilled"
        ? unwrap(privateTripResult.value)
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
            }))
        : [];

    if (
      bookingResult.status === "rejected" &&
      privateTripResult.status === "rejected"
    ) {
      throw bookingResult.reason;
    }

    const uniqueTrips = Array.from(
      new Map(
        [...bookings, ...privateTrips].map((trip) => [trip.id, trip]),
      ).values(),
    );

    return Promise.all(
      uniqueTrips.map((trip) => attachEligibility(trip, accessToken)),
    );
  },

  getEligibility,

  async getAvailability(
    input: { tripId: string; productId: string },
    accessToken: string,
  ) {
    const query = queryString(input);
    const response = await apiRequest<Envelope<RentalAvailability>>(
      `/api/v1/rentals/availability?${query}`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async createQuote(
    input: {
      tripId: string;
      items: { productId: string; quantity: number }[];
    },
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<RentalQuote>>(
      "/api/v1/rentals/quote",
      {
        method: "POST",
        accessToken,
        body: JSON.stringify(input),
      },
    );

    return unwrap(response);
  },

  async createOrder(
    quoteId: string,
    idempotencyKey: string,
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<RentalOrderCreated>>(
      "/api/v1/rental-orders",
      {
        method: "POST",
        accessToken,
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ quoteId }),
      },
    );

    return unwrap(response);
  },

  async listOrders(
    accessToken: string,
    input?: { status?: string; bookingId?: string; page?: number; pageSize?: number },
  ) {
    const query = queryString({
      status: input?.status,
      bookingId: input?.bookingId,
      page: input?.page ?? 1,
      pageSize: input?.pageSize ?? 20,
    });
    const response = await apiRequest<
      Envelope<PaginatedResult<RentalOrderSummary>>
    >(`/api/v1/rental-orders?${query}`, { method: "GET", accessToken });

    return unwrap(response);
  },

  async getOrder(orderId: string, accessToken: string) {
    const response = await apiRequest<Envelope<RentalOrderDetail>>(
      `/api/v1/rental-orders/${orderId}`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async listDeliveryTasks(
    accessToken: string,
    input?: { type?: "OUTBOUND" | "RETURN"; status?: string; page?: number; pageSize?: number },
  ) {
    const query = queryString({
      type: input?.type,
      status: input?.status,
      page: input?.page ?? 1,
      pageSize: input?.pageSize ?? 50,
    });
    const response = await apiRequest<Envelope<PaginatedResult<DeliveryTaskSummary>>>(
      `/api/v1/delivery/tasks?${query}`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async claimDeliveryTask(
    taskId: string,
    expectedVersion: number,
    idempotencyKey: string,
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<{ version: number }>>(
      `/api/v1/delivery/tasks/${taskId}/claim`,
      {
        method: "POST",
        accessToken,
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ expectedVersion }),
      },
    );

    return unwrap(response);
  },

  async getDeliveryTask(taskId: string, accessToken: string) {
    const response = await apiRequest<Envelope<DeliveryTaskDetail>>(
      `/api/v1/delivery/tasks/${taskId}`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async scanRentalReturn(
    orderId: string,
    input: { assetCodes: string[]; operationId: string; expectedVersion: number },
    idempotencyKey: string,
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<RentalReturnScanResult>>(
      `/api/v1/rental-orders/${orderId}/return-scan`,
      {
        method: "POST",
        accessToken,
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      },
    );

    return unwrap(response);
  },

  async submitRentalReturnObservations(
    orderId: string,
    input: {
      items: {
        unitId: string;
        visibleDamage?: boolean;
        accessoryObservations?: string[];
        notes?: string;
        evidenceIds?: string[];
      }[];
      expectedVersion: number;
    },
    idempotencyKey: string,
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<RentalReturnObservationResult>>(
      `/api/v1/rental-orders/${orderId}/return-observations`,
      {
        method: "POST",
        accessToken,
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      },
    );

    return unwrap(response);
  },

  async transferRentalReturnToInventory(
    returnTaskId: string,
    input: { unitIds: string[]; packageId?: string; pendingTransferId?: string; expectedVersion: number },
    idempotencyKey: string,
    accessToken: string,
  ) {
    const response = await apiRequest<Envelope<RentalReturnTransferResult>>(
      `/api/v1/delivery/tasks/${returnTaskId}/return-to-inventory-location`,
      {
        method: "POST",
        accessToken,
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      },
    );

    return unwrap(response);
  },

  async getPaymentStatus(orderId: string, accessToken: string) {
    const response = await apiRequest<Envelope<RentalPaymentStatus>>(
      `/api/v1/rental-orders/${orderId}/payment`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async getPickupCode(orderId: string, accessToken: string) {
    const response = await apiRequest<Envelope<RentalPickupCode>>(
      `/api/v1/rental-orders/${orderId}/pickup-code`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async getHandoverPreview(orderId: string, accessToken: string) {
    const response = await apiRequest<Envelope<RentalHandoverPreview>>(
      `/api/v1/rental-orders/${orderId}/handover-preview`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },

  async getDepositStatus(orderId: string, accessToken: string) {
    const response = await apiRequest<Envelope<RentalDepositStatus>>(
      `/api/v1/rental-orders/${orderId}/deposit`,
      { method: "GET", accessToken },
    );

    return unwrap(response);
  },
};
