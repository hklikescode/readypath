import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from './theme';
import { Txt } from './ui';
import { useApp } from '../lib/store';
import { isLoaded } from '../lib/ai';
import { t } from '../lib/strings';

export function ReadinessBar({ minimal = false }: { minimal?: boolean }) {
  const { household, session } = useApp();
  const lang = session.lang;
  const address = household.address ? household.address.split(',')[0] : t(lang, 'rbNoPlan');
  const peopleCount = household.people.length;
  // Only say "AI active" when the model is really loaded.
  const [aiOn, setAiOn] = useState(isLoaded());
  useEffect(() => {
    const id = setInterval(() => setAiOn(isLoaded()), 1500);
    return () => clearInterval(id);
  }, []);

  if (minimal) {
    return (
      <View style={s.minimalWrap}>
        <View style={s.badge}>
          <View style={[s.dot, { backgroundColor: aiOn ? COLORS.mint : COLORS.sun }]} />
          <Txt size={13} weight="semi" color="#94A3B8">{aiOn ? t(lang, 'aiActive') : t(lang, 'aiPlanMode')}</Txt>
        </View>
        <View style={s.badge}>
          <Txt size={13} weight="semi" color="#94A3B8">📍 {address}</Txt>
        </View>
        <View style={s.badge}>
          <Txt size={13} weight="semi" color="#94A3B8">🛡️ {t(lang, 'rbZeroInternet')}</Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.liveStatus}>
          <View style={[s.dot, { backgroundColor: COLORS.mint }]} />
          <Txt size={13} weight="bold" color={COLORS.mint}>{t(lang, 'rbSystemReady')}</Txt>
        </View>
        <Txt size={13} weight="medium" color="#94A3B8">{t(lang, 'rbAirplane')}</Txt>
      </View>

      <View style={s.detailsRow}>
        <View style={s.col}>
          <Txt size={11} weight="bold" color="#64748B">{t(lang, 'rbDemoAddr')}</Txt>
          <Txt size={14} weight="semi" color="#F8FAFC" numberOfLines={1}>
            {peopleCount > 0 ? household.address.replace(/, TX.*$/, '') : t(lang, 'rbNoPlan')}
          </Txt>
        </View>
        <View style={s.divider} />
        <View style={s.col}>
          <Txt size={11} weight="bold" color="#64748B">{t(lang, 'rbCrossings')}</Txt>
          <Txt size={14} weight="semi" color="#38BDF8">
            {household.crossings.length > 0 ? t(lang, 'rbCrossingsCount', { n: household.crossings.length }) : t(lang, 'rbNone')}
          </Txt>
        </View>
      </View>
    </View>
  );

}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#111F33',
    borderWidth: 1.5,
    borderColor: '#223854',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2C42',
    paddingBottom: 6,
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: '#223854',
    marginHorizontal: 10,
  },
  minimalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#0D1726',
    borderWidth: 1,
    borderColor: '#1E314B',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
