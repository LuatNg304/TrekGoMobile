import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Shadows } from "@/constants/theme";
import { useAuth } from "@/features/auth/AuthContext";
import { gearApi, uploadUserGearPhoto } from "@/features/gear/api";
import type { CreateUserGearInput, GearCategory, GearCondition, GearExtractionDraft, UserGearItem } from "@/features/gear/types";
import { ApiError } from "@/lib/api-client";

const CATEGORIES: { value: GearCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "JACKET", label: "Áo khoác", icon: "shirt-outline" }, { value: "FOOTWEAR", label: "Giày", icon: "footsteps-outline" },
  { value: "PANTS", label: "Quần", icon: "body-outline" }, { value: "BACKPACK", label: "Balo", icon: "bag-outline" },
  { value: "SLEEPING_BAG", label: "Túi ngủ", icon: "bed-outline" }, { value: "TENT", label: "Lều", icon: "triangle-outline" },
  { value: "TREKKING_POLE", label: "Gậy", icon: "git-branch-outline" }, { value: "RAIN_GEAR", label: "Đồ mưa", icon: "rainy-outline" },
];
const CONDITIONS: { value: GearCondition; label: string }[] = [
  { value: "new", label: "Mới" }, { value: "good", label: "Tốt" }, { value: "worn", label: "Đã dùng" }, { value: "poor", label: "Cũ/kém" },
];
const ATTRIBUTE_LABELS: Record<string, [string, string]> = {
  waterproof_mm: ["Chống nước", "mm"], temp_rating_c: ["Chịu lạnh", "°C"], weight_g: ["Trọng lượng", "g"],
  capacity_l: ["Dung tích", "L"], grip_level: ["Độ bám", "/5"], sleeping_places: ["Sức chứa", " người"],
  flysheet_waterproof_mm: ["Chống nước mái", "mm"], floor_waterproof_mm: ["Chống nước đáy", "mm"],
  adjustable: ["Điều chỉnh", ""], waterproof: ["Chống nước", ""], ankle_support: ["Hỗ trợ cổ chân", ""],
  rain_cover: ["Áo trùm mưa", ""], windproof: ["Cản gió", ""], insulated: ["Giữ nhiệt", ""], coverage: ["Phạm vi che", ""],
};
const CATEGORY_ATTRIBUTES: Record<GearCategory, string[]> = {
  JACKET: ["waterproof_mm", "temp_rating_c", "weight_g", "windproof"],
  FOOTWEAR: ["waterproof", "ankle_support", "grip_level", "weight_g"],
  PANTS: ["waterproof_mm", "temp_rating_c", "insulated"],
  BACKPACK: ["capacity_l", "rain_cover", "waterproof", "weight_g"],
  SLEEPING_BAG: ["temp_rating_c", "weight_g"],
  TENT: ["sleeping_places", "flysheet_waterproof_mm", "floor_waterproof_mm", "weight_g"],
  TREKKING_POLE: ["adjustable", "length_min_cm", "length_max_cm", "weight_g"],
  RAIN_GEAR: ["waterproof_mm", "coverage", "weight_g"],
};
const BOOLEAN_ATTRIBUTES = new Set(["windproof", "waterproof", "ankle_support", "rain_cover", "insulated", "adjustable"]);

type EditorContext = { item?: UserGearItem; draft?: GearExtractionDraft; photoRef?: string };

