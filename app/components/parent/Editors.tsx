import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { BigButton } from '../BigButton';
import { Chip, Field, Row, Txt } from '../ui';
import { COLORS } from '../theme';
import { tap } from '../haptic';
import { useScrollApi } from '../Screen';
import { t } from '../../lib/strings';
import { fetchNearby, type FetchFn } from '../../lib/nearby';
import { WARN_RADIUS_M, warnRadiusFt } from '../../lib/rules';
import { findKnownModelPath, getInstalledModelPath, isLoaded, loadKnownModel, loadModelIfInstalled, pickAndInstallModel } from '../../lib/ai';
import { pick, type Contact, type Household, type Lang, type PlanEntry, type Person, type Role } from '../../lib/types';

type Upd = (fn: (h: Household) => Household) => void;
type P = { household: Household; update: Upd; lang: Lang };

const num = (s: string) => Number(s.replace(/[^0-9]/g, '')) || 0;
const small = { marginBottom: 0 } as const;

// ---------- People ----------
export function PeopleEditor({ household, update, lang, focusId, onFixed }: P & { focusId?: string; onFixed?: () => void }) {
  const [editId, setEditId] = useState<string | null>(focusId ?? null);
  const patch = (id: string, f: Partial<Person>) =>
    update((h) => ({ ...h, people: h.people.map((p) => (p.id === id ? { ...p, ...f } : p)) }));
  const add = () => {
    const id = `p${Date.now()}`;
    update((h) => ({ ...h, people: [...h.people, { id, name: '', role: 'kid', age: 8, language: 'en' }] }));
    setEditId(id);
  };

  return (
    <View>
      {household.people.map((p) => (
        <View key={p.id} style={{ marginBottom: 8 }}>
          <Chip label={`${p.name || '?'} · ${p.role}`} selected={editId === p.id} onPress={() => setEditId(editId === p.id ? null : p.id)} color={COLORS.sun} />
          {editId === p.id && <PersonForm p={p} lang={lang} focusBackup={focusId === p.id} onFixed={onFixed} patch={(f) => patch(p.id, f)} remove={() => { update((h) => ({ ...h, people: h.people.filter((x) => x.id !== p.id) })); setEditId(null); }} />}
        </View>
      ))}
      <BigButton emoji="➕" label={t(lang, 'pAdd')} color={COLORS.mint} height={56} fontSize={18} onPress={add} style={small} />
    </View>
  );
}

