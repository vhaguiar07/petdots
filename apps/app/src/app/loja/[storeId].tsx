import { useLocalSearchParams } from 'expo-router';

import { StoreScreen } from '@/spike/screens/store-screen';

export default function StoreRoute() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  return <StoreScreen storeId={storeId} />;
}
