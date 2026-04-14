import { Modal, Platform, Pressable, Text, View } from 'react-native';

type UnknownScanModalProps = {
  visible: boolean;
  barcode: string;
  onClose: () => void;
  onTryAgain: () => void;
};

export function UnknownScanModal({ visible, barcode, onClose, onTryAgain }: UnknownScanModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      {...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {})}
      onRequestClose={onClose}
    >
      <View
        pointerEvents="auto"
        style={{
          flex: 1,
          backgroundColor: 'rgba(23, 18, 12, 0.44)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#FFFDF8',
            padding: 22,
            width: '100%',
            maxWidth: 360,
          }}
        >
          <Text style={{ fontSize: 13, color: '#8C7B6A', fontWeight: '600' }}>Scan result</Text>
          <Text style={{ marginTop: 14, fontSize: 26, lineHeight: 32, color: '#1F1A16', fontWeight: '700' }}>
            Unknown product
          </Text>
          <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: '#5D5246' }}>
            {"We couldn't identify this product yet."}
          </Text>
          <Text style={{ marginTop: 14, fontSize: 13, color: '#817363' }}>Barcode: {barcode || '-'}</Text>
          <View style={{ marginTop: 24, flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                borderRadius: 14,
                backgroundColor: '#EEE4D7',
                alignItems: 'center',
                paddingVertical: 13,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#5B4A38' }}>Close</Text>
            </Pressable>
            <Pressable
              onPress={onTryAgain}
              style={{
                flex: 1,
                borderRadius: 14,
                backgroundColor: '#2C251F',
                alignItems: 'center',
                paddingVertical: 13,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFDF9' }}>Try again</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
