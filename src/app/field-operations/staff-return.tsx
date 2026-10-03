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

export default function StaffReturnScreen() {
    const router = useRouter();
    const { taskId } = useLocalSearchParams<{ taskId?: string }>();
    const task = deliveryTasks.find(item => item.id === taskId && item.type === 'THU_HOI') ?? deliveryTasks[1];
    const {
        fieldWorkflow,
        markReturnArrived,
        setReturnVerified,
        toggleReturnItem,
        setReturnConditionRecorded,
        setReturnSigned,
        completeReturn,
    } = useApp();
    const [step, setStep] = useState(fieldWorkflow.returnArrived ? 1 : 0);
    const [otp, setOtp] = useState('');
    const [conditionNote, setConditionNote] = useState('');
    const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
    const [complete, setComplete] = useState(false);
    const allItems = fieldWorkflow.returnItems.every(Boolean);
    const canFinish = allItems && fieldWorkflow.returnConditionRecorded && fieldWorkflow.returnSigned;

    const verify = () => {
        if (otp === '654321') {
            setReturnVerified(true);
            setStep(2);
            return;
        }
        setFeedback({ title: 'OTP chưa đúng', message: 'Dùng mã mock 654321 để xác minh người trả.' });
    };

    const next = () => {
        if (step === 0) {
            markReturnArrived();
            setStep(1);
            return;
        }
        if (step === 1 && !fieldWorkflow.returnVerified) {
            setFeedback({ title: 'Chưa xác minh', message: 'Quét QR hoặc nhập OTP 654321 trước khi kiểm thiết bị.' });
            return;
        }
        if (step === 1 && !allItems) {
            setFeedback({ title: 'Thiếu thiết bị', message: 'Hãy xác nhận đủ 4 món trước khi ghi nhận hiện trạng.' });
            return;
        }
        if (step === 2 && !canFinish) {
            setFeedback({ title: 'Thiếu biên bản', message: 'Cần ghi nhận hiện trạng và chữ ký khách hàng.' });
            return;
        }
        if (step === 2) {
            completeReturn();
            setComplete(true);
            return;
        }
        setStep(current => current + 1);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết thu hồi</Text>
                    <View style={{ width: 23 }} />
                </View>
                <View style={styles.taskHeader}>
                    <Text style={styles.taskId}>{task.id}</Text>
                    <Text style={styles.title}>{task.title}</Text>
                    <Text style={styles.meta}>{task.customer} · {task.location}</Text>
                </View>
                {!fieldWorkflow.handoverRequested && <View style={styles.notice}><Ionicons name="link-outline" size={20} color="#9b6700" /><Text style={styles.noticeText}>Task thu hồi sẽ được mở chính thức sau khi Leader gửi báo cáo hoàn tất chuyến. Bạn vẫn có thể xem trước các bước mock.</Text></View>}
                <View style={styles.steps}>{['Đến điểm hẹn', 'Xác minh & nhận', 'Hiện trạng & ký'].map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepCircle, index <= step && styles.stepDone]}>{index < step ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={[styles.stepNumber, index <= step && styles.stepNumberDone]}>{index + 1}</Text>}</View><Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text></View>)}</View>
                {step === 0 && <View style={styles.card}><Ionicons name="navigate-circle-outline" size={48} color={Colors.primaryDark} /><Text style={styles.cardTitle}>Đi tới điểm đón thiết bị</Text><Text style={styles.muted}>{task.location} · GPS mock đã sẵn sàng</Text><Text style={styles.routeStatus}>{fieldWorkflow.returnArrived ? 'Đã đến điểm hẹn' : 'Đang chờ Staff Delivery xác nhận đến nơi'}</Text></View>}
                {step === 1 && <View style={styles.card}><Text style={styles.section}>XÁC MINH NGƯỜI TRẢ</Text><TouchableOpacity style={[styles.qrBox, fieldWorkflow.returnVerified && styles.verified]} onPress={() => { setReturnVerified(true); }}><Ionicons name={fieldWorkflow.returnVerified ? 'checkmark-circle' : 'qr-code'} size={46} color={fieldWorkflow.returnVerified ? Colors.primaryDark : Colors.ink} /><Text style={styles.cardTitle}>{fieldWorkflow.returnVerified ? 'Đã xác minh người trả' : 'Quét QR người trả'}</Text><Text style={styles.muted}>Hoặc nhập OTP mock 654321</Text></TouchableOpacity><View style={styles.otpRow}><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="OTP 654321" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} /><TouchableOpacity style={styles.verifyButton} onPress={verify}><Text style={styles.verifyText}>XÁC MINH</Text></TouchableOpacity></View><Text style={styles.section}>ĐỐI SOÁT THIẾT BỊ</Text>{equipment.map((item, index) => <CheckRow key={item} label={item} checked={fieldWorkflow.returnItems[index]} onPress={() => toggleReturnItem(index)} />)}<Text style={styles.noticeText}>Đã nhận {fieldWorkflow.returnItems.filter(Boolean).length}/{equipment.length} món.</Text></View>}
                {step === 2 && <View style={styles.card}><Text style={styles.section}>HIỆN TRẠNG THỰC TẾ</Text><TextInput value={conditionNote} onChangeText={value => { setConditionNote(value); setReturnConditionRecorded(value.trim().length > 0); }} placeholder="Ví dụ: Mất dây sạc Type-C, thân máy có xước nhẹ" placeholderTextColor={Colors.onSurfaceMuted} multiline style={styles.noteInput} /><TouchableOpacity style={[styles.condition, fieldWorkflow.returnConditionRecorded && styles.verified]} onPress={() => setReturnConditionRecorded(!fieldWorkflow.returnConditionRecorded)}><Ionicons name={fieldWorkflow.returnConditionRecorded ? 'checkmark-circle' : 'camera-outline'} size={22} color={Colors.primaryDark} /><Text style={styles.conditionText}>{fieldWorkflow.returnConditionRecorded ? 'Đã ghi nhận ảnh và hiện trạng' : 'Chạm để ghi nhận hiện trạng mock'}</Text></TouchableOpacity><TouchableOpacity style={[styles.signature, fieldWorkflow.returnSigned && styles.verified]} onPress={() => setReturnSigned(!fieldWorkflow.returnSigned)}><Text style={styles.cardTitle}>Chữ ký khách hàng</Text><Text style={styles.muted}>{fieldWorkflow.returnSigned ? 'Đã ký xác nhận biên bản thực địa' : 'Chạm để ký xác nhận mock'}</Text></TouchableOpacity><Text style={styles.policy}>Staff Delivery chỉ ghi nhận hiện trạng. Tiền cọc chuyển sang Kho kiểm định.</Text></View>}
                <TouchableOpacity style={styles.primary} onPress={next}><Text style={styles.primaryText}>{step === 2 ? 'HOÀN TẤT & CHUYỂN VỀ KHO' : step === 0 ? 'XÁC NHẬN ĐÃ ĐẾN' : 'TIẾP TỤC'}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity>
            </ScrollView>
            <FieldModal visible={complete} title="Đã hoàn tất thu hồi" message="Thiết bị đã chuyển về Kho Sa Pa. Tiền cọc đang chờ Staff Inventory kiểm định." icon="checkmark-circle" actionLabel="Về dashboard" onAction={() => { setComplete(false); router.replace('/field-operations'); }} onClose={() => setComplete(false)} />
            <FieldModal visible={feedback !== null} title={feedback?.title ?? ''} message={feedback?.message ?? ''} icon="information-circle" tone="warning" actionLabel="Đã hiểu" onAction={() => setFeedback(null)} onClose={() => setFeedback(null)} />
        </SafeAreaView>
    );
}

function CheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) { return <TouchableOpacity style={styles.checkRow} onPress={onPress}><View style={[styles.checkbox, checked && styles.checkboxChecked]}>{checked && <Ionicons name="checkmark" size={14} color="#fff" />}</View><Text style={styles.checkLabel}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.surface }, content: { padding: 20, paddingBottom: 35 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: '800' }, taskHeader: { backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 16 }, taskId: { color: Colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 7 }, meta: { color: '#bed0bb', fontSize: 13, marginTop: 8 }, notice: { flexDirection: 'row', gap: 9, backgroundColor: '#fff3d2', padding: 13, borderRadius: Radius.sm, marginBottom: 16 }, noticeText: { flex: 1, color: '#795500', fontSize: 12, lineHeight: 17 }, steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }, step: { alignItems: 'center', width: '32%' }, stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }, stepDone: { backgroundColor: Colors.primaryDark }, stepNumber: { color: Colors.onSurfaceMuted, fontWeight: '800', fontSize: 12 }, stepNumberDone: { color: '#fff' }, stepLabel: { color: Colors.onSurfaceMuted, fontSize: 10, textAlign: 'center', marginTop: 6 }, stepLabelActive: { color: Colors.primaryDark, fontWeight: '800' }, card: { backgroundColor: '#fff', padding: 17, borderRadius: Radius.md, marginBottom: 18, ...Shadows.card }, cardTitle: { color: Colors.ink, fontSize: 16, fontWeight: '800', marginTop: 8 }, muted: { color: Colors.onSurfaceMuted, fontSize: 12, marginTop: 5 }, routeStatus: { color: Colors.primaryDark, fontWeight: '800', marginTop: 16 }, section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: .8, marginTop: 4, marginBottom: 10 }, qrBox: { alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, padding: 17, borderRadius: Radius.sm }, verified: { backgroundColor: '#e9f4de' }, otpRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, input: { flex: 1, color: Colors.ink, borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 8, padding: 12 }, verifyButton: { backgroundColor: Colors.primaryDark, borderRadius: 8, paddingHorizontal: 13, justifyContent: 'center' }, verifyText: { color: '#fff', fontSize: 11, fontWeight: '800' }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: Colors.onSurfaceMuted, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, checkLabel: { color: Colors.ink, fontSize: 13, flex: 1 }, noteInput: { minHeight: 95, textAlignVertical: 'top', color: Colors.ink, borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 8, padding: 12, marginBottom: 12 }, condition: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, backgroundColor: Colors.surfaceContainerLow, borderRadius: 8 }, conditionText: { color: Colors.ink, fontWeight: '700', fontSize: 12 }, signature: { padding: 14, backgroundColor: Colors.surfaceContainerLow, borderRadius: 8, marginTop: 12 }, policy: { color: Colors.onSurfaceMuted, fontSize: 11, lineHeight: 16, marginTop: 14, fontStyle: 'italic' }, primary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryDark, borderRadius: Radius.sm, padding: 15, marginTop: 4 }, primaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
