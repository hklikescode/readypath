import React, { useState } from 'react';
import { Keyboard, Linking, Modal, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScrollToHere } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { Pip, PipSays } from '../components/Pip';
import { ReadinessBar } from '../components/ReadinessBar';
import { Card, Chip, Field, NotBuilt, Row, Txt } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';
import { SheltersCard } from '../components/SheltersCard';
import { COLORS, PALETTES } from '../components/theme';
import { warn } from '../components/haptic';
import { t, localLabel } from '../lib/strings';
import { useApp } from '../lib/store';
import { dangerRules, cardText } from '../lib/rules';
import { speak, stopSpeaking } from '../lib/speak';
import { runPipeline } from '../lib/pipeline';
import { readerLevel } from '../lib/prompt';
import { askModel, isLoaded, loadModelIfInstalled } from '../lib/ai';
import { AiBadge } from '../components/AiBadge';
import type { Outcome } from '../lib/aiLog';
import { pick, type DangerRule } from '../lib/types';

const P = PALETTES.kid;

const PRESETS = {
  en: [
    'Where is our tornado safe spot?',
    'Can we use the oven to get warm?',
    'Can we turn on the car in the garage?',
    "Can we bring the grill inside? It's cold.",
    'Can we drive through the water on the road?',
    'Where is the flashlight?',
    'What do we do in an earthquake?',
    'Grandpa is not breathing',
  ],
  es: [
    '¿Dónde está el lugar seguro para tornados?',
    '¿Podemos usar el horno para calentarnos?',
    '¿Podemos prender el carro en el garaje?',
    '¿Podemos meter la parrilla? Hace frío.',
    '¿Podemos manejar por el agua en el camino?',
    '¿Dónde está la linterna?',
    '¿Qué hacemos en un terremoto?',
    'El abuelo no respira',
  ],
};

type View_ = 'home' | 'safe' | 'do';
type Answer = { kind: 'rule'; rule: DangerRule } | { kind: 'plan'; title: string; text: string; id?: string; outcome: Outcome } | { kind: 'none' } | { kind: 'notBuilt' } | null;

