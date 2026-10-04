import { Colors, Radius, Shadows } from '@/constants/theme';
import { fieldAccounts } from '@/data/fieldOpsMock';
import { useApp } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TripForm = {
  name: string;
  startDate: string;
  endDate: string;
  slots: string;
  trailId: string;
  checkpointIds: string[];
};

export default function LeaderCreateTripScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'permission' | 'form' | 'review'>('permission');
  const [form, setForm] = useState<TripForm>({ name: '', startDate: '', endDate: '', slots: '', trailId: '', checkpointIds: [] });
  const [errors, setErrors] = useState<Partial<Record<keyof TripForm, string>>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const { publishPublicTrip, trails } = useApp();
  const canCreatePublicTrip = fieldAccounts.LEADER.canCreatePublicTrip;

  const selectedTrail = trails.find(trail => trail.id === form.trailId);
  const checkpoints = selectedTrail?.checkpoints ?? [];
  const selectedCheckpoints = useMemo(
    () => checkpoints.filter(checkpoint => form.checkpointIds.includes(checkpoint.id)),
    [checkpoints, form.checkpointIds]
  );

  const publish = () => {
    if (!validate()) return;
    setIsPublishing(true);
    setTimeout(() => {
      publishPublicTrip({
        name: form.name.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        slots: Number(form.slots),
        trailId: form.trailId,
        checkpointIds: form.checkpointIds,
      });
      setIsPublishing(false);
      setPublished(true);
    }, 500);
  };

  if (!canCreatePublicTrip) {
    return <SafeAreaView style={styles.safe}><BlockedPermission onBack={() => router.back()} /></SafeAreaView>;
  }

  if (step === 'permission') {
    return <SafeAreaView style={styles.safe}><View style={styles.permissionPage}><Header onBack={() => router.back()} title="Tạo Public Trip" /><View style={styles.permissionCard}><View style={styles.permissionIcon}><Ionicons name="shield-checkmark-outline" size={34} color={Colors.primaryDark} /></View><Text style={styles.permissionTitle}>Kiểm tra quyền tạo chuyến</Text><Text style={styles.permissionText}>Tài khoản Mountain Leader của bạn được phép tạo Public Trip. Bạn có thể tiếp tục nhập thông tin chuyến và chọn checkpoint.</Text><View style={styles.permissionRow}><Ionicons name="checkmark-circle" size={19} color={Colors.primaryDark} /><Text style={styles.permissionRowText}>Quyền tạo Public Trip đã được cấp</Text></View><TouchableOpacity style={styles.primary} onPress={() => setStep('form')}><Text style={styles.primaryText}>TIẾP TỤC TẠO TRIP</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></TouchableOpacity></View></View></SafeAreaView>;
  }

  const updateField = (field: keyof TripForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
  };

  const toggleCheckpoint = (id: string) => {
    setForm(current => ({
      ...current,
      checkpointIds: current.checkpointIds.includes(id)
        ? current.checkpointIds.filter(checkpointId => checkpointId !== id)
        : [...current.checkpointIds, id],
    }));
    setErrors(current => ({ ...current, checkpointIds: undefined }));
  };

  const selectTrail = (trailId: string) => {
    setForm(current => ({ ...current, trailId, checkpointIds: [] }));
    setErrors(current => ({ ...current, trailId: undefined, checkpointIds: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof TripForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = 'Vui lòng nhập tên chuyến đi.';
    if (!form.startDate.trim()) nextErrors.startDate = 'Vui lòng nhập ngày khởi hành.';
    if (!form.endDate.trim()) nextErrors.endDate = 'Vui lòng nhập ngày kết thúc.';
    if (!form.trailId) nextErrors.trailId = 'Chọn một system trail.';
    const slots = Number(form.slots);
    if (!form.slots.trim() || !Number.isInteger(slots) || slots < 1) nextErrors.slots = 'Số slot phải là số nguyên lớn hơn 0.';
    if (form.checkpointIds.length === 0) nextErrors.checkpointIds = 'Chọn ít nhất 1 checkpoint của trail.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  if (published) {
    return <SafeAreaView style={styles.safe}><View style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={32} color="#fff" /></View><Text style={styles.successTitle}>Trip đã được Publish!</Text><Text style={styles.successText}>Chuyến đi công khai đã được lưu thành công vào danh sách trip.</Text><View style={styles.successCard}><Text style={styles.label}>MÃ CHUYẾN ĐI</Text><Text style={styles.successCode}>#{form.name.slice(0, 3).toUpperCase()}-{Date.now().toString().slice(-4)}</Text><ReviewRow label="Tên chuyến" value={form.name} /><ReviewRow label="Ngày đi" value={`${form.startDate} – ${form.endDate}`} /><ReviewRow label="Slot mở bán" value={`${form.slots} chỗ`} /></View><TouchableOpacity style={styles.primary} onPress={() => router.replace('/field-operations/leader-pretrip')}><Text style={styles.primaryText}>TIẾP TỤC PRE-TRIP</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></TouchableOpacity></View></SafeAreaView>;
  }

  if (step === 'review') {
    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Header onBack={() => setStep('form')} title="Tạo Public Trip · Xem lại" /><View style={styles.reviewCard}><Text style={styles.reviewTitle}>{form.name}</Text><ReviewRow label="System trail" value={selectedTrail?.name ?? ''} /><ReviewRow label="Ngày khởi hành" value={form.startDate} /><ReviewRow label="Ngày kết thúc" value={form.endDate} /><ReviewRow label="Số slot" value={form.slots} /><ReviewRow label="Checkpoint" value={selectedCheckpoints.map(checkpoint => checkpoint.name).join(', ')} /></View><Text style={styles.reviewNotice}>Thông tin hợp lệ. Kiểm tra lần cuối trước khi publish chuyến đi.</Text><TouchableOpacity disabled={isPublishing} style={[styles.primary, isPublishing && styles.disabled]} onPress={publish}><Text style={styles.primaryText}>{isPublishing ? 'ĐANG PUBLISH...' : 'PUBLISH TRIP'}</Text><Ionicons name="rocket-outline" size={17} color="#fff" /></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={() => setStep('form')}><Text style={styles.secondaryText}>CHỈNH SỬA THÔNG TIN</Text></TouchableOpacity></ScrollView></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Header onBack={() => router.back()} title="Tạo Public Trip" /><View style={styles.stepPill}><Text style={styles.stepPillText}>BƯỚC 1/2 · THÔNG TIN CHUYẾN</Text></View><Text style={styles.title}>Tạo chuyến công khai</Text><Text style={styles.subtitle}>Chọn system trail trước, sau đó nhập thông tin trip và checkpoint.</Text><Text style={styles.section}>CHỌN SYSTEM TRAIL</Text><View style={styles.trailList}>{trails.map(trail => <TouchableOpacity key={trail.id} disabled={!trail.isUnlocked} style={[styles.trailCard, form.trailId === trail.id && styles.trailCardSelected, !trail.isUnlocked && styles.trailCardLocked]} onPress={() => selectTrail(trail.id)}><View style={{ flex: 1 }}><Text style={styles.trailName}>{trail.name}</Text><Text style={styles.trailMeta}>{trail.region} · {trail.distanceKm} km · +{trail.elevationGainM}m · {trail.duration}</Text><Text style={styles.trailMeta}>{trail.checkpoints.length} checkpoint · {trail.difficulty} · {trail.isUnlocked ? 'Có thể chọn' : 'Đang khóa'}</Text></View><Ionicons name={form.trailId === trail.id ? 'checkmark-circle' : trail.isUnlocked ? 'ellipse-outline' : 'lock-closed'} size={22} color={form.trailId === trail.id ? Colors.primaryDark : Colors.onSurfaceMuted} /></TouchableOpacity>)}</View>{errors.trailId && <Text style={styles.error}>{errors.trailId}</Text>}<Field label="Tên chuyến đi" value={form.name} onChangeText={value => updateField('name', value)} placeholder="Ví dụ: Chinh phục Fansipan 3N2Đ" error={errors.name} /><Field label="Ngày khởi hành" value={form.startDate} onChangeText={value => updateField('startDate', value)} placeholder="DD/MM/YYYY" error={errors.startDate} /><Field label="Ngày kết thúc" value={form.endDate} onChangeText={value => updateField('endDate', value)} placeholder="DD/MM/YYYY" error={errors.endDate} /><Field label="Số slot mở bán" value={form.slots} onChangeText={value => updateField('slots', value)} placeholder="Tối đa 14 trekker" keyboardType="numeric" error={errors.slots} /><Text style={styles.section}>CHECKPOINT CỦA TRAIL</Text><View style={styles.card}>{checkpoints.length > 0 ? checkpoints.map(checkpoint => <TouchableOpacity key={checkpoint.id} style={styles.checkpoint} onPress={() => toggleCheckpoint(checkpoint.id)}><View style={[styles.checkbox, form.checkpointIds.includes(checkpoint.id) && styles.checkboxSelected]}>{form.checkpointIds.includes(checkpoint.id) && <Ionicons name="checkmark" size={15} color="#fff" />}</View><Text style={styles.checkpointText}>{checkpoint.name}</Text></TouchableOpacity>) : <Text style={styles.emptyText}>Trail này chưa có checkpoint để tạo Public Trip.</Text>}{errors.checkpointIds && <Text style={styles.error}>{errors.checkpointIds}</Text>}</View><TouchableOpacity style={styles.primary} onPress={() => validate() && setStep('review')}><Text style={styles.primaryText}>TIẾP TỤC XEM LẠI</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></TouchableOpacity></ScrollView></SafeAreaView>;
}

function BlockedPermission({ onBack }: { onBack: () => void }) { return <View style={styles.blocked}><Ionicons name="lock-closed" size={44} color={Colors.error} /><Text style={styles.blockedTitle}>Không đủ quyền</Text><Text style={styles.blockedText}>Tài khoản của bạn chưa được cấp quyền tạo Public Trip.</Text><TouchableOpacity style={styles.secondary} onPress={onBack}><Text style={styles.secondaryText}>QUAY LẠI</Text></TouchableOpacity></View>; }
function Header({ onBack, title }: { onBack: () => void; title: string }) { return <View style={styles.header}><TouchableOpacity onPress={onBack}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><Text style={styles.headerTitle}>{title}</Text><View style={{ width: 23 }} /></View>; }
function Field({ label, value, onChangeText, placeholder, error, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; error?: string; keyboardType?: 'default' | 'numeric' }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Colors.onSurfaceMuted} keyboardType={keyboardType} style={[styles.input, error && styles.inputError]} /><Text style={error ? styles.error : styles.errorPlaceholder}>{error ?? ' '}</Text></View>; }
function ReviewRow({ label, value }: { label: string; value: string }) { return <View style={styles.reviewRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.surface }, content: { padding: 20, paddingBottom: 36 }, permissionPage: { flex: 1, padding: 20 }, permissionCard: { backgroundColor: '#fff', borderRadius: Radius.md, padding: 22, marginTop: 30, ...Shadows.card }, permissionIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#eaf5e1', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, permissionTitle: { color: Colors.ink, fontSize: 23, fontWeight: '800', textAlign: 'center', marginTop: 18 }, permissionText: { color: Colors.body, lineHeight: 20, textAlign: 'center', marginTop: 9 }, permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f8ee', padding: 12, borderRadius: 8, marginTop: 20 }, permissionRowText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '700' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, headerTitle: { color: Colors.ink, fontWeight: '800' }, stepPill: { alignSelf: 'flex-start', backgroundColor: '#dfeafd', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, stepPillText: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800' }, title: { color: Colors.ink, fontSize: 28, fontWeight: '800', marginTop: 14 }, subtitle: { color: Colors.body, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 18 }, field: { marginBottom: 4 }, label: { color: Colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { backgroundColor: '#edf2fc', borderRadius: 8, padding: 13, color: Colors.ink, borderWidth: 1, borderColor: 'transparent' }, inputError: { borderColor: Colors.error, backgroundColor: '#ffe8e5' }, error: { color: Colors.error, fontSize: 11, marginTop: 4 }, errorPlaceholder: { color: 'transparent', fontSize: 11, marginTop: 4 }, section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: .8, marginTop: 14, marginBottom: 9 }, trailList: { gap: 9 }, trailCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: 'transparent', ...Shadows.card }, trailCardSelected: { borderColor: Colors.primaryDark, backgroundColor: '#eaf5e1' }, trailCardLocked: { opacity: 0.55 }, trailName: { color: Colors.ink, fontSize: 14, fontWeight: '800' }, trailMeta: { color: Colors.onSurfaceMuted, fontSize: 11, marginTop: 4 }, card: { backgroundColor: '#fff', padding: 14, borderRadius: Radius.md, ...Shadows.card }, checkpoint: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: Colors.onSurfaceMuted, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, checkpointText: { color: Colors.ink, flex: 1, fontSize: 13 }, emptyText: { color: Colors.onSurfaceMuted, fontSize: 12, lineHeight: 18 }, primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primaryDark, padding: 15, borderRadius: Radius.sm, marginTop: 22 }, disabled: { backgroundColor: '#aab3a5' }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 13 }, blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, blockedTitle: { color: Colors.ink, fontWeight: '800', fontSize: 24, marginTop: 16 }, blockedText: { color: Colors.body, textAlign: 'center', lineHeight: 20 }, secondary: { borderWidth: 1, borderColor: Colors.primaryDark, padding: 14, borderRadius: Radius.sm, marginTop: 12, alignItems: 'center' }, secondaryText: { color: Colors.primaryDark, fontWeight: '800' }, reviewCard: { backgroundColor: '#fff', borderRadius: Radius.md, padding: 17, ...Shadows.card }, reviewTitle: { color: Colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 12 }, reviewRow: { borderTopWidth: 1, borderTopColor: Colors.surfaceContainer, paddingVertical: 12 }, value: { color: Colors.ink, fontWeight: '700', marginTop: 4 }, reviewNotice: { color: Colors.primaryDark, backgroundColor: '#eaf5e1', padding: 14, borderRadius: Radius.sm, marginTop: 16, lineHeight: 19 }, success: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }, successIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' }, successTitle: { color: Colors.ink, fontSize: 25, fontWeight: '800', marginTop: 18, textAlign: 'center' }, successText: { color: Colors.body, textAlign: 'center', marginTop: 8, lineHeight: 20 }, successCard: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: Radius.md, padding: 17, marginTop: 24, ...Shadows.card }, successCode: { color: Colors.primaryDark, fontSize: 21, fontWeight: '800', marginBottom: 8 } });
