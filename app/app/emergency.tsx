import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, NotBuilt, Txt } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';
import { COLORS, PALETTES } from '../components/theme';
import { thud } from '../components/haptic';
import { t, type StringKey } from '../lib/strings';
import { useApp } from '../lib/store';
import { script911 } from '../lib/rules';
import { tryStudent } from '../lib/safe';
import { speak, stopSpeaking } from '../lib/speak';
import { build911Sentence } from '../lib/student/sentence911';
import { pick, type Person } from '../lib/types';

type Step = 'situation' | 'who' | 'breathing' | 'steps' | '911';

const SITUATIONS: { id: string; key: StringKey; emoji: string; color: string }[] = [
  { id: 'tornado', key: 'sTornado', emoji: '🌪️', color: COLORS.sky },
  { id: 'allergic', key: 'sAllergic', emoji: '🤧', color: COLORS.pink },
  { id: 'not-breathing', key: 'sNotBreathing', emoji: '😮‍💨', color: COLORS.sky },
  { id: 'fall', key: 'sFall', emoji: '🤕', color: COLORS.sun },
  { id: 'swallowed', key: 'sSwallowed', emoji: '💊', color: COLORS.mint },
  { id: 'fire', key: 'sFire', emoji: '🔥', color: COLORS.orange },
];
const AVATAR: Record<Person['role'], string> = { kid: '🧒', grandparent: '🧓', parent: '🧑' };

export default function Emergency() {
  const router = useRouter();
  const { household, session, person } = useApp();
  const lang = session.lang;
  const mode = session.mode ?? 'grandparent';
  const P = PALETTES[mode];
  const [step, setStep] = useState<Step>('situation');
  const [situation, setSituation] = useState<string>('');
  const [patient, setPatient] = useState<Person | null>(null);
  const [stepsSeen, setStepsSeen] = useState(false);

  const back = () => {
    stopSpeaking();
    const order: Step[] = ['situation', 'who', 'breathing', 'steps', '911'];
    const i = order.indexOf(step);
    if (i <= 0) return router.back();
    // breathing is only for allergic reactions
    const prev = order[i - 1] === 'breathing' && situation !== 'allergic' ? 'who' : order[i - 1];
    setStep(prev);
  };

  const tornadoPlan = household.plan.find((e) => e.id === 'tornado');
  const stepsText = situation === 'tornado'
    ? (tornadoPlan ? pick(tornadoPlan.text, lang) : t(lang, 'noTornadoSteps'))
    : patient
      ? situation === 'allergic' && patient.allergySteps
        ? pick(patient.allergySteps, lang)
        : t(lang, 'emNoSteps', { name: patient.name })
      : '';

  const go911 = () => setStep('911');

  // The 911 sentence is built by the decision function, always in English, never by AI.
  const sentence = (() => {
    if (!patient) return null;
    const caller = person ?? patient;
    return tryStudent(() => build911Sentence(caller, patient, situation, household.address, script911));
  })();

  return (
    <Screen mode={mode} show911={mode !== 'parent' && step !== '911' && step !== 'steps'} onBack={back}>
      {step === 'situation' && (
        <>
          <PipSays color={COLORS.white} text={t(lang, 'emWhat')} mood="worried" />
          {SITUATIONS.map((s, i) => (
            <BigButton key={s.id} emoji={s.emoji} label={t(lang, s.key)} color={s.color} fontSize={P.btnText} height={P.btnH - 12} delay={i * 70}
              onPress={() => {
                setSituation(s.id);
                if (s.id === 'tornado') {
                  setPatient(household.people[0] ?? null);
                  setStepsSeen(false);
                  setStep('steps');
                } else {
                  setStep('who');
                }
              }} />
          ))}
        </>
      )}

      {step === 'who' && (
        <>
          <PipSays color={COLORS.white} text={t(lang, 'emWho')} />
          {household.people.map((p, i) => (
            <BigButton key={p.id} emoji={AVATAR[p.role]} label={p.name} sub={`${p.age}`} color={[COLORS.sun, COLORS.mint, COLORS.sky, COLORS.pink][i % 4]}
              fontSize={P.btnText} height={P.btnH - 12} delay={i * 70}
              onPress={() => { setPatient(p); setStepsSeen(false); setStep(situation === 'allergic' ? 'breathing' : 'steps'); }} />
          ))}
        </>
      )}

      {step === 'breathing' && (
        <>
          <PipSays color={COLORS.white} text={t(lang, 'emBreathing')} mood="worried" />
          <BigButton emoji="😮‍💨" label={t(lang, 'yes')} color={COLORS.tomato} textColor={COLORS.white} fontSize={P.btnText} height={P.btnH} onPress={() => { thud(); setStep('steps'); }} />
          <BigButton emoji="🙂" label={t(lang, 'no')} color={COLORS.mint} fontSize={P.btnText} height={P.btnH} delay={90} onPress={() => setStep('steps')} />
        </>
      )}

      {step === 'steps' && patient && (
        <>
          <PipSays color={COLORS.white} text={t(lang, 'emSteps')} />
          <Card>
            {/* one numbered step per line */}
            <Txt size={P.body + 2} weight="semi">{stepsText.replace(/\s+(?=\d+\.\s)/g, '\n')}</Txt>
            <SpeakButton text={stepsText} lang={lang} />
          </Card>
          <BigButton emoji="🚨" label={t(lang, 'call911')} sub={t(lang, 'dialerOnly')} color={COLORS.tomato} textColor={COLORS.white}
            fontSize={P.btnText} height={P.btnH - 12} onPress={() => Linking.openURL('tel:911')} />
          <BigButton emoji="➡️" label={t(lang, 'emNext')} color="#1F5FD1" textColor={COLORS.white} fontSize={P.btnText} height={P.btnH - 12}
            onPress={() => { setStepsSeen(true); speak(stepsText, lang); go911(); }} />
        </>
      )}

      {step === '911' && patient && (
        <>
          <PipSays color={COLORS.tomato} text={t(lang, 'em911')} mood="worried" />
          <Card color="#261E10" borderColor={COLORS.sun}>
            {sentence && sentence.ok ? (
              <>
                <Txt size={P.body + 2} weight="bold" color="#FDE68A">{sentence.value}</Txt>
                <SpeakButton text={sentence.value} lang="en" uiLang={lang} color="#FDE68A" />
              </>
            ) : sentence && sentence.notBuilt ? (
              <NotBuilt label={`build911Sentence: ${t('en', 'notBuilt')}`} />
            ) : (
              <Txt size={P.body} color="#EF4444">Unable to build 911 sentence.</Txt>
            )}
          </Card>
          <BigButton emoji="🚨" label={t(lang, 'call911')} sub={t(lang, 'dialerOnly')} color={COLORS.tomato} textColor={COLORS.white}
            fontSize={P.btnText} height={P.btnH} onPress={() => Linking.openURL('tel:911')} />

          {situation === 'allergic' && !stepsSeen && (
            <BigButton emoji="📋" label={t(lang, 'seeSteps')} color={COLORS.sun} fontSize={22} height={64} onPress={() => setStep('steps')} />
          )}
          <BigButton emoji="📞" label={t(lang, 'emDone')} color={COLORS.mint} fontSize={P.btnText} height={P.btnH - 12} onPress={() => router.push('/family-call' as never)} />
          <BigButton emoji="🏠" label={t(lang, 'doneReturn')} color="#162840" textColor="#F8FAFC" fontSize={18} height={54} onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