export default function Kid() {
  const router = useRouter();
  const { household, person, session, addLog } = useApp();
  const lang = person?.language ?? session.lang;
  const [view, setView] = useState<View_>('home');
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<Answer>(null);
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<{ id?: string; title: string; text: string } | null>(null);

  const contacts = [...household.contacts].sort((a, b) => a.order - b.order).slice(0, 2);

  // Same pipeline and guardrails as the Ask screen: danger rules, plan notes only, AI with the age + language wrapper, number check.
  const ask = async (q: string) => {
    if (busy) return;
    Keyboard.dismiss(); // the keyboard must not cover the answer
    setBusy(true);
    setAnswer(null);
    try {
      const r = await runPipeline(q, {
        household, lang, age: person?.age,
        ai: { ready: async () => { if (!isLoaded()) await loadModelIfInstalled(); return isLoaded(); }, ask: askModel },
      });
      if (r.dangerNotBuilt) { setAnswer({ kind: 'notBuilt' }); return; }
      if (r.kind === 'danger') {
        setAnswer({ kind: 'rule', rule: r.rule });
        addLog({ mode: 'kid', lang, question: q, outcome: 'skipped-danger', ruleId: r.rule.id });
        warn();
        speak(r.rule.message[lang], lang);
        return;
      }
      if (r.kind === 'noplan') {
        setAnswer({ kind: 'none' });
        addLog({ mode: 'kid', lang, question: q, outcome: 'skipped-no-plan' });
        speak(t(lang, 'notSure'), lang);
        return;
      }
      const first = r.entries[0];
      setAnswer({ kind: 'plan', title: pick(first.title, lang), text: r.text, id: first.id, outcome: r.outcome });
      addLog({ mode: 'kid', lang, question: q, outcome: r.outcome, entries: r.entries.map((e) => e.id), raw: r.raw?.slice(0, 400) });
      speak(r.text, lang);
    } finally {
      setBusy(false);
    }
  };

  const openCard = (title: string, body: string, id?: string) => {
    setCard({ id, title, text: body });
    speak(body, lang);
  };

  const planCard = (id: string, titleKey: 'powerOut') => {
    const e = household.plan.find((p) => p.id === id);
    if (!e) return openCard(t(lang, titleKey), t(lang, 'noFamilyHelp'));
    openCard(pick(e.title, lang), pick(e.text, lang));
  };

  const dismiss = () => { stopSpeaking(); setAnswer(null); };

  return (
    <Screen mode="kid" show911 onBack={view === 'home' ? undefined : () => { setView('home'); setCard(null); setAnswer(null); }}>
      <ReadinessBar minimal />
      {view === 'home' && (
        <>
          <PipSays text={`${t(lang, 'kidHi', { name: person?.name ?? 'Leo' })} ${t(lang, 'kidSub')}`} />
          {contacts.map((c, i) => (
            <BigButton key={c.phone} emoji="📞" label={t(lang, 'fcCallTo', { name: localLabel(c.label, lang) })} sub={c.phone} color={i === 0 ? COLORS.mint : COLORS.sky}
              fontSize={P.btnText} height={P.btnH} delay={i * 90} onPress={() => Linking.openURL(`tel:${c.phone}`)} />
          ))}
          <BigButton emoji="🤔" label={t(lang, 'isItSafe')} sub={t(lang, 'isItSafeSub')} color={COLORS.grape} textColor={COLORS.white} fontSize={P.btnText} height={P.btnH} delay={200} onPress={() => setView('safe')} />
          <BigButton emoji="🔦" label={t(lang, 'whatDoIDo')} sub={t(lang, 'whatDoIDoSub')} color={COLORS.orange} fontSize={P.btnText} height={P.btnH} delay={300} onPress={() => setView('do')} />
        </>
      )}

      {view === 'safe' && (
        <>
          <PipSays text={t(lang, 'isItSafe')} color={COLORS.sky} />
          <Field label={t(lang, 'typeQuestion')} value={text} onChangeText={setText} placeholder="..." returnKeyType="send" onSubmitEditing={() => text.trim() && ask(text)} />
          <BigButton emoji="✨" label={t(lang, 'askPip')} color={COLORS.mint} height={64} fontSize={22} onPress={() => text.trim() && ask(text)} />
          <Txt size={18} weight="bold" color="#F8FAFC" style={{ marginBottom: 8 }}>{t(lang, 'presetsTitle')}</Txt>
          <Row style={{ marginBottom: 12 }}>
            {PRESETS[lang].map((q) => (
              <Chip key={q} size={16} style={{ paddingVertical: 10, paddingHorizontal: 14 }} label={q} color={COLORS.navyCardLight} onPress={() => { setText(q); ask(q); }} />
            ))}
          </Row>
          <ScrollToHere when={answer} />
          {answer?.kind === 'plan' && (
            <Card color="#15253C" borderColor={COLORS.mint} style={{ marginBottom: 12 }}>
              <Txt size={22} weight="bold" color="#6EE7B7" style={{ marginBottom: 6 }}>
                📖 {answer.title}
              </Txt>
              {answer.id === 'tornado' && (
                <View style={{ backgroundColor: '#102A45', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.sky, padding: 12, marginBottom: 12 }}>
                  <Txt size={16} weight="bold" color="#38BDF8" style={{ marginBottom: 6 }}>
                    🌪️ {lang === 'es' ? 'Pasos rápidos:' : 'Quick Steps:'}
                  </Txt>
                  <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Txt size={18}>🚪</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '1. Cuarto interior sin ventanas' : '1. Inside room with no windows'}
                    </Txt>
                  </Row>
                  <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Txt size={18}>👟</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '2. Zapatos puestos y teléfono en mano' : '2. Shoes on & take phone'}
                    </Txt>
                  </Row>
                  <Row style={{ alignItems: 'center' }}>
                    <Txt size={18}>🛡️</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '3. Cúbrete la cabeza' : '3. Cover your head'}
                    </Txt>
                  </Row>
                </View>
              )}
              <Txt size={P.body} weight="medium" color="#F8FAFC" style={{ lineHeight: P.body * 1.35, marginBottom: 10 }}>
                {answer.text}
              </Txt>
              <SpeakButton text={answer.text} lang={lang} />
              {/* How the AI was told to write for this child (language + age) */}
              <Txt size={14} weight="bold" color="#7DD3FC" style={{ marginTop: 8 }}>
                🗣️ {lang === 'es' ? 'Español' : 'English'} · {t(lang, readerLevel(person?.age) === 'kid' ? 'styleKid' : readerLevel(person?.age) === 'tween' ? 'styleTween' : 'styleAdult', { age: person?.age ?? '' })}
              </Txt>
              <AiBadge outcome={answer.outcome} lang={lang} />
              {(answer.id === 'tornado' || answer.id === 'food-bank' || answer.id === 'freeze' || answer.id === 'heat') && (
                <SheltersCard
                  lang={lang}
                  initialCategory={
                    answer.id === 'food-bank' ? 'food' :
                    answer.id === 'freeze' ? 'warming' :
                    answer.id === 'heat' ? 'cooling' : 'tornado'
                  }
                  inHomeNote={answer.id === 'tornado' ? answer.text : undefined}
                  hideCategoryTabs
                />
              )}
            </Card>
          )}
          {answer?.kind === 'none' && (
            <Card color="#162840" borderColor={COLORS.sun}><Txt size={20} weight="bold" color="#FCD34D">{t(lang, 'notSure')}</Txt></Card>
          )}
          {answer?.kind === 'notBuilt' && <NotBuilt label={`checkDanger: ${t('en', 'notBuilt')}`} />}
          <BigButton
            emoji="⬅️"
            label={`${t(lang, 'returnToMenu')} (${person?.name ?? 'Leo'})`}
            color="#162840"
            textColor="#F8FAFC"
            height={54}
            fontSize={18}
            onPress={() => { setView('home'); setCard(null); setAnswer(null); }}
            style={{ marginTop: 8 }}
          />
        </>
      )}


      {view === 'do' && (
        <>
          <PipSays text={t(lang, 'whatDoIDo')} color={COLORS.white} />
          {!card ? (
            <>
              <BigButton emoji="🌪️" label={t(lang, 'tornadoAlert')} color={COLORS.sky} fontSize={P.btnText} height={P.btnH}
                onPress={() => {
                  const tornado = household.plan.find((e) => e.id === 'tornado');
                  openCard(t(lang, 'tornadoAlert'), tornado ? pick(tornado.text, lang) : t(lang, 'noTornadoSteps'), 'tornado');
                }} />
              <BigButton emoji="🥫" label={t(lang, 'foodBanks')} color={COLORS.grape} textColor={COLORS.white} fontSize={P.btnText} height={P.btnH} delay={70}
                onPress={() => {
                  openCard(t(lang, 'foodBanks'), t(lang, 'sheltersSub'), 'food-bank');
                }} />
              <BigButton emoji="💡" label={t(lang, 'powerOut')} color={COLORS.sun} fontSize={P.btnText} height={P.btnH} delay={140}
                onPress={() => {
                  const heat = household.plan.find((e) => e.id === 'heat');
                  openCard(t(lang, 'powerOut'), heat ? pick(heat.text, lang) : t(lang, 'noFamilyHelp'), 'heat');
                }} />
              <BigButton emoji="❄️" label={t(lang, 'freezeAlert')} color={COLORS.mint} fontSize={P.btnText} height={P.btnH} delay={210}
                onPress={() => {
                  const freeze = household.plan.find((e) => e.id === 'freeze');
                  openCard(t(lang, 'freezeAlert'), freeze ? pick(freeze.text, lang) : t(lang, 'noFamilyHelp'), 'freeze');
                }} />
              <BigButton emoji="🌊" label={t(lang, 'waterRising')} color={COLORS.orange} fontSize={P.btnText} height={P.btnH} delay={280}
                onPress={() => {
                  const flood = household.floodPlan ?? household.plan.find((e) => e.id === 'flood')?.text ?? household.routeB ?? null;
                  openCard(t(lang, 'waterRising'), flood ? pick(flood, lang) : t(lang, 'noFloodSteps'));
                }} />
              <BigButton emoji="🩹" label={t(lang, 'someoneHurt')} color={COLORS.pink} fontSize={P.btnText} height={P.btnH} delay={320} onPress={() => router.push('/emergency' as never)} />
              <BigButton
                emoji="⬅️"
                label={`${t(lang, 'returnToMenu')} (${person?.name ?? 'Leo'})`}
                color="#162840"
                textColor="#F8FAFC"
                height={54}
                fontSize={18}
                onPress={() => { setView('home'); setCard(null); setAnswer(null); }}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <Card>
              <Txt size={26} weight="bold" style={{ marginBottom: 8 }}>{card.title}</Txt>
              {card.id === 'tornado' && (
                <View style={{ backgroundColor: '#102A45', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.sky, padding: 12, marginBottom: 12 }}>
                  <Txt size={16} weight="bold" color="#38BDF8" style={{ marginBottom: 6 }}>
                    🌪️ {lang === 'es' ? 'Pasos rápidos:' : 'Quick Steps:'}
                  </Txt>
                  <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Txt size={18}>🚪</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '1. Cuarto interior sin ventanas' : '1. Inside room with no windows'}
                    </Txt>
                  </Row>
                  <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Txt size={18}>👟</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '2. Zapatos puestos y teléfono en mano' : '2. Shoes on & take phone'}
                    </Txt>
                  </Row>
                  <Row style={{ alignItems: 'center' }}>
                    <Txt size={18}>🛡️</Txt>
                    <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                      {lang === 'es' ? '3. Cúbrete la cabeza' : '3. Cover your head'}
                    </Txt>
                  </Row>
                </View>
              )}
              <Txt size={P.body + 2} weight="medium" style={{ marginBottom: 10 }}>{card.text}</Txt>
              <SpeakButton text={card.text} lang={lang} />
              {(card.id === 'tornado' || card.id === 'food-bank' || card.id === 'freeze' || card.id === 'heat') && (
                <SheltersCard
                  lang={lang}
                  initialCategory={
                    card.id === 'food-bank' ? 'food' :
                    card.id === 'freeze' ? 'warming' :
                    card.id === 'heat' ? 'cooling' : 'tornado'
                  }
                  inHomeNote={card.id === 'tornado' ? card.text : undefined}
                  hideCategoryTabs
                />
              )}
              <BigButton label={t(lang, 'gotIt')} emoji="👍" color={COLORS.mint} height={60} fontSize={22} onPress={() => { stopSpeaking(); setCard(null); }} style={{ marginBottom: 0, marginTop: 8 }} />
            </Card>
          )}
        </>
      )}

      {/* Full-screen red NO card */}
      <Modal visible={answer?.kind === 'rule'} animationType="fade" onRequestClose={dismiss}>
        {answer?.kind === 'rule' && (
          <View style={{ flex: 1, backgroundColor: COLORS.tomato, padding: 24, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}><Pip size={110} color={COLORS.white} mood="worried" /></View>
            <Txt size={72} weight="bold" color={COLORS.white} align="center">
              {answer.rule.action === 'firmNo' ? t(lang, 'noCard') : '🚨'}
            </Txt>
            <Txt size={30} weight="bold" color={COLORS.white} align="center" style={{ marginVertical: 14 }}>{cardText(answer.rule, lang)}</Txt>
            <View style={{ alignItems: 'center' }}><SpeakButton text={answer.rule.message[lang]} lang={lang} color={COLORS.white} /></View>
            {answer.rule.action === 'call911' && (
              <BigButton emoji="🚨" label={t(lang, 'call911')} color={COLORS.white} onPress={() => Linking.openURL('tel:911')} />
            )}
            {answer.rule.action === 'callPoison' && (
              <BigButton emoji="☎️" label={t(lang, 'callPoison')} color={COLORS.white} onPress={() => Linking.openURL('tel:18002221222')} />
            )}
            <BigButton label={t(lang, 'gotIt')} emoji="👍" color={COLORS.sun} height={64} fontSize={22} onPress={dismiss} style={{ marginBottom: 0 }} />
          </View>
        )}
      </Modal>
    </Screen>
  );
}
