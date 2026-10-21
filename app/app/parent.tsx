import React, { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, Chip, NotBuilt, Row, Txt } from '../components/ui';
import { Party } from '../components/Party';
import { COLORS, PALETTES } from '../components/theme';
import { yay } from '../components/haptic';
import { Section } from '../components/parent/Section';
import { ContactsEditor, CrossingsEditor, HomeEditor, ModelPanel, PeopleEditor, PlanEditor } from '../components/parent/Editors';
import { SheltersCard } from '../components/SheltersCard';
import { PlanShare } from '../components/parent/PlanShare';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import { checklistRules } from '../lib/rules';
import { tryStudent } from '../lib/safe';
import { runChecklist } from '../lib/student/checklist';
import type { Lang } from '../lib/types';

// A rule's fixScreen can be written several ways; map them to our sections.
const SECTION_FOR: Record<string, string> = {
  people: 'people', contacts: 'contacts', home: 'home', address: 'home', supplies: 'home',
  plan: 'plan', flood: 'plan', crossings: 'crossings', route: 'crossings', routeb: 'crossings', model: 'model',
};

export default function Parent() {
  const { household, session, setSession, updateHousehold, loadDemo, resetAll } = useApp();
  const lang = session.lang;
  const P = PALETTES.parent;
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [fixNonce, setFixNonce] = useState(0);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const result = tryStudent(() => runChecklist(household, checklistRules));
  const total = checklistRules.length;
  const readyCount = result.ok ? result.value.ready.length : 0;
  const allReady = result.ok && total > 0 && readyCount === total;

  const celebrated = useRef(false);
  const [party, setParty] = useState(false);
  useEffect(() => {
    if (allReady && !celebrated.current) { celebrated.current = true; setParty(true); yay(); }
    if (!allReady) celebrated.current = false;
  }, [allReady]);

  const confirmReset = () =>
    Alert.alert(t(lang, 'pReset'), t(lang, 'pResetAsk'), [
      { text: t(lang, 'pCancel'), style: 'cancel' },
      { text: t(lang, 'pErase'), style: 'destructive', onPress: resetAll },
    ]);

  const ruleLabel = (id: string) => checklistRules.find((r) => r.id === id)?.label[lang] ?? id;
  const fixFor = (id: string) => SECTION_FOR[(checklistRules.find((r) => r.id === id)?.fixScreen ?? '').toLowerCase()] ?? 'people';

  // Fix opens the right section. For people, it also opens the first person with a power device and no backup plan.
  const fix = (id: string) => {
    const section = fixFor(id);
    setFocusId(section === 'people' ? household.people.find((p) => (p.powerDevices?.length ?? 0) > 0 && !p.powerBackupPlan)?.id : undefined);
    setFixNonce((n) => n + 1);
    setOpen(section);
  };
  // After the fix chip is tapped: close the People section so the checklist (5 of 8 -> 6 of 8) is on screen.
  const fixed = () => { setFocusId(undefined); setOpen(null); };

  const common = { household, update: updateHousehold, lang };

  return (
    <Screen mode="parent">
      <Party fire={party} />
      <Row style={{ justifyContent: 'flex-end', marginBottom: 2 }}>
        {(['en', 'es'] as Lang[]).map((l) => (
          <Chip key={l} label={l === 'en' ? 'English' : 'Español'} selected={lang === l} onPress={() => setSession({ lang: l })} color={COLORS.sky} />
        ))}
      </Row>
      <PipSays text={t(lang, 'pTitle')} color={COLORS.mint} />

      {/* Checklist: always on top */}
      <Card color={allReady ? '#0D3325' : '#15253C'} borderColor={allReady ? COLORS.mint : COLORS.navyBorder}>
        <Txt size={22} weight="bold" color="#F8FAFC">✅ {t(lang, 'pChecklist')}</Txt>
        {result.ok ? (
          <>
            <Txt size={30} weight="bold" color={COLORS.mint} style={{ marginVertical: 6 }}>
              {t(lang, 'pReadyOf', { a: readyCount, b: total })}
            </Txt>
            <View style={{ height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#243D5C', backgroundColor: '#0A121E', overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ width: `${total ? (readyCount / total) * 100 : 0}%`, height: '100%', backgroundColor: COLORS.mint }} />
            </View>
            {allReady ? <Txt size={P.body} weight="semi" color={COLORS.mint}>🎉 {t(lang, 'pAllReady')}</Txt> : result.value.missing.map((id) => (
              <Row key={id} style={{ marginBottom: 8, alignItems: 'center' }}>
                <Txt size={15} weight="medium" color="#F8FAFC" style={{ flex: 1 }}>⚠️ {ruleLabel(id)}</Txt>
                <Chip label={t(lang, 'pFix')} color={COLORS.sun} onPress={() => fix(id)} />
              </Row>
            ))}
          </>
        ) : result.notBuilt ? (
          <NotBuilt label={`runChecklist: ${t('en', 'notBuilt')}`} />
        ) : null}
      </Card>


      <Section delay={60} emoji="👨‍👩‍👧" title={t(lang, 'pPeople')} open={open === 'people'} onToggle={() => toggle('people')}><PeopleEditor key={`${focusId ?? 'none'}-${fixNonce}`} {...common} focusId={focusId} onFixed={fixed} /></Section>
      <Section delay={100} emoji="📞" title={t(lang, 'pContacts')} open={open === 'contacts'} onToggle={() => toggle('contacts')}><ContactsEditor {...common} /></Section>
      <Section delay={140} emoji="🏠" title={t(lang, 'pHome')} open={open === 'home'} onToggle={() => toggle('home')}><HomeEditor {...common} /></Section>
      <Section delay={180} emoji="📋" title={t(lang, 'pPlan')} open={open === 'plan'} onToggle={() => toggle('plan')}><PlanEditor {...common} /></Section>
      <Section delay={220} emoji="🌊" title={t(lang, 'pCrossings')} open={open === 'crossings'} onToggle={() => toggle('crossings')}><CrossingsEditor {...common} /></Section>
      <Section delay={240} emoji="🏛️" title={t(lang, 'sheltersTitle')} open={open === 'shelters'} onToggle={() => toggle('shelters')}>
        <SheltersCard lang={lang} initialCategory="tornado" />
      </Section>
      <Section delay={250} emoji="📤" title="Share with family" open={open === 'share'} onToggle={() => toggle('share')}><PlanShare /></Section>
      <Section delay={260} emoji="🧠" title={t(lang, 'pModel')} open={open === 'model'} onToggle={() => toggle('model')}><ModelPanel lang={lang} /></Section>
      <Section delay={290} emoji="🔍" title={t(lang, 'rulesTitle')} open={open === 'transparency'} onToggle={() => toggle('transparency')}>
        <BigButton emoji="🔍" label={t(lang, 'openRules')} color={COLORS.sky} height={56} fontSize={18} onPress={() => router.push('/rules' as never)} />
        <BigButton emoji="📒" label={t(lang, 'openLog')} color={COLORS.sun} height={56} fontSize={18} onPress={() => router.push('/log' as never)} style={{ marginBottom: 0 }} />
      </Section>
      <Section delay={300} emoji="🎪" title={t(lang, 'pDemo')} open={open === 'demo'} onToggle={() => toggle('demo')}>
        <BigButton emoji="🎉" label={t(lang, 'pLoadDemo')} color={COLORS.mint} height={56} fontSize={18} onPress={loadDemo} />
        <BigButton emoji="🧹" label={t(lang, 'pReset')} color={COLORS.white} height={56} fontSize={18} onPress={confirmReset} style={{ marginBottom: 0 }} />
      </Section>
      <Txt size={13} color="#94A3B8" align="center">{t(lang, 'pSaved')}</Txt>
    </Screen>
  );
}
