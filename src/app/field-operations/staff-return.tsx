import { FieldModal } from '@/components/FieldModal';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { deliveryTasks } from '@/data/fieldOpsMock';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const equipment = ['Balo trekking 45L', 'Gậy trekking carbon', 'Bộ áo mưa chống nước', 'Đèn đội đầu'];
type ItemStatus = 'PENDING' | 'OK' | 'MISSING' | 'DAMAGED';
const labels: Record<ItemStatus, string> = { PENDING: 'Chưa kiểm', OK: 'Bình thường', MISSING: 'Thiếu', DAMAGED: 'Hư hỏng' };

export default function StaffReturnScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const task = deliveryTasks.find(item => item.id === taskId && item.type === 'THU_HOI') ?? deliveryTasks[1];
  const { fieldWorkflow, markReturnArrived, setReturnVerified, setReturnItem, setReturnConditionRecorded, setReturnSigned, completeReturn } = useApp();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const locked = !fieldWorkflow.handoverRequested;
  const allReviewed = fieldWorkflow.returnItems.length === equipment.length && fieldWorkflow.returnItems.every(item => item.status !== 'PENDING' && (item.status === 'OK' || item.note.trim().length > 0));
  const normalCount = fieldWorkflow.returnItems.filter(item => item.status === 'OK').length;
  const issueCount = fieldWorkflow.returnItems.filter(item => item.status === 'MISSING' || item.status === 'DAMAGED').length;
  const step = !fieldWorkflow.returnArrived ? 0 : !fieldWorkflow.returnVerified ? 1 : !allReviewed ? 2 : 3;

  const setStatus = (index: number, status: ItemStatus) => {
    if (locked) return;
    setReturnItem(index, status, fieldWorkflow.returnItems[index]?.note ?? '');
  };

  const scanReturner = () => {
    if (locked || scanBusy) return;
    setScanBusy(true);
    setTimeout(() => { setReturnVerified(true); setScanBusy(false); }, 1000);
  };

  const verify = () => {
    if (locked) return;
    if (otp === '654321') setReturnVerified(true);
    else setFeedback({ title: 'OTP chưa đúng', message: 'Dùng mã mock 654321 để xác minh người trả.' });
  };

  const next = () => {
    if (locked) return;
    if (step === 0) { markReturnArrived(); return; }
    if (step === 1) { setFeedback({ title: 'Chưa xác minh', message: 'Quét hoặc nhập đúng OTP 654321 trước khi đối soát.' }); return; }
    if (step === 2) { setFeedback({ title: 'Chưa đủ đối soát', message: 'Mỗi món phải được đánh dấu; thiếu hoặc hư hỏng phải có ghi chú.' }); return; }
    if (!fieldWorkflow.returnConditionRecorded || !fieldWorkflow.returnSigned) {
      setFeedback({ title: 'Thiếu biên bản', message: 'Cần ghi nhận hiện trạng và chữ ký khách hàng.' });
      return;
    }
    if (busy) return;
    setBusy(true);
    setTimeout(() => { completeReturn(); setBusy(false); setComplete(true); }, 500);
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><Text style={styles.headerTitle}>Chi tiết thu hồi</Text><View style={{ width: 23 }} /></View>
    <View style={styles.taskHeader}><Text style={styles.taskId}>{task.id}</Text><Text style={styles.title}>{task.title}</Text><Text style={styles.meta}>{task.customer} · {task.location}</Text></View>
    {locked && <View style={styles.locked}><Ionicons name="lock-closed" size={22} color="#9b6700" /><View style={{ flex: 1 }}><Text style={styles.lockedTitle}>Task đang bị khóa</Text><Text style={styles.lockedText}>Chờ Leader gửi báo cáo kết thúc</Text></View></View>}
    <View style={styles.steps}>{['Đến điểm hẹn', 'Xác minh người trả', 'Đối soát thiết bị', 'Chuyển về kho'].map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepCircle, index < step && styles.stepDone]}>{index < step ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.stepNumber}>{index + 1}</Text>}</View><Text style={styles.stepLabel}>{label}</Text></View>)}</View>
    {step === 0 && <View style={styles.card}><Text style={styles.section}>ĐIỂM THU HỒI</Text><Ionicons name="navigate-circle-outline" size={48} color={Colors.primaryDark} /><Text style={styles.cardTitle}>{task.location}</Text><Text style={styles.muted}>{fieldWorkflow.returnArrived ? 'Đã đến điểm hẹn' : 'Sẵn sàng xác nhận đã đến'}</Text></View>}
    {step === 1 && <View style={styles.card}><Text style={styles.section}>XÁC MINH NGƯỜI TRẢ</Text><TouchableOpacity disabled={locked || scanBusy || fieldWorkflow.returnVerified} style={[styles.qrBox, fieldWorkflow.returnVerified && styles.verified]} onPress={scanReturner}><Ionicons name={fieldWorkflow.returnVerified ? 'checkmark-circle' : 'qr-code'} size={46} color={fieldWorkflow.returnVerified ? Colors.primaryDark : Colors.ink} /><Text style={styles.cardTitle}>{fieldWorkflow.returnVerified ? 'Đã xác minh người trả' : scanBusy ? 'Đang quét...' : 'Quét QR người trả'}</Text><Text style={styles.muted}>Quét chờ 1 giây hoặc nhập OTP 654321</Text></TouchableOpacity><View style={styles.otpRow}><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="OTP 654321" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} /><TouchableOpacity disabled={locked} style={styles.verifyButton} onPress={verify}><Text style={styles.verifyText}>XÁC MINH</Text></TouchableOpacity></View></View>}
    {step === 2 && <View style={styles.card}><Text style={styles.section}>ĐỐI SOÁT THIẾT BỊ</Text>{equipment.map((item, index) => { const itemState = fieldWorkflow.returnItems[index] ?? { status: 'PENDING' as ItemStatus, note: '' }; return <View key={item} style={styles.item}><Text style={styles.checkLabel}>{item}</Text><View style={styles.statusRow}>{(['OK', 'MISSING', 'DAMAGED'] as ItemStatus[]).map(status => <TouchableOpacity key={status} disabled={locked} style={[styles.statusButton, itemState.status === status && styles.statusSelected]} onPress={() => setStatus(index, status)}><Text style={styles.statusText}>{labels[status]}</Text></TouchableOpacity>)}</View>{(itemState.status === 'MISSING' || itemState.status === 'DAMAGED') && <TextInput editable={!locked} value={itemState.note} onChangeText={note => setReturnItem(index, itemState.status, note)} placeholder="Ghi chú bắt buộc" placeholderTextColor={Colors.onSurfaceMuted} style={styles.noteInput} />}</View>; })}<View style={styles.summary}><Text style={styles.noticeText}>Tổng kết: {normalCount} món bình thường · {issueCount} món có vấn đề.</Text></View></View>}
    {step === 3 && <View style={styles.card}><Text style={styles.section}>BIÊN BẢN THU HỒI</Text><TouchableOpacity disabled={locked} style={[styles.condition, fieldWorkflow.returnConditionRecorded && styles.verified]} onPress={() => setReturnConditionRecorded(!fieldWorkflow.returnConditionRecorded)}><Ionicons name="camera-outline" size={22} color={Colors.primaryDark} /><Text style={styles.conditionText}>{fieldWorkflow.returnConditionRecorded ? 'Đã ghi nhận hiện trạng' : 'Ghi nhận hiện trạng mock'}</Text></TouchableOpacity><TouchableOpacity disabled={locked} style={[styles.signature, fieldWorkflow.returnSigned && styles.verified]} onPress={() => setReturnSigned(!fieldWorkflow.returnSigned)}><Text style={styles.cardTitle}>Chữ ký khách hàng</Text><Text style={styles.muted}>{fieldWorkflow.returnSigned ? 'Đã ký xác nhận' : 'Chạm để ký xác nhận mock'}</Text></TouchableOpacity><Text style={styles.policy}>Staff Delivery chỉ ghi nhận hiện trạng. Chờ kho kiểm định, không hoàn cọc tại đây.</Text></View>}
    <TouchableOpacity disabled={locked || busy || (step === 0 ? false : step === 3 && (!fieldWorkflow.returnConditionRecorded || !fieldWorkflow.returnSigned))} style={[styles.primary, (locked || busy) && styles.disabled]} onPress={next}><Text style={styles.primaryText}>{locked ? 'ĐANG KHÓA' : busy ? 'ĐANG XỬ LÝ...' : step === 3 ? 'HOÀN TẤT & CHUYỂN VỀ KHO' : step === 0 ? 'XÁC NHẬN ĐÃ ĐẾN' : 'TIẾP TỤC'}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity>
  </ScrollView>
    <FieldModal visible={complete} title="Đã hoàn tất thu hồi" message="Thiết bị đã chuyển về Kho. Chờ kho kiểm định, Staff Delivery không hoàn cọc." icon="checkmark-circle" actionLabel="Về dashboard" onAction={() => { setComplete(false); router.replace('/field-operations'); }} onClose={() => setComplete(false)} />
    <FieldModal visible={feedback !== null} title={feedback?.title ?? ''} message={feedback?.message ?? ''} icon="information-circle" tone="warning" actionLabel="Đã hiểu" onAction={() => setFeedback(null)} onClose={() => setFeedback(null)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.surface }, content: { padding: 20, paddingBottom: 35 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: '800' }, taskHeader: { backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 16 }, taskId: { color: Colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 7 }, meta: { color: '#bed0bb', fontSize: 13, marginTop: 8 }, locked: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#fff3d2', padding: 13, borderRadius: Radius.sm, marginBottom: 16 }, lockedTitle: { color: '#795500', fontWeight: '800' }, lockedText: { color: '#795500', fontSize: 12, marginTop: 3 }, steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }, step: { alignItems: 'center', width: '24%' }, stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }, stepDone: { backgroundColor: Colors.primaryDark }, stepNumber: { color: Colors.onSurfaceMuted, fontWeight: '800', fontSize: 12 }, stepLabel: { color: Colors.onSurfaceMuted, fontSize: 10, textAlign: 'center', marginTop: 6 }, card: { backgroundColor: '#fff', padding: 17, borderRadius: Radius.md, marginBottom: 18, ...Shadows.card }, section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: .8, marginBottom: 10 }, cardTitle: { color: Colors.ink, fontSize: 16, fontWeight: '800', marginTop: 8 }, muted: { color: Colors.onSurfaceMuted, fontSize: 12, marginTop: 5 }, qrBox: { alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, padding: 17, borderRadius: Radius.sm }, verified: { backgroundColor: '#e9f4de' }, otpRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, input: { flex: 1, color: Colors.ink, borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 8, padding: 12 }, verifyButton: { backgroundColor: Colors.primaryDark, borderRadius: 8, paddingHorizontal: 13, justifyContent: 'center' }, verifyText: { color: '#fff', fontSize: 11, fontWeight: '800' }, item: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, checkLabel: { color: Colors.ink, fontSize: 14, fontWeight: '700' }, statusRow: { flexDirection: 'row', gap: 6, marginTop: 8 }, statusButton: { borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 7, padding: 8 }, statusSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, statusText: { color: Colors.ink, fontSize: 10, fontWeight: '700' }, noteInput: { borderWidth: 1, borderColor: Colors.error, borderRadius: 7, padding: 9, color: Colors.ink, marginTop: 8 }, summary: { backgroundColor: '#fff5d7', padding: 12, borderRadius: 8, marginTop: 15 }, noticeText: { color: Colors.body, fontSize: 12 }, condition: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: Colors.surfaceContainerLow, borderRadius: 8 }, conditionText: { color: Colors.ink, flex: 1 }, signature: { padding: 14, marginTop: 12, borderRadius: 8, backgroundColor: Colors.surfaceContainerLow }, policy: { color: Colors.primaryDark, marginTop: 16, lineHeight: 19 }, primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primaryDark, padding: 15, borderRadius: Radius.sm }, disabled: { opacity: .55 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 } });
