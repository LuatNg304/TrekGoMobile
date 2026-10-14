import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./keys";
import { PersonalTrail } from "@/types";

export const trailStorage = {
  /**
   * Đọc danh sách ID cung đường đã lưu từ AsyncStorage
   */
  async getSavedTrailIds(): Promise<string[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_TRAILS);
      return data ? (JSON.parse(data) as string[]) : null;
    } catch (error) {
      console.warn("[trailStorage] Lỗi khi đọc saved trails:", error);
      return null;
    }
  },

  /**
   * Lưu danh sách ID cung đường đã lưu xuống AsyncStorage
   */
  async saveTrailIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_TRAILS, JSON.stringify(ids));
    } catch (error) {
      console.warn("[trailStorage] Lỗi khi lưu saved trails:", error);
    }
  },

  /**
   * Đọc danh sách cung đường cá nhân đã tạo
   */
  async getPersonalTrails(): Promise<PersonalTrail[] | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PERSONAL_TRAILS);
      return data ? (JSON.parse(data) as PersonalTrail[]) : null;
    } catch (error) {
      console.warn("[trailStorage] Lỗi khi đọc personal trails:", error);
      return null;
    }
  },

  /**
   * Lưu toàn bộ danh sách cung đường cá nhân
   */
  async savePersonalTrails(trails: PersonalTrail[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PERSONAL_TRAILS,
        JSON.stringify(trails),
      );
    } catch (error) {
      console.warn("[trailStorage] Lỗi khi lưu personal trails:", error);
    }
  },
};
