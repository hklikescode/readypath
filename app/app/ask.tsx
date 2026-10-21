import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _cb: any) => {};

try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule?.ExpoSpeechRecognitionModule;
  if (speechModule?.useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  }
} catch {
  // Native module not bundled in standard Expo Go; fallback safely
}

import { Screen, ScrollToHere } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, Field, NotBuilt, Txt } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';
import { COLORS, PALETTES } from '../components/theme';
import { warn, yay } from '../components/haptic';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import { dangerRules, cardText } from '../lib/rules';
import { speak } from '../lib/speak';
import { runPipeline } from '../lib/pipeline';
import { readerLevel } from '../lib/prompt';
import { askModel, isLoaded, loadModelIfInstalled } from '../lib/ai';
import { AiBadge } from '../components/AiBadge';
import { SheltersCard } from '../components/SheltersCard';
import type { PlaceCategory } from '../lib/types';
import type { Outcome } from '../lib/aiLog';
import { pick, type DangerRule } from '../lib/types';

type Result =
  | { kind: 'danger'; rule: DangerRule }
  | { kind: 'noplan' }
  | {
      kind: 'answer';
      text: string;
      from: string;
      outcome: Outcome;
      systemPrompt?: string;
      planContext?: string;
    };

export default function Ask() {
  const { household, session, addLog, person } = useApp();
  const router = useRouter();
  const lang = session.lang;
  const mode = session.mode ?? 'grandparent';
  const P = PALETTES[mode];
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [showGuardrail, setShowGuardrail] = useState(false);
  const [dangerNotBuilt, setDangerNotBuilt] = useState(false);
  const [checkNotBuilt, setCheckNotBuilt] = useState(false);

  // Voice input is optional. Typing always works.
  if (ExpoSpeechRecognitionModule) {
    useSpeechRecognitionEvent('result', (e: any) => {
      const said = e.results?.[0]?.transcript ?? '';
      if (said) setText(said);
      if (e.isFinal && said) { setListening(false); handle(said); }
    });
    useSpeechRecognitionEvent('end', () => setListening(false));
    useSpeechRecognitionEvent('error', () => { setListening(false); setVoiceMsg(t(lang, 'voiceUnavailable')); });
  }

  const startMic = async () => {
    setVoiceMsg('');
    if (!ExpoSpeechRecognitionModule) {
      setVoiceMsg(t(lang, 'voiceUnavailable'));
      return;
    }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setVoiceMsg(t(lang, 'voiceUnavailable')); return; }
      setListening(true);
      const onDeviceSupported = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() ?? false;
      ExpoSpeechRecognitionModule.start({
        lang: lang === 'es' ? 'es-US' : 'en-US',
        interimResults: true,
        requiresOnDeviceRecognition: onDeviceSupported,
      });
    } catch {
      setListening(false);
      setVoiceMsg(t(lang, 'voiceUnavailable'));
    }
  };

  // The order matters: 1) danger check  2) find plan entries  3) AI  4) block made-up numbers.
  async function handle(question: string) {
    if (!question.trim() || busy) return;
    Keyboard.dismiss(); // the keyboard must not cover the answer
    setBusy(true);
    setResult(null);
    setDangerNotBuilt(false);
    setCheckNotBuilt(false);
    try {
      const r = await runPipeline(question, {
        household, lang, age: person?.age,
        ai: { ready: async () => { if (!isLoaded()) await loadModelIfInstalled(); return isLoaded(); }, ask: askModel },
      });
      setDangerNotBuilt(r.dangerNotBuilt);
      if (r.kind === 'danger') {
        setResult({ kind: 'danger', rule: r.rule });
        addLog({ mode, lang, question, outcome: 'skipped-danger', ruleId: r.rule.id });
        warn();
        speak(r.rule.message[lang], lang);
        return;
      }
      if (r.kind === 'noplan') {
        setResult({ kind: 'noplan' });
        addLog({ mode, lang, question, outcome: 'skipped-no-plan' });
        speak(t(lang, 'planDoesntSay'), lang);
        return;
      }
      setCheckNotBuilt(r.checkNotBuilt);
      if (r.outcome === 'answered') yay();
      setResult({ kind: 'answer', text: r.text, from: r.from, outcome: r.outcome, systemPrompt: r.systemPrompt, planContext: r.planContext });
      addLog({ mode, lang, question, outcome: r.outcome, entries: r.entries.map((e) => e.id), raw: r.raw?.slice(0, 400) });
      speak(r.text, lang);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen mode={session.mode ?? 'grandparent'} show911={session.mode !== 'parent'}>
      <PipSays color={COLORS.white} text={`${t(lang, 'askTitle')}. ${t(lang, 'askHint')}`} />

      <BigButton
        emoji={listening ? '👂' : '🎤'}
        label={listening ? t(lang, 'micListening') : t(lang, 'micStart')}
        color={listening ? COLORS.pink : '#1F5FD1'}
        textColor={COLORS.white}
        fontSize={P.btnText}
        height={P.btnH}
        onPress={startMic}
      />
      {voiceMsg ? <Txt size={16} color="#B3261E" style={{ marginBottom: 8 }}>{voiceMsg}</Txt> : null}

      <Field label={t(lang, 'typeHere')} value={text} onChangeText={setText} multiline style={{ fontSize: P.body - 4 }} />
      <BigButton emoji="✨" label={t(lang, 'send')} color={COLORS.mint} fontSize={24} height={68} onPress={() => handle(text)} />

      {busy && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <ActivityIndicator size="large" color="#1F5FD1" />
          <Txt size={P.body - 4} weight="medium">{t(lang, 'thinking')}</Txt>
        </View>
      )}
      <ScrollToHere when={result} />
      {dangerNotBuilt && <NotBuilt label={t(lang, 'dangerBuiltLabel')} />}
      {checkNotBuilt && <NotBuilt label={t(lang, 'answerCheckLabel')} />}

      {result?.kind === 'danger' && (
        <Card color="#2B1515" borderColor={COLORS.tomato}>
          <Txt size={26} weight="bold" color="#EF4444">🚨 {t(lang, 'dangerCardTitle')}</Txt>
          <Txt size={P.body} weight="semi" color="#F8FAFC" style={{ marginVertical: 8 }}>{cardText(result.rule, lang)}</Txt>
          <SpeakButton text={result.rule.message[lang]} lang={lang} color="#FFFFFF" />
          <AiBadge outcome="skipped-danger" lang={lang} />
          <Txt size={13} color="#94A3B8" style={{ marginBottom: 8, marginTop: 4 }}>{t(lang, 'logRule')}: {result.rule.id}</Txt>
          {result.rule.action === 'call911' && (
            <BigButton emoji="🚨" label={t(lang, 'call911')} color={COLORS.tomato} textColor={COLORS.white} height={70} fontSize={26} onPress={() => Linking.openURL('tel:911')} style={{ marginBottom: 0 }} />
          )}
          {result.rule.action === 'callPoison' && (
            <BigButton emoji="☎️" label={`${t(lang, 'poison')} 1-800-222-1222`} color={COLORS.tomato} textColor={COLORS.white} height={70} fontSize={22} onPress={() => Linking.openURL('tel:18002221222')} style={{ marginBottom: 0 }} />
          )}
        </Card>
      )}

      {result?.kind === 'noplan' && (
        <Card color="#261E10" borderColor={COLORS.sun}>
          <Txt size={P.body + 2} weight="bold" color="#FCD34D">{t(lang, 'planDoesntSay')}</Txt>
          <AiBadge outcome="skipped-no-plan" lang={lang} />
          <View style={{ height: 10 }} />
          <BigButton emoji="📞" label={t(lang, 'callFamily')} color={COLORS.mint} height={64} fontSize={22} onPress={() => router.push('/family-call' as never)} />
          <BigButton emoji="☎️" label={t(lang, 'call211')} color={COLORS.sky} height={64} fontSize={22} onPress={() => Linking.openURL('tel:211')} style={{ marginBottom: 0 }} />
        </Card>
      )}

      {result?.kind === 'answer' && (
        <Card>
          {/* Header clearly indicating AI vs Verified Plan */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: result.outcome === 'answered' ? '#0284C7' : '#059669',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#FFFFFF',
            }}>
              <Txt size={24}>{result.outcome === 'answered' ? '🤖' : '📖'}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={22} weight="bold" color={result.outcome === 'answered' ? '#38BDF8' : '#34D399'}>
                {result.outcome === 'answered' ? t(lang, 'aiSays') : t(lang, 'planSays')}
              </Txt>
              <Txt size={13} color="#94A3B8">
                {result.outcome === 'answered' ? t(lang, 'aiSubtitle') : t(lang, 'planSubtitle')}
              </Txt>
            </View>
          </View>

          {/* Answer text */}
          <Txt size={P.body} weight="medium" color="#F8FAFC" style={{ lineHeight: P.body * 1.35 }}>
            {result.text}
          </Txt>
          <SpeakButton text={result.text} lang={lang} color="#38BDF8" />

          {/* Citation badge */}
          <View style={{ backgroundColor: '#0F2E20', borderWidth: 1, borderColor: '#10B981', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 }}>
            <Txt size={P.body - 6} weight="bold" color="#6EE7B7">📖 {t(lang, 'from')}: {result.from}</Txt>
          </View>

          {/* How the AI was told to write for this reader (language + age) */}
          <View style={{ backgroundColor: '#0F2438', borderWidth: 1, borderColor: '#38BDF8', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 }}>
            <Txt size={P.body - 6} weight="bold" color="#7DD3FC">
              🗣️ {lang === 'es' ? 'Español' : 'English'} · {t(lang, readerLevel(person?.age) === 'kid' ? 'styleKid' : readerLevel(person?.age) === 'tween' ? 'styleTween' : 'styleAdult', { age: person?.age ?? '' })}
            </Txt>
          </View>

          <AiBadge outcome={result.outcome} lang={lang} />
          <Txt size={13} color="#94A3B8" style={{ marginTop: 8 }}>{t(lang, 'onPhoneOnly')}</Txt>

          {/* If question or answer relates to emergency shelters, food banks, or warming/cooling centers */}
          {(() => {
            const combined = `${result.from} ${result.text} ${text}`.toLowerCase();
            const isShelter = /shelter|refugio|food|alimento|comida|pantry|despensa|hurricane|hurac|tornado|freeze|fr[íi]o|warming|cooling|calor|calentamiento|enfriamiento/i.test(combined);
            if (!isShelter) return null;
            let cat: PlaceCategory = 'tornado';
            if (/food|alimento|comida|pantry|despensa/i.test(combined)) cat = 'food';
            else if (/hurricane|hurac/i.test(combined)) cat = 'hurricane';
            else if (/freeze|fr[íi]o|warming|calentamiento/i.test(combined)) cat = 'warming';
            else if (/heat|calor|cooling|enfriamiento/i.test(combined)) cat = 'cooling';
            return (
              <View style={{ marginTop: 12 }}>
                <SheltersCard lang={lang} initialCategory={cat} hideCategoryTabs />
              </View>
            );
          })()}

          {/* Guardrail prompt & input control section */}
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 }}>
            <BigButton
              emoji="🛡️"
              label={showGuardrail ? t(lang, 'guardrailToggleHide') : t(lang, 'guardrailToggleShow')}
              color={showGuardrail ? '#1E293B' : '#0F172A'}
              textColor="#38BDF8"
              fontSize={15}
              height={44}
              onPress={() => setShowGuardrail(!showGuardrail)}
              style={{ marginBottom: showGuardrail ? 10 : 0 }}
            />

            {showGuardrail && (
              <View style={{
                backgroundColor: '#0B132B',
                borderWidth: 1.5,
                borderColor: '#38BDF8',
                borderRadius: 14,
                padding: 12,
                marginTop: 6,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Txt size={18}>🛡️</Txt>
                  <Txt size={15} weight="bold" color="#38BDF8">
                    {t(lang, 'guardrailTitle')}
                  </Txt>
                </View>
                <Txt size={13} color="#CBD5E1" style={{ marginBottom: 8 }}>
                  {t(lang, 'guardrailDesc')}
                </Txt>

                {/* 3 Active Safety Controls */}
                <View style={{ backgroundColor: '#1E293B', borderRadius: 8, padding: 8, marginBottom: 8, gap: 4 }}>
                  <Txt size={12} color="#34D399">{t(lang, 'guardrailControl1')}</Txt>
                  <Txt size={12} color="#34D399">{t(lang, 'guardrailControl2')}</Txt>
                  <Txt size={12} color="#34D399">{t(lang, 'guardrailControl3')}</Txt>
                </View>

                {/* Exact prompt sent to AI */}
                {result.systemPrompt ? (
                  <View style={{ backgroundColor: '#020617', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#1E293B' }}>
                    <Txt size={11} weight="bold" color="#FCD34D" style={{ marginBottom: 4 }}>
                      {t(lang, 'guardrailSystemPrompt')}:
                    </Txt>
                    <Txt size={12} color="#E2E8F0" style={{ fontFamily: 'monospace' }}>
                      {result.systemPrompt}
                    </Txt>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </Card>
      )}

    </Screen>
  );
}
