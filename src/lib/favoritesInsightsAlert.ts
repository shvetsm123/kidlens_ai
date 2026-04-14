import { Alert } from 'react-native';

const TITLE = 'Favorites are part of Insights';
const MESSAGE = 'Save products you want to come back to with the Insights plan.';

export function showFavoritesInsightsUpsell(onViewPlans: () => void) {
  Alert.alert(TITLE, MESSAGE, [
    { text: 'Close', style: 'cancel' },
    { text: 'View plans', onPress: onViewPlans },
  ]);
}
