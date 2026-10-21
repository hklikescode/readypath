import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Card, Chip, Row, Txt } from './ui';
import { COLORS } from './theme';
import { useApp } from '../lib/store';
import { pick, type CommunityPlace, type Lang, type PlaceCategory, type ShelterRoute } from '../lib/types';
import { t } from '../lib/strings';
import { tap } from './haptic';

type Props = {
  lang: Lang;
  initialCategory?: PlaceCategory;
  inHomeNote?: string;
  hideCategoryTabs?: boolean;
};

const CATEGORY_META: Record<PlaceCategory, { emoji: string; color: string; labelKey: 'tornadoShelters' | 'foodBanks' | 'hurricaneShelters' | 'warmingCenters' | 'coolingStations' }> = {
  tornado: { emoji: '🌪️', color: COLORS.sky, labelKey: 'tornadoShelters' },
  food: { emoji: '🥫', color: COLORS.mint, labelKey: 'foodBanks' },
  hurricane: { emoji: '🌀', color: COLORS.grape, labelKey: 'hurricaneShelters' },
  warming: { emoji: '❄️', color: COLORS.sun, labelKey: 'warmingCenters' },
  cooling: { emoji: '☀️', color: COLORS.orange, labelKey: 'coolingStations' },
};

export function SheltersCard({
  lang,
  initialCategory = 'tornado',
  inHomeNote,
  hideCategoryTabs = false,
}: Props) {
  const { shelterRoutes } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>(initialCategory);

  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.344;
    if (miles < 0.2) {
      return `${Math.round(meters * 3.28084)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  };

  const routesForCategory = shelterRoutes.filter((r) => r.place.category === selectedCategory);

  const openDirections = (place: CommunityPlace) => {
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const openCall = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleaned}`);
  };

  return (
    <Card color="#0C1B2E" borderColor="#254870" style={{ marginTop: 8, marginBottom: 12 }}>
      {/* Category Tabs: Scrollable for 5 categories (shown in Parent/explore mode, hidden when viewing a specific disaster) */}
      {!hideCategoryTabs && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
        >
          {(Object.keys(CATEGORY_META) as PlaceCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Chip
                key={cat}
                emoji={meta.emoji}
                label={t(lang, meta.labelKey)}
                selected={selectedCategory === cat}
                color={meta.color}
                onPress={() => { tap(); setSelectedCategory(cat); }}
              />
            );
          })}
        </ScrollView>
      )}

      {/* In-Home Safe Spot callout when in tornado mode */}
      {selectedCategory === 'tornado' && inHomeNote && (
        <View style={{
          backgroundColor: '#1E324A',
          borderWidth: 1.5,
          borderColor: COLORS.sun,
          borderRadius: 14,
          padding: 12,
          marginTop: 6,
          marginBottom: 12,
        }}>
          <Row style={{ alignItems: 'center', marginBottom: 4 }}>
            <Txt size={18}>🏠</Txt>
            <Txt size={16} weight="bold" color="#FDE68A" style={{ marginLeft: 6 }}>
              {t(lang, 'inHomeSafeSpot')}
            </Txt>
          </Row>
          <Txt size={14} color="#F8FAFC" style={{ lineHeight: 20 }}>
            {inHomeNote}
          </Txt>
        </View>
      )}

      {/* Header for nearby community resources */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
        <Txt size={17} weight="bold" color="#F8FAFC">
          {selectedCategory === 'tornado'
            ? `📍 ${t(lang, 'publicShelters')}`
            : selectedCategory === 'food'
            ? `📍 ${t(lang, 'foodBanks')}`
            : selectedCategory === 'hurricane'
            ? `📍 ${t(lang, 'hurricaneShelters')}`
            : selectedCategory === 'warming'
            ? `📍 ${t(lang, 'warmingCenters')}`
            : `📍 ${t(lang, 'coolingStations')}`}
        </Txt>
        <Txt size={12} color="#94A3B8">
          {lang === 'es' ? 'Ordenado por cercanía' : 'Sorted by nearest'}
        </Txt>
      </Row>

      {/* Place Items with Precomputed Flood Crossing Analysis */}
      {routesForCategory.map((route) => {
        const place = route.place;
        const desc = pick(place.description, lang);
        const note = pick(place.openNote, lang);

        return (
          <View
            key={place.id}
            style={{
              backgroundColor: '#132338',
              borderWidth: 1.5,
              borderColor: route.hasCrossingRisk ? '#5C2424' : '#243C5C',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}
          >
            {/* Top row: Name + Distance Badge */}
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Txt size={16} weight="bold" color="#FFFFFF">
                  {CATEGORY_META[place.category].emoji} {place.name}
                </Txt>
                <Txt size={13} color="#94A3B8" style={{ marginTop: 2 }}>
                  {place.address}
                </Txt>
                {place.phone && (
                  <Pressable onPress={() => openCall(place.phone!)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Txt size={13} weight="bold" color="#34D399">
                      📞 {place.phone} (tap to call)
                    </Txt>
                  </Pressable>
                )}
              </View>
              <View style={{
                backgroundColor: '#102A45',
                borderWidth: 1,
                borderColor: COLORS.sun,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Txt size={13} weight="bold" color="#FCD34D">
                  📍 {formatDistance(route.distanceM)}
                </Txt>
              </View>
            </Row>

            {/* Description & Hours */}
            <Txt size={13} color="#CBD5E1" style={{ marginTop: 4, lineHeight: 18 }}>
              {desc}
            </Txt>
            {note && (
              <View style={{ marginTop: 6, backgroundColor: '#0B1726', padding: 6, borderRadius: 8 }}>
                <Txt size={12} color="#6EE7B7">
                  ℹ️ {note}
                </Txt>
              </View>
            )}

            {/* Flood Crossing Safety Analysis & Detour Advice */}
            {route.hasCrossingRisk ? (
              <View style={{
                marginTop: 8,
                backgroundColor: '#2D1515',
                borderWidth: 1.5,
                borderColor: COLORS.tomato,
                borderRadius: 10,
                padding: 8,
              }}>
                <Row style={{ alignItems: 'center', marginBottom: 2 }}>
                  <Txt size={14}>⚠️</Txt>
                  <Txt size={13} weight="bold" color="#FCA5A5" style={{ marginLeft: 6, flex: 1 }}>
                    {t(lang, 'routeCrossingWarning', { name: route.crossingName ?? 'Brushy Creek' })}
                  </Txt>
                </Row>
                {route.detourAdvice && (
                  <Txt size={12} color="#FECACA" style={{ marginTop: 2, lineHeight: 16 }}>
                    {t(lang, 'safeDetourTitle')} {pick(route.detourAdvice, lang)}
                  </Txt>
                )}
              </View>
            ) : (
              <View style={{
                marginTop: 8,
                backgroundColor: '#0D261A',
                borderWidth: 1,
                borderColor: '#059669',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}>
                <Txt size={12} weight="semi" color="#6EE7B7">
                  {t(lang, 'routeClear')}
                </Txt>
              </View>
            )}

            {/* Action buttons: Directions & Call */}
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={() => openDirections(place)}
                style={({ pressed }) => [{
                  flex: 1,
                  height: 38,
                  backgroundColor: '#1E3A5F',
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.sky,
                }, pressed && { opacity: 0.85 }]}
              >
                <Txt size={13} weight="bold" color="#38BDF8">
                  🗺️ {t(lang, 'directions')}
                </Txt>
              </Pressable>

              {place.phone && (
                <Pressable
                  onPress={() => openCall(place.phone!)}
                  style={({ pressed }) => [{
                    flex: 1,
                    height: 38,
                    backgroundColor: '#163E2D',
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.mint,
                  }, pressed && { opacity: 0.85 }]}
                >
                  <Txt size={13} weight="bold" color="#6EE7B7">
                    📞 {t(lang, 'callShelter')}: {place.phone}
                  </Txt>
                </Pressable>
              )}
            </Row>
          </View>
        );
      })}
    </Card>
  );
}
