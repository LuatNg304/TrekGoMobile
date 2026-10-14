/**
 * Storage Keys configuration for TrekGo Mobile
 * Centralizes all AsyncStorage keys with namespacing and versioning.
 */
export const STORAGE_KEYS = {
  // Trails
  SAVED_TRAILS: "@trekgo/saved-trail-ids-v1",
  PERSONAL_TRAILS: "@trekgo/personal-trails-v1",

  // Offline Maps & Caching
  OFFLINE_PACKAGES: "@trekgo/offline-map-packages-v1",

  // User & Account
  TREKKER_ACCOUNT: "@trekgo/trekker-account-v1",
  RENTAL_CART: "@trekgo/rental-cart-v1",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
