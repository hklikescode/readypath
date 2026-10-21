import React from 'react';
import { View } from 'react-native';
import { COLORS, INK } from './theme';
import { Txt } from './ui';
import { OUTCOME_KEY, wasSkipped, type Outcome } from '../lib/aiLog';
import { t } from '../lib/strings';
import type { Lang } from '../lib/types';

// A small label that says whether the AI was used or skipped, and why.
export function AiBadge({ outcome, lang }: { outcome: Outcome; lang: Lang }) {
  const skipped = wasSkipped(outcome);
  return (
    <View style={{
      alignSelf: 'flex-start', backgroundColor: skipped ? COLORS.sun : outcome === 'answered' ? COLORS.mint : COLORS.pink,
      borderWidth: 2.5, borderColor: INK, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10,
    }}>
      <Txt size={14} weight="bold">{skipped ? '⏭️' : outcome === 'answered' ? '🤖' : '🛡️'} {t(lang, OUTCOME_KEY[outcome])}</Txt>
    </View>
  );
}
