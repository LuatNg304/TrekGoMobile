import { FieldModal } from '@/components/FieldModal';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { DeliveryItemStatus, useApp } from '@/context/AppContext';
import { deliveryTasks } from '@/data/fieldOpsMock';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const equipment = ['Balo trekking 45L', 'Gậy trekking carbon', 'Bộ áo mưa chống nước', 'Đèn đội đầu'];
const statusLabels: Record<DeliveryItemStatus, string> = { PENDING: 'Chưa kiểm', OK: 'Đủ / tốt', MISSING: 'Thiếu', DAMAGED: 'Hư hỏng' };

export default function StaffTaskScreen() {
  const router = useRouter();
  const { fieldWorkflow, receiveDeliveryPackage, markArrivedAtPickup, setDeliveryVerified, setDeliveryItem, setDeliveryPhoto, setDeliverySigned, completeDelivery } = useApp();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const task = deliveryTasks.find(item => item.id === taskId) ?? deliveryTasks[0];
  const [otp, setOtp] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [photoMenu, setPhotoMenu] = useState(false);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const verified = fieldWorkflow.deliveryVerified;
  const signed = fieldWorkflow.deliverySigned;
  const photoUri = fieldWorkflow.deliveryPhotoUri;
  const allItemsReviewed = fieldWorkflow.deliveryItems.length === equipment.length
    && fieldWorkflow.deliveryItems.every(item => item.status !== 'PENDING' && (item.status === 'OK' || item.note.trim().length > 0));
  const step = !fieldWorkflow.packageReceived ? 0 : !fieldWorkflow.arrivedAtPickup ? 1 : !verified ? 2 : !allItemsReviewed ? 3 : 4;

  const setItemStatus = (index: number, status: DeliveryItemStatus) => {
    const note = fieldWorkflow.deliveryItems[index]?.note ?? '';
    setDeliveryItem(index, status, note);
  };

  const verifyByScan = () => {
    if (isBusy) return;
    setIsBusy(true);
    setTimeout(() => { setDeliveryVerified(true); setIsBusy(false); }, 1000);
  };

  const receivePackageByScan = () => {
    if (isBusy) return;
    setIsBusy(true);
    setTimeout(() => {
      const accepted = receiveDeliveryPackage('PKG-7892-A');
      setIsBusy(false);
      if (!accepted) setFeedback({ title: 'Không thể nhận package', message: 'Đơn chưa ở trạng thái READY_FOR_DELIVERY hoặc mã package không hợp lệ.' });
    }, 1000);
  };

  const receivePackageManually = () => {
    const accepted = receiveDeliveryPackage(packageCode.trim());
    if (!accepted) setFeedback({ title: 'Mã package không đúng', message: 'Nhập mã mock PKG-7892-A và đảm bảo đơn đã READY_FOR_DELIVERY.' });
  };

  const capture = async (source: 'camera' | 'library') => {
    setPhotoMenu(false);
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setFeedback({ title: 'Cần cấp quyền', message: 'Hãy cấp quyền để thêm ảnh bằng chứng.' }); return; }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setDeliveryPhoto(result.assets[0].uri);
  };

  const next = () => {
    if (step === 0) { setFeedback({ title: 'Chưa nhận package', message: 'Quét đúng QR package từ kho trước khi tiếp tục.' }); return; }
    if (step === 1) { setFeedback({ title: 'Chưa đến điểm tập trung', message: 'Di chuyển tới điểm tập trung rồi bấm ĐÃ ĐẾN NƠI.' }); return; }
    if (step === 2) { setFeedback({ title: 'Chưa xác minh', message: 'Quét QR hoặc nhập đúng OTP 123456 trước khi tiếp tục.' }); return; }
    if (step === 3) { setFeedback({ title: 'Chưa đủ thiết bị', message: 'Mỗi món phải được đánh dấu đủ, thiếu hoặc hư hỏng. Món thiếu/hỏng cần ghi chú.' }); return; }
    if (!photoUri || !signed) { setFeedback({ title: 'Thiếu bằng chứng', message: 'Cần ảnh bàn giao và chữ ký người nhận.' }); return; }
    if (isBusy) return;
    setIsBusy(true);
    setTimeout(() => { completeDelivery(); setIsBusy(false); setComplete(true); }, 500);
  };

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color={Colors.ink} /></TouchableOpacity><Text style={styles.headerTitle}>Chi tiết nhiệm vụ</Text><View style={{ width: 23 }} /></View>
    <View style={styles.taskHeader}><Text style={styles.taskId}>{task.id}</Text><Text style={styles.title}>{task.title}</Text><Text style={styles.meta}>{task.customer} · {task.location}</Text></View>
    <View style={styles.steps}>{['Nhận package', 'Đến điểm tập trung', 'Xác minh đơn', 'Kiểm tra thiết bị', 'Bằng chứng bàn giao'].map((label, index) => <View key={label} style={styles.step}><View style={[styles.stepCircle, index < step && styles.stepDone]}>{index < step ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.stepNumber}>{index + 1}</Text>}</View><Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text></View>)}</View>
    {step === 0 && <><Text style={styles.section}>NHẬN PACKAGE TỪ KHO</Text><View style={styles.card}><InfoRow icon="cube-outline" label="Package" value="PKG-7892-A" /><InfoRow icon="checkmark-circle-outline" label="Trạng thái đơn" value="READY_FOR_DELIVERY" /><TouchableOpacity style={[styles.qrBox, isBusy && styles.disabled]} onPress={receivePackageByScan} disabled={isBusy}><Ionicons name="qr-code" size={52} color={Colors.ink} /><Text style={styles.qrTitle}>{isBusy ? 'Đang quét package...' : 'Quét QR package'}</Text><Text style={styles.muted}>Chỉ nhận được khi package đã READY_FOR_DELIVERY</Text></TouchableOpacity><View style={styles.otpRow}><TextInput value={packageCode} onChangeText={setPackageCode} autoCapitalize="characters" placeholder="PKG-7892-A" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} /><TouchableOpacity style={styles.verifyButton} onPress={receivePackageManually}><Text style={styles.verifyText}>NHẬP MÃ</Text></TouchableOpacity></View></View></>}
    {step === 1 && <><Text style={styles.section}>DI CHUYỂN TỚI ĐIỂM TẬP TRUNG</Text><View style={styles.card}><InfoRow icon="location-outline" label="Điểm hẹn" value={task.location} /><Text style={styles.notice}>Sau khi nhận package, di chuyển tới điểm tập trung để xác nhận thông tin user.</Text><TouchableOpacity style={styles.primary} onPress={markArrivedAtPickup}><Ionicons name="location" size={18} color="#fff" /><Text style={styles.primaryText}>ĐÃ ĐẾN NƠI</Text></TouchableOpacity></View></>}
    {step === 2 && <><Text style={styles.section}>XÁC THỰC NGƯỜI NHẬN</Text><View style={styles.card}><InfoRow icon="person-outline" label="Người nhận" value={task.customer} /><InfoRow icon="location-outline" label="Điểm giao" value={task.location} /><TouchableOpacity style={[styles.qrBox, verified && styles.verified]} onPress={verifyByScan} disabled={isBusy || verified}><Ionicons name={verified ? 'checkmark-circle' : 'qr-code'} size={52} color={verified ? Colors.primaryDark : Colors.ink} /><Text style={styles.qrTitle}>{verified ? 'Đã xác minh' : isBusy ? 'Đang quét...' : 'Chạm để quét QR'}</Text><Text style={styles.muted}>{verified ? 'Người nhận hợp lệ' : 'Quét mất khoảng 1 giây, không xác minh ngay'}</Text></TouchableOpacity><View style={styles.otpRow}><TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="OTP 123456" placeholderTextColor={Colors.onSurfaceMuted} style={styles.input} /><TouchableOpacity style={styles.verifyButton} onPress={() => otp === '123456' ? setDeliveryVerified(true) : setFeedback({ title: 'OTP chưa đúng', message: 'Dùng mã mock 123456 để tiếp tục.' })}><Text style={styles.verifyText}>XÁC MINH</Text></TouchableOpacity></View></View></>}
    {step === 3 && <><Text style={styles.section}>DANH SÁCH THIẾT BỊ BÀN GIAO</Text><View style={styles.card}>{equipment.map((item, index) => { const itemState = fieldWorkflow.deliveryItems[index] ?? { status: 'PENDING' as DeliveryItemStatus, note: '' }; return <View key={item} style={styles.itemBlock}><Text style={styles.checkLabel}>{item}</Text><View style={styles.statusRow}>{(['OK', 'MISSING', 'DAMAGED'] as DeliveryItemStatus[]).map(status => <TouchableOpacity key={status} style={[styles.statusButton, itemState.status === status && styles.statusSelected]} onPress={() => setItemStatus(index, status)}><Text style={styles.statusText}>{statusLabels[status]}</Text></TouchableOpacity>)}</View>{(itemState.status === 'MISSING' || itemState.status === 'DAMAGED') && <TextInput value={itemState.note} onChangeText={note => setDeliveryItem(index, itemState.status, note)} placeholder="Nhập ghi chú bắt buộc" placeholderTextColor={Colors.onSurfaceMuted} style={styles.noteInput} />}</View>; })}<Text style={styles.notice}>{allItemsReviewed ? 'Đã kiểm đủ và ghi chú các món bất thường.' : 'Hãy đánh dấu từng món; thiếu hoặc hư hỏng phải có ghi chú.'}</Text></View></>}
    {step === 4 && <><Text style={styles.section}>BẰNG CHỨNG GIAO HÀNG</Text><View style={styles.card}><TouchableOpacity style={[styles.upload, photoUri && styles.verified]} onPress={() => setPhotoMenu(true)}><Ionicons name={photoUri ? 'checkmark-circle' : 'camera-outline'} size={28} color={Colors.primaryDark} />{photoUri && !photoUri.startsWith('mock://') && <Image source={{ uri: photoUri }} style={styles.photo} />}<Text style={styles.uploadTitle}>{photoUri ? 'Đã có ảnh bàn giao' : 'Chụp ảnh bàn giao'}</Text><Text style={styles.muted}>Camera hoặc thư viện ảnh</Text></TouchableOpacity><TouchableOpacity style={styles.demoProof} onPress={() => setDeliveryPhoto('mock://delivery-proof')}><Ionicons name="sparkles-outline" size={18} color={Colors.primaryDark} /><Text style={styles.demoProofText}>Dùng ảnh demo để test</Text></TouchableOpacity><TouchableOpacity style={[styles.signature, signed && styles.verified]} onPress={() => setDeliverySigned(!signed)}><Text style={styles.signatureTitle}>Chữ ký người nhận</Text><Text style={styles.signatureLine}>{signed ? 'Nguyễn Tuấn Anh · Đã xác nhận' : 'Chạm để xác nhận chữ ký mock'}</Text></TouchableOpacity></View></>}
    <TouchableOpacity disabled={isBusy || step === 1} style={[styles.primary, (isBusy || step === 1) && styles.disabled]} onPress={next}><Text style={styles.primaryText}>{isBusy ? 'ĐANG XỬ LÝ...' : step === 4 ? 'XÁC NHẬN HOÀN TẤT' : step === 1 ? 'BẤM ĐÃ ĐẾN NƠI Ở TRÊN' : 'TIẾP TỤC'}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity>
  </ScrollView>
    <Modal visible={photoMenu} transparent animationType="slide" onRequestClose={() => setPhotoMenu(false)}><Pressable style={styles.backdrop} onPress={() => setPhotoMenu(false)}><View style={styles.menu}><Text style={styles.menuTitle}>Thêm ảnh bằng chứng</Text><TouchableOpacity style={styles.menuAction} onPress={() => capture('camera')}><Ionicons name="camera" size={22} color={Colors.primaryDark} /><Text style={styles.menuText}>Mở camera và chụp ảnh</Text></TouchableOpacity><TouchableOpacity style={styles.menuAction} onPress={() => capture('library')}><Ionicons name="images" size={22} color={Colors.primaryDark} /><Text style={styles.menuText}>Chọn từ thư viện ảnh</Text></TouchableOpacity></View></Pressable></Modal>
    <FieldModal visible={complete} title="Bàn giao thành công" message={`Task ${task.id} đã được hoàn tất và đồng bộ.`} icon="checkmark-circle" actionLabel="Về dashboard" onAction={() => { setComplete(false); router.replace('/field-operations'); }} onClose={() => setComplete(false)} />
    <FieldModal visible={feedback !== null} title={feedback?.title ?? ''} message={feedback?.message ?? ''} icon="information-circle" tone="warning" actionLabel="Đã hiểu" onAction={() => setFeedback(null)} onClose={() => setFeedback(null)} />
  </SafeAreaView>;
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.info}><Ionicons name={icon} size={18} color={Colors.primaryDark} /><View><Text style={styles.muted}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.surface }, content: { padding: 20, paddingBottom: 35 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, headerTitle: { color: Colors.ink, fontSize: 17, fontWeight: '800' }, taskHeader: { backgroundColor: Colors.inverseSurface, padding: 18, borderRadius: Radius.md, marginBottom: 20 }, taskId: { color: Colors.primary, fontSize: 11, fontWeight: '800' }, title: { color: '#fff', fontSize: 23, fontWeight: '800', marginTop: 7 }, meta: { color: '#bed0bb', fontSize: 13, marginTop: 8 }, steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }, step: { alignItems: 'center', width: '32%' }, stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }, stepDone: { backgroundColor: Colors.primaryDark }, stepNumber: { color: Colors.onSurfaceMuted, fontWeight: '800', fontSize: 12 }, stepLabel: { color: Colors.onSurfaceMuted, fontSize: 10, textAlign: 'center', marginTop: 6 }, stepLabelActive: { color: Colors.primaryDark, fontWeight: '800' }, section: { color: Colors.onSurfaceMuted, fontSize: 11, fontWeight: '800', letterSpacing: .8, marginBottom: 10 }, card: { backgroundColor: '#fff', padding: 17, borderRadius: Radius.md, marginBottom: 18, ...Shadows.card }, info: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, muted: { color: Colors.onSurfaceMuted, fontSize: 12 }, infoValue: { color: Colors.ink, fontSize: 15, fontWeight: '700', marginTop: 3 }, qrBox: { alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, padding: 18, borderRadius: Radius.sm }, verified: { backgroundColor: '#e9f4de' }, qrTitle: { color: Colors.ink, fontWeight: '800', marginTop: 8 }, otpRow: { flexDirection: 'row', gap: 9, marginTop: 14 }, input: { flex: 1, borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: Radius.sm, padding: 13, color: Colors.ink }, verifyButton: { justifyContent: 'center', backgroundColor: Colors.primaryDark, borderRadius: Radius.sm, paddingHorizontal: 13 }, verifyText: { color: '#fff', fontSize: 11, fontWeight: '800' }, itemBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, checkLabel: { color: Colors.ink, fontSize: 14, fontWeight: '700' }, statusRow: { flexDirection: 'row', gap: 6, marginTop: 9 }, statusButton: { borderWidth: 1, borderColor: Colors.surfaceContainerHighest, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 7 }, statusSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, statusText: { color: Colors.ink, fontSize: 10, fontWeight: '700' }, noteInput: { borderWidth: 1, borderColor: Colors.error, borderRadius: 7, padding: 9, color: Colors.ink, marginTop: 8 }, notice: { color: Colors.body, backgroundColor: '#fff5d7', padding: 12, borderRadius: 8, marginTop: 15, fontSize: 12 }, upload: { alignItems: 'center', padding: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primaryDark, borderRadius: Radius.sm }, demoProof: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 11, marginTop: 10, borderRadius: 8, backgroundColor: '#eaf5e1' }, demoProofText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '800' }, photo: { width: '100%', height: 150, borderRadius: 8, marginTop: 10 }, uploadTitle: { color: Colors.primaryDark, fontWeight: '800', marginTop: 8 }, signature: { padding: 14, marginTop: 14, borderRadius: 8, backgroundColor: Colors.surfaceContainerLow }, signatureTitle: { color: Colors.onSurfaceMuted, fontSize: 12 }, signatureLine: { color: Colors.ink, fontSize: 15, marginTop: 12 }, primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primaryDark, padding: 15, borderRadius: Radius.sm }, disabled: { opacity: .6 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 }, backdrop: { flex: 1, backgroundColor: 'rgba(14,15,12,.45)', justifyContent: 'flex-end' }, menu: { backgroundColor: Colors.surface, padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, menuTitle: { color: Colors.ink, fontSize: 19, fontWeight: '800', marginBottom: 12 }, menuAction: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer }, menuText: { color: Colors.ink, fontSize: 15, fontWeight: '700' } });
