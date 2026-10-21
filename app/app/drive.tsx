import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { MotiView } from 'moti';
import { Screen, ScrollToHere } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { Card, NotBuilt, Txt } from '../components/ui';
import { SpeakButton } from '../components/SpeakButton';
import { COLORS, INK, PALETTES } from '../components/theme';
import { warn } from '../components/haptic';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import { testDrive, WARN_RADIUS_M, warnRadiusFt } from '../lib/rules';
import { tryStudent } from '../lib/safe';
import { speak, stopSpeaking } from '../lib/speak';
import { distanceMeters, nearCrossing } from '../lib/student/distance';
import { pick, type Crossing } from '../lib/types';

type Status = 'waiting' | 'clear' | 'denied';

export default function Drive() {
  useKeepAwake();
  const { household, session } = useApp();
  const lang = session.lang;
  const mode = session.mode ?? 'grandparent';
  const P = PALETTES[mode];
  const [status, setStatus] = useState<Status>('waiting');
  const [banner, setBanner] = useState<Crossing | null>(null);
  const [routeB, setRouteB] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notBuilt, setNotBuilt] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number } | null>(null);
  const warned = useRef(new Set<string>());
  const testingRef = useRef(false);
  const crossingsRef = useRef(household.crossings);
  crossingsRef.current = household.crossings;

  const onFix = useCallback((pos: { lat: number; lon: number }) => {
    setCurrentPos(pos);
    setStatus((s) => (s === 'denied' ? s : 'clear'));
    const near = tryStudent(() => nearCrossing(pos, crossingsRef.current, WARN_RADIUS_M));
    if (!near.ok) { if (near.notBuilt) setNotBuilt(true); return; }
    const c = near.value;
    if (c && !warned.current.has(c.id)) {
      warned.current.add(c.id);
      setBanner(c);
      setRouteB(false);
      warn();
      speak(t(lang, 'drWarn', { label: c.label }), lang);
    }
  }, [lang]);

  // Real GPS, about every 2 seconds. Ignored while the test drive runs.
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) { setStatus('denied'); return; }
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 },
          (loc) => { if (!testingRef.current) onFix({ lat: loc.coords.latitude, lon: loc.coords.longitude }); },
        );
        if (cancelled) s.remove(); else sub = s;
      } catch {
        setStatus('denied');
      }
    })();
    return () => { cancelled = true; sub?.remove(); stopSpeaking(); };
  }, [onFix]);

  // Test drive: feeds the demo points every 0.7 s instead of GPS.
  useEffect(() => {
    if (!testing) return;
    testingRef.current = true;
    let k = 0;
    const id = setInterval(() => {
      if (k >= testDrive.length) { setTesting(false); return; }
      onFix(testDrive[k]);
      k += 1;
    }, 700);
    return () => { clearInterval(id); testingRef.current = false; };
  }, [testing, onFix]);

  const startTest = () => {
    warned.current = new Set();
    setBanner(null);
    setRouteB(false);
    setTesting(true);
  };

  const routeBText = household.routeB ? pick(household.routeB, lang) : t(lang, 'drNoRouteB');

  // Format distance for US drivers (feet and miles)
  const formatUSDist = (meters: number): string => {
    const feet = Math.round(meters * 3.28084);
    const miles = meters / 1609.344;
    if (miles >= 0.2) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${feet.toLocaleString()} ft`;
  };

  // Compute distance to nearest monitored crossing for visual feedback
  const nearest = currentPos && household.crossings.length > 0
    ? household.crossings
        .map((c) => ({ ...c, dist: Math.round(distanceMeters(currentPos, c)) }))
        .sort((a, b) => a.dist - b.dist)[0]
    : null;

  return (
    <Screen mode={mode} show911={mode !== 'parent'}>
      {/* The simulation button is first, so it is never hidden behind GPS status. */}
      {testing ? (
        <BigButton emoji="⏹" label={t(lang, 'drStop')} color={COLORS.white} fontSize={22} height={64} onPress={() => setTesting(false)} />
      ) : (
        <BigButton emoji="▶️" label={t(lang, 'drTest')} color={COLORS.grape} textColor={COLORS.white} fontSize={22} height={64} onPress={startTest} />
      )}
      {testing && (
        <View style={{ backgroundColor: COLORS.sun, borderWidth: 1.5, borderColor: '#060C14', borderRadius: 14, padding: 8, marginBottom: 10 }}>
          <Txt size={16} weight="bold" color="#0F172A" align="center">🧪 {t(lang, 'drTestLabel')}</Txt>
        </View>
      )}

      <PipSays color={COLORS.sky} text={t(lang, 'drOn')} />

      <Card>
        <MotiView
          from={{ translateX: -26 }}
          animate={{ translateX: 26 }}
          transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
          style={{ alignSelf: 'center' }}
        >
          <Txt size={64}>🚗</Txt>
        </MotiView>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: '#274164', marginVertical: 8 }} />
        <Txt size={P.body} weight="semi" align="center" color="#F8FAFC">
          {status === 'denied' && !testing ? t(lang, 'drNoPermission') : status === 'waiting' && !testing ? t(lang, 'drWaiting') : t(lang, 'drAllClear')}
        </Txt>

        {/* Live Tracked GPS / Simulation Coordinates */}
        <View style={{ backgroundColor: '#0A121E', borderRadius: 10, padding: 8, marginTop: 10, borderWidth: 1, borderColor: '#1F334E' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Txt size={12} weight="bold" color="#94A3B8">
              📡 {testing ? 'TEST DRIVE ROUTE (CR 175)' : 'DEVICE GPS FIX'}
            </Txt>
            <Txt size={11} weight="medium" color={currentPos ? COLORS.mint : '#64748B'}>
              {currentPos ? 'LIVE' : 'SEARCHING...'}
            </Txt>
          </View>
          <Txt size={13} weight="medium" color="#E2E8F0">
            {currentPos ? `${currentPos.lat.toFixed(5)}°, ${currentPos.lon.toFixed(5)}°` : 'Acquiring GPS coordinates...'}
          </Txt>
          {nearest && (
            <Txt size={12} weight="medium" color={nearest.dist <= WARN_RADIUS_M ? COLORS.orange : '#94A3B8'} style={{ marginTop: 4 }}>
              📍 {nearest.dist <= WARN_RADIUS_M ? '⚠️ DANGER: ' : 'Nearest: '}{nearest.label} ({formatUSDist(nearest.dist)})
            </Txt>
          )}
        </View>
      </Card>
      {notBuilt && <NotBuilt label={`nearCrossing: ${t('en', 'notBuilt')}`} />}

      {household.crossings.length > 0 && (
        <Card color="#111F33" style={{ marginBottom: 14 }}>
          <Txt size={17} weight="bold" color="#F8FAFC" style={{ marginBottom: 8 }}>
            🌊 {lang === 'es' ? 'Cruces de agua cerca de ti' : 'Nearby Monitored Crossings'} ({household.crossings.length})
          </Txt>
          {household.crossings.map((c) => {
            const d = currentPos ? Math.round(distanceMeters(currentPos, c)) : null;
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1A2C42' }}>
                <Txt size={18} style={{ marginRight: 10 }}>⚠️</Txt>
                <View style={{ flex: 1 }}>
                  <Txt size={15} weight="semi" color="#F8FAFC">{c.label}</Txt>
                  <Txt size={12} weight="medium" color="#94A3B8">
                    {lang === 'es' ? 'Cuenca Brushy Creek • ' : 'Brushy Creek Basin • '}{t(lang, 'drRadius', { ft: warnRadiusFt().toLocaleString('en-US'), m: WARN_RADIUS_M })}
                  </Txt>
                </View>
                {d !== null && (
                  <View style={{ backgroundColor: d <= WARN_RADIUS_M ? '#7C2D12' : '#0B1320', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: d <= WARN_RADIUS_M ? COLORS.orange : '#243B5A' }}>
                    <Txt size={11} weight="bold" color={d <= WARN_RADIUS_M ? COLORS.orange : '#CBD5E1'}>
                      {formatUSDist(d)}
                    </Txt>
                  </View>
                )}
              </View>
            );
          })}
          <Txt size={12} weight="medium" color="#64748B" style={{ marginTop: 8 }}>
            {lang === 'es' ? 'Puntos de riesgo oficiales monitoreados por ATXFloods / Condado de Williamson' : 'Tracked via ATXFloods & Williamson County Flood Operations'}
          </Txt>
        </Card>
      )}


      <ScrollToHere when={banner && banner.id} />
      {banner && (
        <MotiView from={{ opacity: 0, scale: 0.85, translateY: -16 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} transition={{ type: 'spring', damping: 9 }}>
          <View style={{ backgroundColor: COLORS.orange, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 20, padding: 16, marginBottom: 14 }}>
            <Txt size={P.body + 2} weight="bold" color="#FFFFFF">⚠️ {t(lang, 'drWarn', { label: banner.label })}</Txt>
            <SpeakButton text={t(lang, 'drWarn', { label: banner.label })} lang={lang} color={COLORS.white} />
            <BigButton emoji="↩️" label={t(lang, 'drRouteB')} color={COLORS.white} fontSize={P.btnText - 4} height={P.btnH - 16} onPress={() => { setRouteB(true); speak(routeBText, lang); }} style={{ marginBottom: 0, marginTop: 8 }} />
          </View>
        </MotiView>
      )}

      <ScrollToHere when={routeB} />
      {routeB && (
        <Card color="#0D3325" borderColor={COLORS.mint}>
          <Txt size={P.body} weight="semi" color="#F8FAFC" style={{ marginBottom: 12 }}>{routeBText}</Txt>
          <SpeakButton text={routeBText} lang={lang} color="#FFFFFF" />

          {/* Graphical Route Schematic Map */}
          <View style={{ marginTop: 14, backgroundColor: '#06130E', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#164E35' }}>
            <Txt size={14} weight="bold" color={COLORS.mint} style={{ marginBottom: 8 }}>
              🗺️ {lang === 'es' ? 'Ruta Segura de Evacuación (Sin Cruces)' : 'Safe Evacuation Path (Bypassing Flood Zone)'}
            </Txt>
            
            {/* Schematic Flow */}
            <View style={{ paddingVertical: 4 }}>
              {/* Start Point */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.mint, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Txt size={14} weight="bold" color="#052E16">A</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold" color="#F8FAFC">
                    {lang === 'es' ? 'Inicio: Parque Regional SW Williamson' : 'Start: SW Williamson Co. Regional Park'}
                  </Txt>
                  <Txt size={12} color="#94A3B8">3005 County Road 175, Leander, TX</Txt>
                </View>
              </View>

              {/* Blocked Path Visual */}
              <View style={{ marginLeft: 14, paddingLeft: 20, borderLeftWidth: 2, borderLeftColor: '#7F1D1D', paddingBottom: 10 }}>
                <View style={{ backgroundColor: '#450A0A', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DC2626' }}>
                  <Txt size={12} weight="bold" color="#FCA5A5">
                    ❌ {lang === 'es' ? 'RUTA HABITUAL BLOQUEADA: CR 175' : 'ROUTE A BLOCKED: CR 175 at Brushy Creek'}
                  </Txt>
                  <Txt size={11} color="#FECACA">
                    {lang === 'es' ? 'Cruce de agua desbordado • ¡No cruces!' : 'Low-water crossing submerged • Turn Around, Don\'t Drown!'}
                  </Txt>
                </View>
              </View>

              {/* Safe Route B Visual */}
              <View style={{ marginLeft: 14, paddingLeft: 20, borderLeftWidth: 2, borderLeftColor: COLORS.mint, paddingBottom: 10 }}>
                <View style={{ backgroundColor: '#064E3B', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.mint }}>
                  <Txt size={12} weight="bold" color="#A7F3D0">
                    ✅ {lang === 'es' ? 'RUTA B SEGURA: Vía Elevada RM 1431 / 183A Toll' : 'ROUTE B DETOUR: High Ground via RM 1431 & 183A Toll'}
                  </Txt>
                  <Txt size={11} color="#D1FAE5">
                    {t(lang, 'drAvoids', { n: household.crossings.length })}
                  </Txt>
                </View>
              </View>

              {/* Destination Point */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.sun, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Txt size={14} weight="bold" color="#0F172A">B</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={14} weight="bold" color="#F8FAFC">
                    {lang === 'es' ? 'Destino Seguro: Casa de Tía Lucy' : 'Safe Destination: Tía Lucy\'s House'}
                  </Txt>
                  <Txt size={12} color="#94A3B8">Highland Horizon, Round Rock (Elevated ridge)</Txt>
                </View>
              </View>
            </View>
          </View>
        </Card>
      )}

    </Screen>

  );
}
