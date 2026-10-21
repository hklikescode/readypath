import React, { useState } from 'react';
import { Alert, Share } from 'react-native';
import { BigButton } from '../BigButton';
import { Chip, Field, Txt } from '../ui';
import { COLORS } from '../theme';
import { useApp } from '../../lib/store';
import { decodePlan, encodePlan } from '../../lib/planShare';

// Share the plan through the phone's own share sheet (Quick Share, Messages, WhatsApp), or import a pasted code.
export function PlanShare() {
  const { household, updateHousehold } = useApp();
  const [leaveOutAddress, setLeave] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const share = () =>
    Alert.alert(
      'Share the family plan',
      'This includes names, phone numbers, medical notes' + (leaveOutAddress ? '' : ' and your home address') +
        '. Send it only to family. Quick Share sends it straight to the other phone and keeps no copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => Share.share({ message: encodePlan(household, { leaveOutAddress }) }).catch(() => {}) },
      ],
    );

  const doImport = () => {
    const r = decodePlan(code);
    if (!r.ok) { setError(r.error); return; }
    setError('');
    Alert.alert(
      'Import this plan?',
      `${r.household.people.length} people, ${r.household.plan.length} plan notes. It replaces the plan on this phone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', style: 'destructive', onPress: () => { updateHousehold(() => r.household); setCode(''); } },
      ],
    );
  };

  return (
    <>
      <Chip label="Leave out home address" selected={leaveOutAddress} onPress={() => setLeave(!leaveOutAddress)} />
      <BigButton emoji="📤" label="Share this plan" color={COLORS.sky} height={56} fontSize={18} onPress={share} />
      <Field label="Join a family plan: paste the shared plan here" multiline value={code} onChangeText={setCode} />
      {!!error && <Txt size={14} color="#F87171">{error}</Txt>}
      <BigButton emoji="📥" label="Import plan" color={COLORS.mint} height={56} fontSize={18} onPress={doImport} disabled={!code.trim()} style={{ marginBottom: 0 }} />
    </>
  );
}