function PersonForm({ p, lang, patch, remove, focusBackup, onFixed }: { p: Person; lang: Lang; patch: (f: Partial<Person>) => void; remove: () => void; focusBackup?: boolean; onFixed?: () => void }) {
  const [devices, setDevices] = useState((p.powerDevices ?? []).join(', '));
  const scroll = useScrollApi();
  const backupWrap = useRef<View>(null);
  const backupInput = useRef<TextInput>(null);
  // Coming from the checklist's Fix button: focus the Backup power plan box, then scroll it into view.
  useEffect(() => {
    if (!focusBackup) return;
    const a = setTimeout(() => backupInput.current?.focus(), 450);
    const b = setTimeout(() => scroll.scrollTo(backupWrap), 950);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [focusBackup]);
  const suggest = (p.powerDevices?.length ?? 0) > 0 && !p.powerBackupPlan;
  return (
    <View style={{ marginTop: 10 }}>
      <Field label={t(lang, 'pName')} value={p.name} onChangeText={(name) => patch({ name })} />
      <Field label={t(lang, 'pAge')} value={String(p.age)} keyboardType="number-pad" onChangeText={(v) => patch({ age: num(v) })} />
      <Txt size={14} weight="bold" color="#CBD5E1" style={{ marginBottom: 4 }}>{t(lang, 'pRole')}</Txt>
      <Row style={{ marginBottom: 10 }}>
        {(['parent', 'grandparent', 'kid'] as Role[]).map((r) => <Chip key={r} label={r} selected={p.role === r} onPress={() => patch({ role: r })} color={COLORS.sky} />)}
      </Row>
      <Txt size={14} weight="bold" color="#CBD5E1" style={{ marginBottom: 4 }}>{t(lang, 'pLanguage')}</Txt>
      <Row style={{ marginBottom: 10 }}>
        {(['en', 'es'] as Lang[]).map((l) => <Chip key={l} label={l === 'en' ? 'English' : 'Español'} selected={p.language === l} onPress={() => patch({ language: l })} color={COLORS.sky} />)}
      </Row>
      <Field label={t(lang, 'pAllergies')} value={p.allergies ?? ''} onChangeText={(allergies) => patch({ allergies })} />
      <Field label={t(lang, 'pAllergyStepsEn')} multiline value={p.allergySteps?.en ?? ''} onChangeText={(en) => patch({ allergySteps: { en, es: p.allergySteps?.es } })} />
      <Field label={t(lang, 'pAllergyStepsEs')} multiline value={p.allergySteps?.es ?? ''} onChangeText={(es) => patch({ allergySteps: { en: p.allergySteps?.en ?? '', es } })} />
      <Field label={t(lang, 'pPowerDevices')} value={devices} onChangeText={(v) => { setDevices(v); patch({ powerDevices: v.split(',').map((x) => x.trim()).filter(Boolean) }); }} />
      {suggest ? (
        <View style={{ marginBottom: 8 }}>
          <Chip emoji="💡" label={t(lang, 'pBackupSuggest')} color={COLORS.sun} onPress={() => {
            patch({ powerBackupPlan: t(lang, 'pBackupSuggest') });
            Keyboard.dismiss();
            onFixed?.();
            scroll.scrollToTop();
          }} />
        </View>
      ) : null}
      <Field wrapRef={backupWrap} inputRef={backupInput} label={t(lang, 'pBackupPlan')} multiline value={p.powerBackupPlan ?? ''} onChangeText={(powerBackupPlan) => patch({ powerBackupPlan })} />
      <Pressable
        accessibilityRole="button"
        onPress={() => Alert.alert(t(lang, 'pDeleteAsk', { name: p.name || '?' }), undefined, [
          { text: t(lang, 'pCancel'), style: 'cancel' },
          { text: t(lang, 'pDelete'), style: 'destructive', onPress: remove },
        ])}
        style={{ marginTop: 28, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}
      >
        <Txt size={15} weight="bold" color="#EF4444">🗑️ {t(lang, 'pDelete')}</Txt>
      </Pressable>
    </View>
  );
}

// ---------- Contacts ----------
export function ContactsEditor({ household, update, lang }: P) {
  const sorted = [...household.contacts].sort((a, b) => a.order - b.order);
  const patch = (i: number, f: Partial<Contact>) =>
    update((h) => ({ ...h, contacts: h.contacts.map((c, k) => (k === i ? { ...c, ...f } : c)) }));
  const add = () =>
    update((h) => ({ ...h, contacts: [...h.contacts, { name: '', label: '', phone: '', order: h.contacts.length + 1, outOfTown: false }] }));

  return (
    <View>
      {sorted.map((c) => {
        const i = household.contacts.indexOf(c);
        return (
          <View key={i} style={{ marginBottom: 14 }}>
            <Field label={t(lang, 'pName')} value={c.name} onChangeText={(name) => patch(i, { name })} />
            <Field label={t(lang, 'pLabel')} value={c.label} onChangeText={(label) => patch(i, { label })} />
            <Field label={t(lang, 'pPhone')} value={c.phone} keyboardType="phone-pad" onChangeText={(phone) => patch(i, { phone })} />
            <Field label={t(lang, 'pOrder')} value={String(c.order)} keyboardType="number-pad" onChangeText={(v) => patch(i, { order: num(v) })} />
            <Row>
              <Chip label={t(lang, 'pOutOfTown')} selected={c.outOfTown} onPress={() => patch(i, { outOfTown: !c.outOfTown })} color={COLORS.mint} />
              <Chip label={`🗑️ ${t(lang, 'pDelete')}`} onPress={() => update((h) => ({ ...h, contacts: h.contacts.filter((_, k) => k !== i) }))} />
            </Row>
          </View>
        );
      })}
      <BigButton emoji="➕" label={t(lang, 'pAdd')} color={COLORS.mint} height={56} fontSize={18} onPress={add} style={small} />
    </View>
  );
}

// ---------- Home & supplies ----------
export function HomeEditor({ household, update, lang }: P) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const findPlaces = async () => {
    setBusy(true); setMsg(t(lang, 'pFindBusy'));
    try {
      const n = await fetchNearby(household.address, fetch as unknown as FetchFn);
      if (!n) { setMsg(t(lang, 'pPlacesFail')); return; }
      update((h) => ({ ...h, home: n.home, nearby: { places: n.places, fetchedAt: n.fetchedAt } }));
      setMsg(t(lang, 'pPlacesSaved').replace('{n}', String(n.places.length)).replace('{date}', n.fetchedAt.slice(0, 10)));
    } catch { setMsg(t(lang, 'pPlacesFail')); } finally { setBusy(false); }
  };
  return (
    <View>
      <Field label={t(lang, 'pAddress')} value={household.address} onChangeText={(address) => update((h) => ({ ...h, address }))} />
      <BigButton emoji="📍" label={t(lang, 'pFindPlaces')} color={COLORS.sky} height={56} fontSize={16} onPress={findPlaces} disabled={busy || !household.address.trim()} style={small} />
      {!!msg && <Txt size={14} style={{ marginBottom: 4 }}>{msg}</Txt>}
      {household.nearby && !msg && <Txt size={14} style={{ marginBottom: 4 }}>{t(lang, 'pPlacesSaved').replace('{n}', String(household.nearby.places.length)).replace('{date}', household.nearby.fetchedAt.slice(0, 10))}</Txt>}
      <Txt size={12} color="#64748B" style={{ marginBottom: 8 }}>{t(lang, 'pPlacesNote')}</Txt>
      <Field label={t(lang, 'pWater')} value={String(household.supplies.waterGallons)} keyboardType="number-pad"
        onChangeText={(v) => update((h) => ({ ...h, supplies: { ...h.supplies, waterGallons: num(v) } }))} />
      <Field label={t(lang, 'pFood')} value={String(household.supplies.foodDays)} keyboardType="number-pad"
        onChangeText={(v) => update((h) => ({ ...h, supplies: { ...h.supplies, foodDays: num(v) } }))} />
    </View>
  );
}

// ---------- Emergency Action Plans ----------
export const ICON_CHOICES = ['📋', '🌪️', '❄️', '💡', '🌊', '🥫', '🌀', '⚠️', '🏠', '🥜', '🩹', '🔥', '🐾', '🎒', '💊', '🚗'];

export function getPlanIcon(entry: PlanEntry): string {
  if (entry.icon) return entry.icon;
  const str = `${entry.id} ${entry.title.en} ${entry.title.es ?? ''} ${entry.keywords.join(' ')}`.toLowerCase();
  if (/freeze|winter|frio|frío|cold|ice|hielo|nieve/i.test(str)) return '❄️';
  if (/heat|power|blackout|outage|luz|apag[oó]n|flashlight|linterna/i.test(str)) return '💡';
  if (/allergy|alergia|epipen|peanut|cacahuate/i.test(str)) return '🥜';
  if (/tornado|twister|safe room/i.test(str)) return '🌪️';
  if (/generator|generador|carbon|co alarm|mon[oó]xido/i.test(str)) return '⚠️';
  if (/alone|solo|sola|kids/i.test(str)) return '🏠';
  if (/food|pantry|banco|comida|despensa|alimento/i.test(str)) return '🥫';
  if (/hurricane|hurac[aá]n|evacuat/i.test(str)) return '🌀';
  if (/flood|water|inundaci[oó]n|agua|crossing|basin/i.test(str)) return '🌊';
  if (/fire|fuego|incendio|smoke|humo/i.test(str)) return '🔥';
  if (/pet|mascota|perro|gato|dog|cat/i.test(str)) return '🐾';
  if (/bag|pack|mochila|kit/i.test(str)) return '🎒';
  if (/med|pill|medicina|doctor/i.test(str)) return '💊';
  return '📋';
}

export function PlanEditor({ household, update, lang }: P) {
  const [editId, setEditId] = useState<string | null>(null);

  const patch = (id: string, f: Partial<PlanEntry>) =>
    update((h) => {
      const plan = h.plan.map((e) => (e.id === id ? { ...e, ...f } : e));
      const flood = plan.find((e) => e.id === 'flood');
      return { ...h, plan, floodPlan: flood ? flood.text : h.floodPlan };
    });

  const addFlood = () => {
    update((h) =>
      h.plan.some((e) => e.id === 'flood')
        ? h
        : {
            ...h,
            plan: [
              ...h.plan,
              {
                id: 'flood',
                icon: '🌊',
                title: { en: 'Flood & low-water crossing plan', es: 'Plan de inundación y cruces de agua' },
                keywords: ['flood', 'water', 'rising', 'inundacion', 'agua', 'crossing', 'creek'],
                text: {
                  en: 'Never drive into water over the road. Turn around, take Route B via RM 1431 and 183A Toll to high ground.',
                  es: 'Nunca maneje por agua sobre el camino. Dé la vuelta, tome la Ruta B por RM 1431 y 183A Toll hacia terreno alto.',
                },
              },
            ],
          }
    );
    setEditId('flood');
  };

  const addBlankCustom = () => {
    const id = `custom-${Date.now()}`;
    update((h) => ({
      ...h,
      plan: [
        ...h.plan,
        {
          id,
          icon: '📋',
          title: { en: lang === 'es' ? 'Plan personalizado' : 'Custom emergency plan', es: 'Plan personalizado' },
          keywords: ['custom', 'emergency', 'plan'],
          text: { en: '', es: '' },
        },
      ],
    }));
    setEditId(id);
  };

  const addTemplate = (template: { icon: string; title: { en: string; es: string }; keywords: string[]; text: { en: string; es: string } }) => {
    const id = `tpl-${Date.now()}`;
    update((h) => ({
      ...h,
      plan: [
        ...h.plan,
        {
          id,
          ...template,
        },
      ],
    }));
    setEditId(id);
  };

  return (
    <View>
      {/* Subtitle guidance banner */}
      <View style={{ backgroundColor: '#0B1728', borderWidth: 1, borderColor: '#1E3A5F', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <Txt size={13} color="#93C5FD" style={{ lineHeight: 18 }}>
          ℹ️ {t(lang, 'pPlanSubtitle')}
        </Txt>
      </View>

      {/* Plan list with distinct icons and bilingual titles */}
      {household.plan.map((e) => {
        const icon = getPlanIcon(e);
        const planTitle = pick(e.title, lang) || e.title.en || '?';
        const isEditing = editId === e.id;

        return (
          <View key={e.id} style={{ marginBottom: 8 }}>
            <Chip
              emoji={icon}
              label={planTitle}
              selected={isEditing}
              onPress={() => { tap(); setEditId(isEditing ? null : e.id); }}
              color={COLORS.sun}
            />

            {isEditing && (
              <View style={{
                marginTop: 8,
                backgroundColor: '#0C1B2E',
                borderWidth: 1.5,
                borderColor: '#243D5C',
                borderRadius: 14,
                padding: 12,
              }}>
                {/* Icon Selector */}
                <Txt size={13} weight="bold" color="#94A3B8" style={{ marginBottom: 6 }}>
                  {t(lang, 'pPlanIcon')}
                </Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                  {ICON_CHOICES.map((ic) => (
                    <Pressable
                      key={ic}
                      onPress={() => { tap(); patch(e.id, { icon: ic }); }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: (e.icon ?? icon) === ic ? '#1E3A5F' : '#0B132B',
                        borderWidth: (e.icon ?? icon) === ic ? 2 : 1,
                        borderColor: (e.icon ?? icon) === ic ? COLORS.sky : '#243C5C',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Txt size={18}>{ic}</Txt>
                    </Pressable>
                  ))}
                </ScrollView>

                <Field label={t(lang, 'pTitleEn')} value={e.title.en} onChangeText={(en) => patch(e.id, { title: { ...e.title, en } })} />
                <Field label={t(lang, 'pTitleEs')} value={e.title.es ?? ''} onChangeText={(es) => patch(e.id, { title: { ...e.title, es } })} />
                <Field label={t(lang, 'pTextEn')} multiline value={e.text.en} onChangeText={(en) => patch(e.id, { text: { ...e.text, en } })} />
                <Field label={t(lang, 'pTextEs')} multiline value={e.text.es ?? ''} onChangeText={(es) => patch(e.id, { text: { ...e.text, es } })} />
                <KeywordField entry={e} lang={lang} onChange={(keywords) => patch(e.id, { keywords })} />

                <Row style={{ gap: 8, marginTop: 8 }}>
                  <Pressable
                    onPress={() => { tap(); setEditId(null); }}
                    style={({ pressed }) => [{
                      flex: 1,
                      height: 40,
                      backgroundColor: '#1E3A5F',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }, pressed && { opacity: 0.85 }]}
                  >
                    <Txt size={14} weight="bold" color="#38BDF8">✓ {t(lang, 'pSavePlan')}</Txt>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      tap();
                      update((h) => ({
                        ...h,
                        plan: h.plan.filter((x) => x.id !== e.id),
                        floodPlan: e.id === 'flood' ? null : h.floodPlan,
                      }));
                      setEditId(null);
                    }}
                    style={({ pressed }) => [{
                      height: 40,
                      paddingHorizontal: 14,
                      backgroundColor: '#3E1F1F',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }, pressed && { opacity: 0.85 }]}
                  >
                    <Txt size={14} weight="bold" color="#FCA5A5">🗑️ {t(lang, 'pDelete')}</Txt>
                  </Pressable>
                </Row>
              </View>
            )}
          </View>
        );
      })}

      {/* Quick Templates & Custom Plan Creator */}
      <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#243C5C' }}>
        <Txt size={15} weight="bold" color="#FFFFFF" style={{ marginBottom: 4 }}>
          ✨ {t(lang, 'pCreateCustomPlan')}
        </Txt>
        <Txt size={12} color="#94A3B8" style={{ marginBottom: 10 }}>
          {t(lang, 'pCustomPlanSubtitle')}
        </Txt>

        <Txt size={12} weight="bold" color="#64748B" style={{ marginBottom: 6 }}>
          {t(lang, 'pQuickTemplates')}
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
          <Chip
            emoji="🐾"
            label={t(lang, 'pTemplatePet')}
            color="#1E3A5F"
            onPress={() =>
              addTemplate({
                icon: '🐾',
                title: { en: 'Pet emergency plan', es: 'Plan de emergencia para mascotas' },
                keywords: ['pet', 'dog', 'cat', 'perro', 'gato', 'mascota', 'leash', 'correa', 'vet'],
                text: {
                  en: 'Grab pet crate and leash by the front door. 3-day pet food supply and vaccination records in kitchen bottom drawer. Dog is microchipped.',
                  es: 'Tomar la jaula y correa junto a la puerta principal. Comida de 3 días y vacunas en el cajón inferior de la cocina. El perro tiene microchip.',
                },
              })
            }
          />
          <Chip
            emoji="🔥"
            label={t(lang, 'pTemplateFire')}
            color="#3E2020"
            onPress={() =>
              addTemplate({
                icon: '🔥',
                title: { en: 'House fire evacuation plan', es: 'Plan de evacuación por incendio' },
                keywords: ['fire', 'smoke', 'fuego', 'humo', 'incendio', 'escape', 'alarm'],
                text: {
                  en: 'Get out immediately and stay out. Do not stop for toys or phones. Family meeting point is the mailbox at the front curb. Call 911 from outside.',
                  es: 'Salga de inmediato y quédese afuera. No se detenga por juguetes ni teléfonos. El punto de reunión familiar es el buzón en la banqueta. Llame al 911 desde afuera.',
                },
              })
            }
          />
          <Chip
            emoji="🎒"
            label={t(lang, 'pTemplateGoBag')}
            color="#2E2040"
            onPress={() =>
              addTemplate({
                icon: '🎒',
                title: { en: '72-Hour emergency go-bag', es: 'Mochila de emergencia de 72 horas' },
                keywords: ['bag', 'gobag', 'pack', 'mochila', 'supplies', 'kit', '72'],
                text: {
                  en: 'Go-bags are hanging in the master closet. Contains copies of IDs, 3 days water pouches, emergency protein bars, first aid kit, flashlights, and cash.',
                  es: 'Las mochilas están en el clóset principal. Tienen copias de identificaciones, agua para 3 días, barras de proteína, botiquín, linternas y dinero en efectivo.',
                },
              })
            }
          />
          <Chip
            emoji="💊"
            label={t(lang, 'pTemplateMedication')}
            color="#163E2D"
            onPress={() =>
              addTemplate({
                icon: '💊',
                title: { en: 'Special medical and power backup', es: 'Plan médico y respaldo de energía' },
                keywords: ['medicine', 'medication', 'oxygen', 'machine', 'oxigeno', 'medicina', 'power', 'backup'],
                text: {
                  en: "Backup battery pack for oxygen machine is plugged in next to Frank's nightstand. 7-day medicine box kept in kitchen cabinet labeled Emergency.",
                  es: 'La batería de respaldo para el concentrador de oxígeno está conectada junto al buró de Frank. Caja de 7 días de medicinas en el gabinete marcado Emergencia.',
                },
              })
            }
          />
          {!household.plan.some((e) => e.id === 'flood') && (
            <Chip emoji="🌊" label={t(lang, 'pAddFlood')} color={COLORS.sky} onPress={addFlood} />
          )}
        </ScrollView>

        <BigButton
          emoji="➕"
          label={t(lang, 'pCreateCustomPlan')}
          sub={lang === 'es' ? 'Crear plan en blanco con título y pasos personalizados' : 'Create blank custom plan with your own title & steps'}
          color={COLORS.mint}
          height={54}
          fontSize={17}
          onPress={addBlankCustom}
          style={{ marginTop: 4, marginBottom: 0 }}
        />
      </View>
    </View>
  );
}

function KeywordField({ entry, lang, onChange }: { entry: PlanEntry; lang: Lang; onChange: (k: string[]) => void }) {
  const [text, setText] = useState(entry.keywords.join(', '));
  return (
    <View style={{ marginBottom: 4 }}>
      <Field label={t(lang, 'pKeywords')} value={text} onChangeText={(v) => { setText(v); onChange(v.split(',').map((x) => x.trim()).filter(Boolean)); }} />
      <Txt size={11} color="#64748B" style={{ marginTop: -8, marginBottom: 8, paddingHorizontal: 4 }}>
        {lang === 'es' ? 'Palabras clave que activan este plan cuando alguien le pregunta a la IA' : 'Keywords that trigger this plan when someone asks the offline AI'}
      </Txt>
    </View>
  );
}

// ---------- Low-water crossings + Route B ----------
export function CrossingsEditor({ household, update, lang }: P) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const saveSpot = async () => {
    setBusy(true);
    try {
      let lat = 30.5255;
      let lon = -97.7842;
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch {
        // use fallback coordinates for indoor/testing
      }

      const spotName = name.trim() || `Low-water crossing #${household.crossings.length + 1}`;
      update((h) => ({
        ...h,
        noCrossingsNearMe: false,
        crossings: [...h.crossings, { id: `cr${Date.now()}`, label: spotName, lat, lon }],
      }));
      setSavedMsg(`✅ Saved "${spotName}" (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`);
      setName('');
      setTimeout(() => setSavedMsg(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {/* Route & Flood Hazard Legend */}
      <View style={{ backgroundColor: '#0B1728', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#233F63', marginBottom: 14 }}>
        <Txt size={15} weight="bold" color={COLORS.sky} style={{ marginBottom: 8 }}>
          🗺️ {lang === 'es' ? 'Leyenda de Evacuación y Riesgo de Inundación' : 'Evacuation Route & Flood Hazard Legend'}
        </Txt>
        
        <View style={{ gap: 8 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Txt size={16}>🔴</Txt>
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="bold" color="#FCA5A5">
                {lang === 'es' ? 'Ruta A (Habitual): ' : 'Route A (Normal Commute): '}
                <Txt size={13} weight="medium" color="#CBD5E1">
                  {lang === 'es' ? 'Atraviesa vados bajos en la cuenca Brushy Creek. Peligro de inundación repentina.' : 'Passes monitored low-water crossings along Brushy Creek basin. High flash-flood danger.'}
                </Txt>
              </Txt>
            </View>
          </Row>

          <Row style={{ alignItems: 'flex-start' }}>
            <Txt size={16}>🟢</Txt>
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="bold" color="#86EFAC">
                {lang === 'es' ? 'Ruta B (Desvío Seguro): ' : 'Route B (Emergency Detour): '}
                <Txt size={13} weight="medium" color="#CBD5E1">
                  {lang === 'es' ? '100% puentes elevados por RM 1431 y 183A Toll hacia terreno alto (0 cruces de agua).' : '100% elevated bridge flyovers via RM 1431 & 183A Toll to high ground (0 flood crossings).'}
                </Txt>
              </Txt>
            </View>
          </Row>

          <Row style={{ alignItems: 'flex-start' }}>
            <Txt size={16}>⚠️</Txt>
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="bold" color={COLORS.orange}>
                {lang === 'es' ? 'Alerta al Conducir: ' : 'Driver GPS Warning: '}
                <Txt size={13} weight="medium" color="#CBD5E1">
                  {t(lang, 'drRadius', { ft: warnRadiusFt().toLocaleString('en-US'), m: WARN_RADIUS_M })}
                </Txt>
              </Txt>
            </View>
          </Row>
        </View>
      </View>

      {/* Monitored Crossings List */}
      <Txt size={15} weight="bold" color="#FFFFFF" style={{ marginBottom: 8 }}>
        🌊 {lang === 'es' ? 'Cruces Monitoreados' : 'Monitored Crossings'} ({household.crossings.length})
      </Txt>
      {household.crossings.map((c) => (
        <View key={c.id} style={{ backgroundColor: '#0E1B2D', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#223A5B' }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Txt size={15} weight="bold" color="#FFFFFF">🌊 {c.label}</Txt>
              <Txt size={12} weight="medium" color="#94A3B8">
                {c.lat.toFixed(4)}°, {c.lon.toFixed(4)}° · {t(lang, 'drRadius', { ft: warnRadiusFt().toLocaleString('en-US'), m: WARN_RADIUS_M })}
              </Txt>
            </View>
            <Chip label="🗑️" onPress={() => update((h) => ({ ...h, crossings: h.crossings.filter((x) => x.id !== c.id) }))} color={COLORS.navyBorder} />
          </Row>
        </View>
      ))}

      {savedMsg && (
        <View style={{ backgroundColor: '#064E3B', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.mint }}>
          <Txt size={14} weight="bold" color="#A7F3D0">{savedMsg}</Txt>
        </View>
      )}

      {/* Save Spot Form */}
      <Field label={t(lang, 'pSpotName')} placeholder="e.g. Brushy Creek Dip at CR 175" value={name} onChangeText={setName} />
      <BigButton emoji={busy ? '⏳' : '📍'} label={t(lang, 'pSaveSpot')} color={COLORS.sky} height={56} fontSize={18} onPress={saveSpot} disabled={busy} />
      
      <Row style={{ marginBottom: 16 }}>
        <Chip label={t(lang, 'pNoCrossings')} selected={household.noCrossingsNearMe} color={COLORS.mint}
          onPress={() => update((h) => ({ ...h, noCrossingsNearMe: !h.noCrossingsNearMe }))} />
      </Row>

      {/* Route B Instructions */}
      <Field label={`${t(lang, 'pRouteBEn')} — Spoken Evacuation Detour`} multiline value={household.routeB?.en ?? ''}
        onChangeText={(en) => update((h) => ({ ...h, routeB: { en, es: h.routeB?.es } }))} />
      <Field label={`${t(lang, 'pRouteBEs')} — Instrucciones habladas`} multiline value={household.routeB?.es ?? ''}
        onChangeText={(es) => update((h) => ({ ...h, routeB: { en: h.routeB?.en ?? '', es } }))} />
    </View>
  );
}

// ---------- AI model ----------
export function ModelPanel({ lang }: { lang: Lang }) {
  const [state, setState] = useState<'none' | 'notfound' | 'loading' | 'ready' | 'error'>('none');
  const [modelPath, setModelPath] = useState<string | null>(null);

  const refreshState = async () => {
    if (isLoaded()) {
      setState('ready');
      const p = await getInstalledModelPath();
      setModelPath(p);
    } else {
      const p = await getInstalledModelPath();
      setModelPath(p);
      if (p) {
        setState('loading');
        const ok = await loadModelIfInstalled();
        setState(ok ? 'ready' : 'error');
      } else {
        const found = findKnownModelPath();
        if (found) {
          setModelPath(found);
          setState('loading');
          const ok = await loadKnownModel(found);
          setState(ok ? 'ready' : 'none');
        } else {
          setState('none');
        }
      }
    }
  };

  useEffect(() => {
    refreshState();
    const id = setInterval(() => {
      if (isLoaded()) setState('ready');
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const autoLoad = async () => {
    // Nothing on the phone to load? Say so, instead of a vague "could not load".
    if (!findKnownModelPath() && !(await getInstalledModelPath())) { setState('notfound'); return; }
    setState('loading');
    try {
      const ok = await loadKnownModel();
      setState(ok ? 'ready' : 'error');
      if (ok) {
        const p = await getInstalledModelPath();
        setModelPath(p);
      }
    } catch {
      setState('error');
    }
  };

  const choose = async () => {
    setState('loading');
    try {
      const ok = await pickAndInstallModel();
      setState(ok ? 'ready' : 'none');
      if (ok) {
        const p = await getInstalledModelPath();
        setModelPath(p);
      }
    } catch {
      setState('error');
    }
  };

  return (
    <View>
      <View style={{ backgroundColor: '#0B1626', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#1F3A5E', marginBottom: 14 }}>
        <Row style={{ marginBottom: 6 }}>
          {state === 'loading' && <ActivityIndicator color={COLORS.sky} style={{ marginRight: 6 }} />}
          <Txt size={18} weight="bold" color="#FFFFFF">
            {state === 'ready' ? `✅ Gemma 3 1B IT (Active)` : state === 'loading' ? t(lang, 'pModelLoading') : state === 'error' ? `⚠️ ${t(lang, 'pModelFail')}` : state === 'notfound' ? `⚠️ ${t(lang, 'pModelNotFound')}` : t(lang, 'pModelNone')}
          </Txt>
        </Row>
        
        <Txt size={13} weight="medium" color="#94A3B8" style={{ marginTop: 2 }}>
          {lang === 'es'
            ? 'Motor: llama.rn (Snapdragon On-Device AI) · 100% sin internet'
            : 'Engine: llama.rn (Snapdragon On-Device AI) · 100% offline open weights'}
        </Txt>

        {modelPath && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#060E1A', borderRadius: 8, borderWidth: 1, borderColor: '#1A304C' }}>
            <Txt size={12} weight="bold" color={COLORS.accentGold}>📁 Model Location:</Txt>
            <Txt size={11} color="#CBD5E1" numberOfLines={2} style={{ marginTop: 2 }}>
              {modelPath}
            </Txt>
          </View>
        )}
      </View>

      <BigButton
        emoji="⚡"
        label={state === 'ready' ? 'Reload Gemma 3 1B' : 'Load Gemma 3 1B (Auto-detected)'}
        color={COLORS.mint}
        textColor="#052E16"
        height={56}
        fontSize={18}
        onPress={autoLoad}
        style={{ marginBottom: 10 }}
      />

      <BigButton
        emoji="📁"
        label={t(lang, 'pModelChoose')}
        color={COLORS.grape}
        textColor={COLORS.white}
        height={56}
        fontSize={18}
        onPress={choose}
        style={small}
      />
    </View>
  );
}
