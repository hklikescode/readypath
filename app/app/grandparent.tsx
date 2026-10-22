import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, Chip, Row, Txt } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';
import { SheltersCard } from '../components/SheltersCard';
import { COLORS, PALETTES } from '../components/theme';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import { speak, stopSpeaking } from '../lib/speak';
import { pick } from '../lib/types';
import type { Lang } from '../lib/types';

const P = PALETTES.grandparent;

export default function Grandparent() {
  const router = useRouter();
  const { household, person, session, setSession } = useApp();
  const lang = session.lang;
  const [activePlan, setActivePlan] = useState<{ id: string; title: string; text: string } | null>(null);
  const go = (path: string) => router.push(path as never);

  const kidsBeingWatched = household.people.filter((p) => p.role === 'kid').map((k) => k.name).join(lang === 'es' ? ' y ' : ' & ');

  const showPlan = (id: string, defaultTitle: string, defaultText: string) => {
    const entry = household.plan.find((p) => p.id === id);
    const title = entry ? pick(entry.title, lang) : defaultTitle;
    const body = entry ? pick(entry.text, lang) : defaultText;
    setActivePlan({ id, title, text: body });
  };

  return (
    <Screen mode="grandparent" show911 onBack={activePlan ? () => { stopSpeaking(); setActivePlan(null); } : undefined}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Row>
          <Txt size={16} weight="bold" color="#94A3B8">{t(lang, 'language')}:</Txt>
          {(['en', 'es'] as Lang[]).map((l) => (
            <Chip key={l} label={l === 'en' ? 'English' : 'Español'} selected={lang === l} onPress={() => setSession({ lang: l })} color={COLORS.sky} />
          ))}
        </Row>
        <Chip label={`🔄 ${t(lang, 'gpSwitch')}`} color="#1A2D47" onPress={() => router.push('/')} />
      </Row>

      {/* When NO plan is selected: show main dashboard (disaster chips + 4 primary buttons) */}
      {!activePlan ? (
        <>
          <PipSays
            color={COLORS.sky}
            text={`${t(lang, 'gpHi', { name: person?.name ?? 'Elena' })}. ${kidsBeingWatched ? `${t(lang, 'gpWatching', { names: kidsBeingWatched })} ` : ''}${t(lang, 'gpSub')}`}
          />

          {/* Quick Family Disaster Plans */}
          <View style={{ marginBottom: 14 }}>
            <Txt size={16} weight="bold" color="#94A3B8" style={{ marginBottom: 8 }}>
              {lang === 'es' ? 'Planes rápidos de emergencia y refugios:' : 'Quick family disaster plans & shelters:'}
            </Txt>
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip
                emoji="🌪️"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Tornado' : 'Tornado'}
                selected={false}
                color={COLORS.sky}
                onPress={() => showPlan('tornado', 'Tornado Plan', 'Our in-home safe spot is the hall closet under the stairs. We take phone and shoes.')}
              />
              <Chip
                emoji="🥫"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Alimentos' : 'Food Bank'}
                selected={false}
                color={COLORS.mint}
                onPress={() => showPlan('food-bank', 'Emergency Food Bank', 'Nearest emergency food bank is Hill Country Community Ministries at 1005 Lacy Dr.')}
              />
              <Chip
                emoji="🌀"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Huracán' : 'Hurricane'}
                selected={false}
                color={COLORS.grape}
                onPress={() => showPlan('hurricane', 'Hurricane Evacuation Shelter', 'Nearest hurricane evacuation shelter is Kelly Reeves Complex at 10211 W Parmer Ln.')}
              />
              <Chip
                emoji="❄️"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Frío' : 'Freeze'}
                selected={false}
                color={COLORS.sun}
                onPress={() => showPlan('freeze', 'Freeze Plan', 'Warm room is living room. Water shut-off in garage.')}
              />
              <Chip
                emoji="💡"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Apagón' : 'Power Out'}
                selected={false}
                color={COLORS.sun}
                onPress={() => showPlan('heat', 'Power Outage', 'Flashlights in kitchen drawer left of stove.')}
              />
              <Chip
                emoji="🌊"
                size={17}
                style={{ paddingVertical: 10, paddingHorizontal: 16, minHeight: 48 }}
                label={lang === 'es' ? 'Inundación' : 'Flood Detour'}
                selected={false}
                color={COLORS.orange}
                onPress={() => {
                  const flood = household.floodPlan ?? household.plan.find((e) => e.id === 'flood')?.text ?? household.routeB ?? null;
                  showPlan('flood', lang === 'es' ? 'Ruta de desvío de inundación (Ruta B)' : 'Flood Detour & Route B', flood ? pick(flood, lang) : t(lang, 'noFloodSteps'));
                }}
              />
            </Row>
          </View>

          <BigButton
            emoji="🎤"
            label={t(lang, 'ask')}
            sub={lang === 'es' ? 'Preguntas por voz o texto sobre frío, apagón e inundación' : 'Voice or text answers from our family storm plan'}
            color="#1F5FD1"
            textColor={COLORS.white}
            fontSize={P.btnText}
            height={P.btnH}
            onPress={() => go('/ask')}
          />

          <BigButton
            emoji="🆘"
            label={t(lang, 'somethingHappened')}
            sub={lang === 'es' ? 'Alergia de Mia, caídas, guión hablado para el 911' : "Mia's allergy, falls, spoken English 911 sentence"}
            color={COLORS.tomato}
            textColor={COLORS.white}
            fontSize={P.btnText}
            height={P.btnH}
            delay={80}
            onPress={() => go('/emergency')}
          />

          <BigButton
            emoji="📞"
            label={t(lang, 'callFamily')}
            sub={lang === 'es' ? 'Llama a Mamá, si no contesta, llama a Papá' : 'Sequential call chain: Mom → Dad'}
            color={COLORS.mint}
            fontSize={P.btnText}
            height={P.btnH}
            delay={160}
            onPress={() => go('/family-call')}
          />

          <BigButton
            emoji="🚗"
            label={t(lang, 'driveCheck')}
            sub={lang === 'es' ? 'Alerta GPS antes del cruce de agua (Brushy Creek)' : 'GPS warning before low-water crossing'}
            color={COLORS.sun}
            fontSize={P.btnText}
            height={P.btnH}
            delay={240}
            onPress={() => go('/drive')}
          />
        </>
      ) : (
        /* When a disaster plan IS selected: focused, uncluttered view */
        <Card style={{ marginBottom: 14 }}>
          <Txt size={26} weight="bold" color="#FFFFFF" style={{ marginBottom: 8 }}>{activePlan.title}</Txt>
          {activePlan.id === 'tornado' && (
            <View style={{ backgroundColor: '#102A45', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.sky, padding: 12, marginBottom: 12 }}>
              <Txt size={16} weight="bold" color="#38BDF8" style={{ marginBottom: 6 }}>
                🌪️ {lang === 'es' ? 'Acciones inmediatas para tornado:' : 'Immediate Tornado Actions:'}
              </Txt>
              <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                <Txt size={18}>🚪</Txt>
                <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                  {lang === 'es' ? '1. Cuarto interior más bajo sin ventanas' : '1. Lowest interior room with no windows'}
                </Txt>
              </Row>
              <Row style={{ alignItems: 'center', marginBottom: 4 }}>
                <Txt size={18}>👟</Txt>
                <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                  {lang === 'es' ? '2. Llevar teléfono cargado y zapatos puestos' : '2. Put on shoes & take charged phone'}
                </Txt>
              </Row>
              <Row style={{ alignItems: 'center' }}>
                <Txt size={18}>🛡️</Txt>
                <Txt size={15} color="#F8FAFC" weight="medium" style={{ marginLeft: 6 }}>
                  {lang === 'es' ? '3. Protegerse la cabeza con cojines o cobijas' : '3. Protect your head with pillows or blankets'}
                </Txt>
              </Row>
            </View>
          )}
          <Txt size={P.body + 2} weight="medium" color="#F8FAFC" style={{ lineHeight: 40, marginBottom: 10 }}>{activePlan.text}</Txt>
          <SpeakButton text={activePlan.text} lang={lang} />

          {/* Load nearby shelters, safe rooms, food banks, hurricane centers, warming or cooling stations */}
          {(activePlan.id === 'tornado' || activePlan.id === 'food-bank' || activePlan.id === 'hurricane' || activePlan.id === 'freeze' || activePlan.id === 'heat') && (
            <SheltersCard
              lang={lang}
              initialCategory={
                activePlan.id === 'food-bank' ? 'food' :
                activePlan.id === 'hurricane' ? 'hurricane' :
                activePlan.id === 'freeze' ? 'warming' :
                activePlan.id === 'heat' ? 'cooling' : 'tornado'
              }
              inHomeNote={activePlan.id === 'tornado' ? activePlan.text : undefined}
              hideCategoryTabs
            />
          )}

          <BigButton label={t(lang, 'gotIt')} emoji="👍" color={COLORS.mint} height={60} fontSize={22} onPress={() => { stopSpeaking(); setActivePlan(null); }} style={{ marginBottom: 0, marginTop: 8 }} />
        </Card>
      )}
    </Screen>
  );
}
