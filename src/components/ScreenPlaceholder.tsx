import React from 'react';
import { Card, EmptyState, Screen } from '@/components/ui';

interface ScreenPlaceholderProps {
  title: string;
  subtitle?: string;
}

export function ScreenPlaceholder({ title, subtitle }: ScreenPlaceholderProps) {
  return (
    <Screen>
      <Card>
        <EmptyState title={title} description={subtitle} />
      </Card>
    </Screen>
  );
}