export default function WardrobeScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [items, setItems] = useState<UserGearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<GearCategory | "ALL">("ALL");
  const [editor, setEditor] = useState<EditorContext | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const loadItems = useCallback(async (refresh = false) => {
    if (!accessToken) { setError("Phiên đăng nhập không hợp lệ."); setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(undefined);
    try { const result = await gearApi.listMyGear(accessToken); setItems(result.items ?? []); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không tải được tủ đồ."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    gearApi.listMyGear(accessToken)
      .then((result) => { if (active) { setItems(result.items ?? []); setError(undefined); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Không tải được tủ đồ."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const visibleItems = useMemo(() => filter === "ALL" ? items : items.filter((item) => item.category === filter), [filter, items]);

  async function save(input: CreateUserGearInput, context = editor, acknowledgeDuplicate = false) {
    if (!accessToken || !context) return;
    setBusy(true);
    try {
      let saved: UserGearItem;
      if (context.draft) saved = (await gearApi.confirmExtraction(context.draft.id, { expectedVersion: context.draft.version, item: input, acknowledgeDuplicate }, accessToken)).item;
      else if (context.item) saved = await gearApi.updateMyGear(context.item.id, { ...input, expectedVersion: context.item.version }, accessToken);
      else saved = await gearApi.createMyGear({ ...input, acknowledgeDuplicate }, accessToken);
      setItems((current) => context.item ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current.filter((item) => item.id !== saved.id)]);
      setEditor(null);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "GEAR_ITEM_POSSIBLE_DUPLICATE") {
        const details = reason.details as { similarItem?: { name?: string }; matchedFields?: string[] } | undefined;
        Alert.alert("Tủ đã có món tương tự", `${details?.similarItem?.name ?? "Một món đã lưu"}\nThông số trùng: ${details?.matchedFields?.join(", ") || "thông số kỹ thuật"}`, [
          { text: "Quay lại chỉnh sửa", style: "cancel" },
          { text: "Vẫn lưu thêm", onPress: () => void save(input, context, true) },
        ]);
      } else Alert.alert("Chưa lưu được", reason instanceof Error ? reason.message : "Vui lòng thử lại.");
    } finally { setBusy(false); }
  }

  function deleteItem(item: UserGearItem) {
    if (!accessToken) return;
    Alert.alert("Xóa hẳn món đồ?", `“${item.name}” sẽ không thể khôi phục. Lịch sử kiểm tra theo chuyến vẫn được giữ.`, [
      { text: "Giữ lại", style: "cancel" },
      { text: "Xóa hẳn", style: "destructive", onPress: () => void gearApi.deleteMyGear(item.id, accessToken).then(() => setItems((current) => current.filter((entry) => entry.id !== item.id))).catch((reason) => Alert.alert("Chưa xóa được", reason instanceof Error ? reason.message : "Vui lòng thử lại.")) },
    ]);
  }

  function chooseAiSource() {
    Alert.alert("Chụp quét AI", "Chọn nguồn ảnh tem, mác hoặc sản phẩm.", [
      { text: "Máy ảnh", onPress: () => void pickImage(true) }, { text: "Thư viện", onPress: () => void pickImage(false) }, { text: "Hủy", style: "cancel" },
    ]);
  }
  async function pickImage(camera: boolean) {
    if (!accessToken) return;
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Chưa có quyền truy cập", "Bạn vẫn có thể nhập thông số bằng tay."); return; }
    const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    const asset = result.assets?.[0]; if (result.canceled || !asset) return;
    setBusy(true); setError(undefined);
    try {
      const uploadId = await uploadUserGearPhoto(asset, accessToken);
      const draft = await gearApi.createExtraction({ source: "IMAGE", uploadId }, accessToken);
      if (draft.status !== "READY") throw new Error("AI chưa tạo được bản nháp. Bạn có thể nhập tay.");
      setEditor({ draft, photoRef: uploadId });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đọc ảnh bằng AI."); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}><TouchableOpacity style={styles.roundButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color="#102a22" /></TouchableOpacity><View style={styles.headerCopy}><View style={styles.brandRow}><Text style={styles.brand}>TrekGo</Text><Text style={styles.version}>V3.1.5</Text></View><Text style={styles.subtitle}>Tủ đồ cá nhân</Text></View><TouchableOpacity style={styles.profileButton}><Ionicons name="person-outline" size={20} color="#fff" /></TouchableOpacity></View>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadItems(true)} tintColor="#0e513f" />} contentContainerStyle={styles.content}>
      <View style={styles.capacityCard}><View style={styles.capacityIcon}><Ionicons name="archive-outline" size={21} color="#0e513f" /></View><View style={styles.flex}><View style={styles.spaceBetween}><View><Text style={styles.capacityTitle}>Tủ đồ kỹ thuật</Text><Text style={styles.capacitySub}>Sức chứa định ngạch an toàn</Text></View><View style={styles.alignEnd}><Text style={styles.capacityCount}>{items.length} / 50</Text><Text style={styles.capacitySub}>{items.length * 2}% dung lượng</Text></View></View><View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.min(items.length * 2, 100)}%` }]} /></View></View></View>
      <View style={styles.actionRow}><TouchableOpacity disabled={busy} style={styles.aiButton} onPress={chooseAiSource}><Ionicons name="camera-outline" size={19} color="#fff" /><Text style={styles.aiButtonText}>Chụp quét AI</Text></TouchableOpacity><TouchableOpacity style={styles.manualButton} onPress={() => setEditor({})}><Ionicons name="create-outline" size={19} color="#102a22" /><Text style={styles.manualButtonText}>Nhập tay số liệu</Text></TouchableOpacity></View>
      <TouchableOpacity style={styles.linkButton} onPress={() => setLinkOpen(true)}><Ionicons name="link-outline" size={17} color="#315f52" /><Text style={styles.linkText}>Hoặc nạp từ đường dẫn sản phẩm</Text></TouchableOpacity>
      {busy && <View style={styles.loadingBanner}><ActivityIndicator color="#0e513f" /><View><Text style={styles.loadingTitle}>Đang leo qua dữ liệu...</Text><Text style={styles.loadingText}>TrekGo đang đọc tem mác và dựng bản nháp an toàn.</Text></View></View>}
      {error && <View style={styles.errorCard}><Ionicons name="warning-outline" size={20} color={Colors.error} /><Text style={styles.errorText}>{error}</Text></View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}><Filter active={filter === "ALL"} label="Tất cả" count={items.length} onPress={() => setFilter("ALL")} />{CATEGORIES.map((category) => <Filter key={category.value} active={filter === category.value} label={category.label} count={items.filter((item) => item.category === category.value).length} onPress={() => setFilter(category.value)} />)}</ScrollView>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#0e513f" /><Text style={styles.muted}>Đang mở tủ đồ...</Text></View> : visibleItems.length === 0 ? <View style={styles.empty}><Ionicons name="bag-add-outline" size={42} color="#0e513f" /><Text style={styles.emptyTitle}>{items.length ? "Không có món ở danh mục này" : "Tủ đồ đang trống"}</Text><Text style={styles.emptyText}>Thêm trang bị đầu tiên bằng AI hoặc nhập tay.</Text></View> : <View style={styles.list}>{visibleItems.map((item) => <GearCard key={item.id} item={item} onEdit={() => setEditor({ item })} onDelete={() => deleteItem(item)} />)}</View>}
      <View style={styles.ruleCard}><Ionicons name="shield-checkmark-outline" size={22} color="#143b31" /><View style={styles.flex}><Text style={styles.ruleTitle}>Quy chế lưu trữ & Snapshot</Text><Text style={styles.ruleText}>Xóa đồ là xóa cứng, giải phóng chỗ ngay. Lịch sử snapshot chuyến cũ vẫn được bảo lưu.</Text></View></View>
    </ScrollView>
    <GearEditor key={editor?.item?.id ?? editor?.draft?.id ?? (editor ? "new" : "closed")} visible={editor !== null} context={editor} busy={busy} onClose={() => setEditor(null)} onSave={(input) => void save(input)} />
    <LinkModal visible={linkOpen} busy={busy} onClose={() => setLinkOpen(false)} onSubmit={async (url) => { if (!accessToken) return; setBusy(true); try { const draft = await gearApi.createExtraction({ source: "LINK", url }, accessToken); setLinkOpen(false); setEditor({ draft }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đọc link."); } finally { setBusy(false); } }} />
  </SafeAreaView>;
}

function GearCard({ item, onEdit, onDelete }: { item: UserGearItem; onEdit: () => void; onDelete: () => void }) {
  const category = CATEGORIES.find((entry) => entry.value === item.category) ?? CATEGORIES[0];
  const stats = Object.entries(item.attributes ?? {}).filter(([, value]) => value !== null && value !== undefined).slice(0, 3);
  return <View style={styles.itemCard}><View style={styles.itemTop}>{item.photoUrl ? <Image source={item.photoUrl} style={styles.itemImage} contentFit="cover" transition={200} /> : <View style={styles.itemImageFallback}><Ionicons name={category.icon} size={38} color="#0e513f" /></View>}<View style={styles.itemMain}><View style={styles.badgeRow}><Text style={styles.categoryBadge}>{item.category}</Text><Text style={styles.conditionBadge}>{conditionLabel(item.condition)}</Text><Text style={styles.sourceBadge}>{sourceLabel(item.source)}</Text></View><Text style={styles.itemName} numberOfLines={2}>{item.name}</Text><Text style={styles.itemHistory}>{item.brand || "Chưa khai thương hiệu"}</Text></View></View>
    <View style={styles.statsRow}>{stats.length ? stats.map(([key, value]) => <View key={key} style={styles.stat}><Text style={styles.statLabel} numberOfLines={1}>{ATTRIBUTE_LABELS[key]?.[0] ?? key}</Text><Text style={styles.statValue} numberOfLines={1}>{formatAttribute(value, ATTRIBUTE_LABELS[key]?.[1] ?? "")}</Text></View>) : <Text style={styles.unknown}>⚠ Chưa có thông số kỹ thuật</Text>}</View>
    <View style={styles.itemActions}><TouchableOpacity style={styles.removeButton} onPress={onDelete}><Ionicons name="trash-outline" size={17} color="#25483f" /><Text style={styles.removeText}>Gỡ bỏ</Text></TouchableOpacity><TouchableOpacity style={styles.editButton} onPress={onEdit}><Text style={styles.editText}>Xem & Sửa</Text><Ionicons name="chevron-forward" size={16} color="#102a22" /></TouchableOpacity></View></View>;
}

function Filter({ active, label, count, onPress }: { active: boolean; label: string; count: number; onPress: () => void }) { return <TouchableOpacity style={[styles.filter, active && styles.filterActive]} onPress={onPress}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text><Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text></TouchableOpacity>; }

function GearEditor({ visible, context, busy, onClose, onSave }: { visible: boolean; context: EditorContext | null; busy: boolean; onClose: () => void; onSave: (input: CreateUserGearInput) => void }) {
  const seed = context?.item ?? context?.draft?.extractedData;
  const [name, setName] = useState(seed?.name ?? ""); const [brand, setBrand] = useState(seed?.brand ?? ""); const [category, setCategory] = useState<GearCategory>((seed?.category as GearCategory) ?? "BACKPACK"); const [condition, setCondition] = useState<GearCondition>((seed?.condition as GearCondition) ?? "good");
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(seed?.attributes ?? {}).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)])));
  function changeCategory(next: GearCategory) { setCategory(next); setAttributeValues({}); }
  function submit() {
    if (!name.trim()) return Alert.alert("Thiếu tên đồ", "Nhập tên món đồ trước khi lưu.");
    const attributes: Record<string, unknown> = {};
    CATEGORY_ATTRIBUTES[category].forEach((key) => {
      const raw = attributeValues[key] ?? "";
      if (!raw) attributes[key] = null;
      else if (BOOLEAN_ATTRIBUTES.has(key)) attributes[key] = raw === "true";
      else if (key === "coverage") attributes[key] = raw;
      else attributes[key] = Number(raw);
    });
    onSave({ name: name.trim(), brand: brand.trim() || null, category, condition, attributes, photoRef: context?.photoRef ?? context?.item?.photoRef ?? null });
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}><View style={styles.modal}><View style={styles.handle} /><View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>{context?.draft ? "AI · KIỂM TRA BẢN NHÁP" : "TỦ ĐỒ CÁ NHÂN"}</Text><Text style={styles.modalTitle}>{context?.item ? "Xem & sửa trang bị" : "Thêm món đồ"}</Text></View><TouchableOpacity style={styles.roundButton} onPress={onClose}><Ionicons name="close" size={20} color="#102a22" /></TouchableOpacity></View><ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.label}>Tên món đồ</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ví dụ: Balo Naturehike 45L" /><Text style={styles.label}>Thương hiệu</Text><TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Không bắt buộc" /><Text style={styles.label}>Loại đồ</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{CATEGORIES.map((entry) => <Chip key={entry.value} label={entry.label} active={category === entry.value} onPress={() => changeCategory(entry.value)} />)}</ScrollView><Text style={styles.label}>Tình trạng</Text><View style={styles.chipWrap}>{CONDITIONS.map((entry) => <Chip key={entry.value} label={entry.label} active={condition === entry.value} onPress={() => setCondition(entry.value)} />)}</View><Text style={styles.sectionLabel}>Thông số kỹ thuật</Text><Text style={styles.sectionHint}>Chưa biết thì để trống, TrekGo không tự đổi thành 0.</Text>{CATEGORY_ATTRIBUTES[category].map((key) => <AttributeInput key={key} attributeKey={key} value={attributeValues[key] ?? ""} onChange={(value) => setAttributeValues((current) => ({ ...current, [key]: value }))} />)}{context?.draft && <View style={styles.draftNote}><Ionicons name="sparkles-outline" size={18} color="#0e513f" /><Text style={styles.draftNoteText}>AI đã dựng bản nháp. Hãy kiểm tra thông số trước khi xác nhận.</Text></View>}<TouchableOpacity disabled={busy} style={styles.saveButton} onPress={submit}>{busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={19} color="#fff" /><Text style={styles.saveText}>{context?.draft ? "Xác nhận lưu vào tủ" : "Lưu vào tủ đồ"}</Text></>}</TouchableOpacity></ScrollView></View></KeyboardAvoidingView></Modal>;
}

function AttributeInput({ attributeKey, value, onChange }: { attributeKey: string; value: string; onChange: (value: string) => void }) {
  const [label, unit] = ATTRIBUTE_LABELS[attributeKey] ?? [attributeKey, ""];
  if (BOOLEAN_ATTRIBUTES.has(attributeKey)) return <View><Text style={styles.label}>{label}</Text><View style={styles.chipWrap}><Chip label="Chưa biết" active={!value} onPress={() => onChange("")} /><Chip label="Có" active={value === "true"} onPress={() => onChange("true")} /><Chip label="Không" active={value === "false"} onPress={() => onChange("false")} /></View></View>;
  if (attributeKey === "coverage") return <View><Text style={styles.label}>{label}</Text><View style={styles.chipWrap}><Chip label="Chưa biết" active={!value} onPress={() => onChange("")} /><Chip label="Thân trên" active={value === "UPPER_BODY"} onPress={() => onChange("UPPER_BODY")} /><Chip label="Toàn thân" active={value === "FULL_BODY"} onPress={() => onChange("FULL_BODY")} /></View></View>;
  return <View><Text style={styles.label}>{label}{unit ? ` (${unit})` : ""}</Text><TextInput style={styles.input} keyboardType="numbers-and-punctuation" value={value} onChangeText={onChange} placeholder="Chưa biết" /></View>;
}

function LinkModal({ visible, busy, onClose, onSubmit }: { visible: boolean; busy: boolean; onClose: () => void; onSubmit: (url: string) => void }) { const [url, setUrl] = useState(""); return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.centerBackdrop}><View style={styles.linkModal}><Text style={styles.modalEyebrow}>AI LINK</Text><Text style={styles.modalTitle}>Nạp từ đường dẫn</Text><Text style={styles.linkDescription}>Dán link sản phẩm trekking. Bạn sẽ xem và sửa bản nháp trước khi lưu.</Text><TextInput autoCapitalize="none" keyboardType="url" value={url} onChangeText={setUrl} style={styles.input} placeholder="https://..." /><View style={styles.linkActions}><TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity><TouchableOpacity disabled={busy || !url.trim()} style={styles.linkSubmit} onPress={() => onSubmit(url.trim())}><Text style={styles.linkSubmitText}>{busy ? "Đang đọc..." : "Tạo bản nháp"}</Text></TouchableOpacity></View></View></View></Modal>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>; }
const conditionLabel = (value: GearCondition) => CONDITIONS.find((item) => item.value === value)?.label ?? value;
const sourceLabel = (value: UserGearItem["source"]) => value === "ai_image" ? "AI Camera" : value === "ai_link" ? "AI Link" : "Nhập tay";
function formatAttribute(value: unknown, unit: string) { if (value === true) return "Có"; if (value === false) return "Không"; if (value === "FULL_BODY") return "Toàn thân"; if (value === "UPPER_BODY") return "Thân trên"; return `${String(value)}${unit}`; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fc" }, flex: { flex: 1 }, alignEnd: { alignItems: "flex-end" }, spaceBetween: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 17, paddingVertical: 10, gap: 11, backgroundColor: "#f5f7fc" }, headerCopy: { flex: 1 }, brandRow: { flexDirection: "row", alignItems: "center", gap: 8 }, brand: { fontSize: 19, fontWeight: "900", color: "#102a22" }, version: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#e5edff", color: "#29485e", fontSize: 9, fontWeight: "800" }, subtitle: { marginTop: 1, color: "#374a56", fontSize: 12 }, roundButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#fff" }, profileButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "#063f31" },
  content: { paddingHorizontal: 17, paddingBottom: 40 }, capacityCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 17, backgroundColor: "#fff", ...Shadows.card }, capacityIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#e9f1ff" }, capacityTitle: { color: "#131b21", fontSize: 17, fontWeight: "900" }, capacitySub: { marginTop: 3, color: "#40566a", fontSize: 11 }, capacityCount: { color: "#131b21", fontSize: 14, fontWeight: "900" }, progressTrack: { height: 7, marginTop: 13, overflow: "hidden", borderRadius: 7, backgroundColor: "#dce8fb" }, progressBar: { height: "100%", borderRadius: 7, backgroundColor: "#0d523f" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 }, aiButton: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, backgroundColor: "#053e30" }, aiButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" }, manualButton: { flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#edf0f5" }, manualButtonText: { color: "#17251f", fontSize: 13, fontWeight: "800" }, linkButton: { marginTop: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 8 }, linkText: { color: "#315f52", fontSize: 11, fontWeight: "700" },
  loadingBanner: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 13, backgroundColor: "#e8f6ef" }, loadingTitle: { color: "#153f34", fontSize: 12, fontWeight: "900" }, loadingText: { marginTop: 2, color: "#49675f", fontSize: 10 }, errorCard: { marginTop: 12, flexDirection: "row", gap: 9, padding: 13, borderRadius: 12, backgroundColor: Colors.errorContainer }, errorText: { flex: 1, color: Colors.error, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  filters: { gap: 8, paddingVertical: 16 }, filter: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: "#fff" }, filterActive: { backgroundColor: "#063f31" }, filterText: { color: "#334155", fontSize: 11, fontWeight: "800" }, filterTextActive: { color: "#fff" }, filterCount: { color: "#718096", fontSize: 10, fontWeight: "900" }, filterCountActive: { color: "#7fd0aa" },
  center: { minHeight: 250, alignItems: "center", justifyContent: "center", gap: 12 }, muted: { color: "#64748b", fontSize: 12 }, empty: { alignItems: "center", padding: 35, borderRadius: 18, backgroundColor: "#fff" }, emptyTitle: { marginTop: 12, color: "#16231e", fontSize: 16, fontWeight: "900" }, emptyText: { marginTop: 6, color: "#64748b", fontSize: 11, textAlign: "center" }, list: { gap: 14 },
  itemCard: { padding: 13, borderRadius: 17, backgroundColor: "#fff", ...Shadows.card }, itemTop: { flexDirection: "row", gap: 12 }, itemImage: { width: 86, height: 86, borderRadius: 10, backgroundColor: "#e9eff3" }, itemImageFallback: { width: 86, height: 86, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#e3eee9" }, itemMain: { flex: 1, minWidth: 0 }, badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 }, categoryBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#dbe7fa", color: "#23394a", fontSize: 8, fontWeight: "900" }, conditionBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#c9f2d8", color: "#114a32", fontSize: 8, fontWeight: "900" }, sourceBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: "#edf2ff", color: "#334864", fontSize: 8, fontWeight: "800" }, itemName: { marginTop: 6, color: "#090f13", fontSize: 17, lineHeight: 21, fontWeight: "900" }, itemHistory: { marginTop: 6, color: "#627484", fontSize: 10 }, statsRow: { minHeight: 54, flexDirection: "row", gap: 6, marginTop: 12, padding: 9, borderRadius: 10, backgroundColor: "#f7f9fc" }, stat: { flex: 1, alignItems: "center", justifyContent: "center" }, statLabel: { color: "#8ba0b4", fontSize: 8, textTransform: "uppercase" }, statValue: { marginTop: 3, color: "#111820", fontSize: 11, fontWeight: "900" }, unknown: { alignSelf: "center", color: "#9a6500", fontSize: 10, fontWeight: "700" }, itemActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }, removeButton: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9 }, removeText: { color: "#25483f", fontSize: 11 }, editButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 10, backgroundColor: "#e6efff" }, editText: { color: "#102a22", fontSize: 11, fontWeight: "900" },
  ruleCard: { marginTop: 18, flexDirection: "row", gap: 11, padding: 15, borderRadius: 14, backgroundColor: "#e1edff" }, ruleTitle: { color: "#17372f", fontSize: 11, fontWeight: "900" }, ruleText: { marginTop: 3, color: "#405b55", fontSize: 10, lineHeight: 16 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(5,20,16,.5)" }, modal: { maxHeight: "91%", padding: 20, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#f8fafc" }, handle: { width: 42, height: 4, alignSelf: "center", marginBottom: 16, borderRadius: 3, backgroundColor: "#cad3d9" }, modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, modalEyebrow: { color: "#1d6c55", fontSize: 9, fontWeight: "900", letterSpacing: .7 }, modalTitle: { marginTop: 3, color: "#101c17", fontSize: 20, fontWeight: "900" }, label: { marginTop: 16, marginBottom: 7, color: "#293b34", fontSize: 11, fontWeight: "800" }, input: { minHeight: 48, borderWidth: 1, borderColor: "#dce3e8", borderRadius: 11, paddingHorizontal: 13, backgroundColor: "#fff", color: "#16231e" }, chipRow: { gap: 7, paddingRight: 20 }, chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: "#e9edf1" }, chipActive: { backgroundColor: "#073f31" }, chipText: { color: "#52615b", fontSize: 10, fontWeight: "700" }, chipTextActive: { color: "#fff" }, draftNote: { marginTop: 18, flexDirection: "row", gap: 9, padding: 12, borderRadius: 11, backgroundColor: "#e5f5ed" }, draftNoteText: { flex: 1, color: "#315c50", fontSize: 10, lineHeight: 15 }, saveButton: { minHeight: 50, marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#073f31" }, saveText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  sectionLabel: { marginTop: 22, color: "#16231e", fontSize: 14, fontWeight: "900" }, sectionHint: { marginTop: 3, color: "#718078", fontSize: 10 },
  centerBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(5,20,16,.55)" }, linkModal: { width: "100%", padding: 22, borderRadius: 22, backgroundColor: "#fff" }, linkDescription: { marginTop: 8, marginBottom: 6, color: "#627169", fontSize: 11, lineHeight: 17 }, linkActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 }, cancelButton: { paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: "#dce3e8", borderRadius: 10 }, cancelText: { fontSize: 11, fontWeight: "800" }, linkSubmit: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 10, backgroundColor: "#073f31" }, linkSubmitText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});
