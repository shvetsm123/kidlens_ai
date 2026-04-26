import { Text, View } from 'react-native';

import { getAppLanguage, t } from '../lib/i18n';

export function ScannerFrame() {
  const lang = getAppLanguage();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: '30%',
          alignSelf: 'center',
          width: '76%',
          height: '52%',
          borderRadius: 18,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.88)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
        }}
      />
      <Text
        style={{
          position: 'absolute',
          bottom: 120,
          alignSelf: 'center',
          color: '#F8F6F2',
          fontSize: 13,
          fontWeight: '600',
          textShadowColor: 'rgba(0, 0, 0, 0.45)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {t('frame.pointBarcode', lang)}
      </Text>
    </View>
  );
}
