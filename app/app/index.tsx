import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { ReadinessBar } from '../components/ReadinessBar';
import { Card, Chip, Row, Txt } from '../components/ui';
import { COLORS } from '../components/theme';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import type { Lang, Mode, Person } from '../lib/types';

const ROUTE: Record<Mode, string> = { kid: '/kid', grandparent: '/grandparent', parent: '/parent' };
const AVATAR: Record<Person['role'], string> = { kid: '🧒', grandparent: '🧓', parent: '🧑' };

export default function Who() {
  const router = useRouter();
  const { household, session, setSession, person, loadDemo, resetAll } = useApp();
  const lang = session.lang;
  const [picking, setPicking] = useState<Mode | null>(null);
  // Home always opens in English; picking a person still switches to their own language.
  useFocusEffect(useCallback(() => { setSession({ lang: 'en' }); }, [setSession]));

  const go = (mode: Mode, p: Person | null) => {
    setSession({ mode, personId: p?.id ?? null, lang: p?.language ?? lang });
    setPicking(null);
    router.push(ROUTE[mode] as never);
  };

  const chooseMode = (mode: Mode) => {
    if (household.people.length === 0 && mode !== 'parent') {
      Alert.alert(
        t(lang, 'noPlanModalTitle'),
        t(lang, 'noPlanModalBody'),
        [
          { text: t(lang, 'setupPlanBtn'), onPress: () => go('parent', null) },
          { text: t(lang, 'loadDemoBtn'), onPress: loadDemo },
        ]
      );
      return;
    }

    const people = household.people.filter((p) => p.role === mode);
    if (people.length > 1) setPicking(mode);
    else go(mode, people[0] ?? null);
  };

  const people = picking ? household.people.filter((p) => p.role === picking) : [];
  const hasPlan = household.people.length > 0;

  return (
    <Screen mode="home" noBack>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
        <Txt size={14} weight="bold" color="#64748B">TX-31 CONGRESSIONAL ENTRY</Txt>
        <Row>
          {(['en', 'es'] as Lang[]).map((l) => (
            <Chip key={l} label={l === 'en' ? 'English' : 'Español'} selected={lang === l} onPress={() => setSession({ lang: l })} color={COLORS.sky} />
          ))}
        </Row>
      </Row>

      <PipSays text={hasPlan ? t(lang, 'whoHi') : t(lang, 'loadDemoPrompt')} />
      <Txt size={32} weight="bold" color="#F8FAFC" style={{ marginBottom: 4 }}>{t(lang, 'whoTitle')}</Txt>
      <Txt size={15} weight="medium" color="#94A3B8" style={{ marginBottom: 14 }}>{t(lang, 'whoSub')}</Txt>

      {hasPlan ? (
        <>
          <ReadinessBar />
          <View style={{
            backgroundColor: '#0D261A',
            borderWidth: 1,
            borderColor: '#059669',
            borderRadius: 10,
            paddingVertical: 6,
            paddingHorizontal: 10,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Txt size={14}>🏛️</Txt>
            <Txt size={12} weight="semi" color="#6EE7B7" style={{ marginLeft: 6, flex: 1 }}>
              {t(lang, 'autoLoadedBanner')}
            </Txt>
          </View>
        </>
      ) : (
        <Card delay={100} color="#162840" borderColor={COLORS.sun}>
          <Txt size={20} weight="bold" color="#FCD34D">⚠️ {t(lang, 'noFamilyYet')}</Txt>
          <Txt size={15} weight="medium" color="#CBD5E1" style={{ marginVertical: 8, lineHeight: 21 }}>
            {t(lang, 'noPlanModalBody')}
          </Txt>
          <View style={{ height: 6 }} />
          <BigButton
            emoji="🎉"
            label={t(lang, 'loadDemoBtn')}
            sub={lang === 'es' ? '3005 CR 175, Leander • Carga 14 refugios y análisis de inundaciones' : '3005 CR 175, Leander • Auto-loads 14 shelters, food banks & flood detours'}
            color={COLORS.mint}
            height={68}
            fontSize={20}
            onPress={loadDemo}
            style={{ marginBottom: 10 }}
          />

          <BigButton
            emoji="🛠️"
            label={t(lang, 'setupPlanBtn')}
            color={COLORS.grape}
            textColor="#FFFFFF"
            height={56}
            fontSize={18}
            onPress={() => go('parent', null)}
            style={{ marginBottom: 0 }}
          />
        </Card>
      )}

      {picking ? (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Txt size={22} weight="bold" color="#F8FAFC" style={{ marginBottom: 12 }}>{t(lang, 'whichOne')}</Txt>
          {people.map((p, i) => (
            <BigButton
              key={p.id}
              emoji={AVATAR[p.role]}
              label={p.name}
              sub={p.age ? t(lang, 'ageLabel', { n: p.age }) : undefined}
              color={[COLORS.sun, COLORS.pink, COLORS.mint, COLORS.sky][i % 4]}
              delay={i * 80}
              onPress={() => go(picking, p)}
            />
          ))}
          <BigButton label={t(lang, 'back')} emoji="⬅️" color="#1A2D47" textColor="#F8FAFC" height={56} fontSize={18} onPress={() => setPicking(null)} />
        </MotiView>
      ) : (
        <>
          <BigButton
            emoji="🧒"
            label={t(lang, 'kid')}
            sub={t(lang, 'kidCardSub')}
            color={COLORS.sun}
            height={90}
            fontSize={28}
            delay={0}
            onPress={() => chooseMode('kid')}
          />
          <BigButton
            emoji="👵"
            label={t(lang, 'grandparent')}
            sub={t(lang, 'gpCardSub')}
            color={COLORS.sky}
            height={90}
            fontSize={28}
            delay={80}
            onPress={() => chooseMode('grandparent')}
          />
          <BigButton
            emoji="👩"
            label={t(lang, 'parent')}
            sub={t(lang, 'parentCardSub')}
            color={COLORS.grape}
            textColor="#FFFFFF"
            height={90}
            fontSize={28}
            delay={160}
            onPress={() => chooseMode('parent')}
          />

          {session.mode && person && hasPlan ? (
            <BigButton
              emoji="⚡"
              label={`${t(lang, 'continueAs')} ${person.name}`}
              sub={t(lang, person.role)}
              color="#1E3352"
              textColor="#F8FAFC"
              height={62}
              fontSize={18}
              delay={240}
              onPress={() => go(session.mode as Mode, person)}
            />
          ) : null}

          <Row style={{ justifyContent: 'center', marginTop: 8, gap: 10 }}>
            <Chip emoji="🔍" label={t(lang, 'openRules')} color={COLORS.navyCard} onPress={() => router.push('/rules' as never)} />
            <Chip emoji="📒" label={t(lang, 'openLog')} color={COLORS.navyCard} onPress={() => router.push('/log' as never)} />
            {hasPlan && (
              <Chip emoji="🔄" label={t(lang, 'pReset')} color={COLORS.navyCard} onPress={() => Alert.alert(t(lang, 'pReset'), t(lang, 'pResetAsk'), [{ text: t(lang, 'pCancel') }, { text: t(lang, 'pErase'), style: 'destructive', onPress: resetAll }])} />
            )}
          </Row>
        </>
      )}
    </Screen>
  );
}
