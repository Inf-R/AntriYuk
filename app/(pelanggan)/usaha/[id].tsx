import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

export default function DetailUsahaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ScreenPlaceholder title="Detail Usaha" subtitle={id ? `ID Usaha: ${id}` : undefined} />;
}

