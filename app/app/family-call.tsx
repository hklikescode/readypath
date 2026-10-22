import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, Row, Txt } from '../components/ui';
import { Party } from '../components/Party';
import { COLORS, PALETTES } from '../components/theme';
import { yay } from '../components/haptic';
import { t, localLabel } from '../lib/strings';
import { useApp } from '../lib/store';

// Call the contacts in order. After the phone app closes, ask "Did they answer?"
export default function FamilyCall() {
  const router = useRouter();
  const { household, session } = useApp();
  const lang = session.lang;
  const mode = session.mode ?? 'grandparent';
  const P = PALETTES[mode];
  const contacts = [...household.contacts].sort((a, b) => a.order - b.order);
  const [i, setI] = useState(0);
  const [asking, setAsking] = useState(false);
  const [reached, setReached] = useState<string | null>(null);
  const [nobody, setNobody] = useState(false);
  const waiting = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && waiting.current) { waiting.current = false; setAsking(true); }
    });
    return () => sub.remove();
  }, []);

  const current = contacts[i];

  const call = () => {
    if (!current) return;
    waiting.current = true;
    Linking.openURL(`tel:${current.phone}`);
  };
  const answered = () => { yay(); setReached(current.label || current.name); setAsking(false); };
  const noAnswer = () => {
    setAsking(false);
    if (i + 1 >= contacts.length) setNobody(true);
    else setI(i + 1);
  };
  const startOver = () => { setI(0); setNobody(false); setReached(null); setAsking(false); };

  return (
    <Screen mode={mode} show911={mode !== 'parent'}>
      <Party fire={reached !== null} />
      <PipSays
        color={COLORS.white}
        text={reached ? t(lang, 'fcYay', { name: localLabel(reached, lang) }) : nobody ? t(lang, 'fcNobody') : t(lang, 'fcTitle')}
        mood={nobody ? 'worried' : 'happy'}
      />

      {contacts.length === 0 && <Card><Txt size={P.body}>{t(lang, 'fcNoContacts')}</Txt></Card>}

      {!reached && !nobody && current && !asking && (
        <>
          <Row style={{ marginBottom: 12 }}>
            {contacts.map((c, k) => (
              <View key={c.phone} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#334E68', backgroundColor: k < i ? COLORS.mint : k === i ? COLORS.sun : '#1A293D' }} />
            ))}
          </Row>

          <BigButton emoji="📞" label={t(lang, 'fcCallTo', { name: localLabel(current.label || current.name, lang) })} sub={`${current.name} • ${current.phone}`} color={COLORS.mint}
            fontSize={P.btnText} height={P.btnH + 12} onPress={call} />
        </>
      )}

      {asking && current && (
        <Card>
          <Txt size={P.body + 4} weight="bold" align="center">{t(lang, 'fcDidAnswer', { name: localLabel(current.label || current.name, lang) })}</Txt>
          <View style={{ height: 12 }} />
          <BigButton emoji="✅" label={t(lang, 'fcYes')} color={COLORS.mint} fontSize={P.btnText - 4} height={P.btnH - 16} onPress={answered} />
          <BigButton emoji="🙁" label={t(lang, 'fcNo')} color={COLORS.sun} fontSize={P.btnText - 4} height={P.btnH - 16} delay={90} onPress={noAnswer} style={{ marginBottom: 0 }} />
        </Card>
      )}

      {nobody && (
        <>
          <BigButton emoji="🚨" label={t(lang, 'call911')} color={COLORS.tomato} textColor={COLORS.white} fontSize={P.btnText} height={P.btnH} onPress={() => Linking.openURL('tel:911')} />
          <BigButton emoji="☎️" label={t(lang, 'call211')} color={COLORS.sky} fontSize={P.btnText - 4} height={P.btnH - 16} delay={90} onPress={() => Linking.openURL('tel:211')} />
          <BigButton emoji="🔁" label={t(lang, 'fcStartOver')} color={COLORS.white} fontSize={20} height={60} delay={160} onPress={startOver} />
          <BigButton emoji="🏠" label={t(lang, 'doneReturn')} color="#162840" textColor="#F8FAFC" fontSize={18} height={54} onPress={() => router.replace('/')} />
        </>
      )}

      {reached && (
        <>
          <BigButton emoji="🔁" label={t(lang, 'fcStartOver')} color={COLORS.white} fontSize={20} height={60} onPress={startOver} />
          <BigButton emoji="🏠" label={t(lang, 'doneReturn')} color={COLORS.mint} textColor="#0F172A" fontSize={18} height={54} onPress={() => router.replace('/')} />
        </>
      )}
    </Screen>
  );
}
