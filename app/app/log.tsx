import React, { useState } from 'react';
import { Share, View } from 'react-native';
import { Screen } from '../components/Screen';
import { BigButton } from '../components/BigButton';
import { PipSays } from '../components/Pip';
import { AiBadge } from '../components/AiBadge';
import { Card, Chip, Row, Txt } from '../components/ui';
import { COLORS } from '../components/theme';
import { t } from '../lib/strings';
import { useApp } from '../lib/store';
import { OUTCOME_KEY, logToText, skippedCount, wasSkipped } from '../lib/aiLog';

// Every question, and whether the AI answered or was skipped (and why). Stored on this phone only.
export default function Log() {
  const { session, log, clearLog } = useApp();
  const lang = session.lang;
  const [filter, setFilter] = useState<'all' | 'skipped' | 'used'>('all');
  const shown = log.filter((e) => filter === 'all' || (filter === 'skipped') === wasSkipped(e.outcome));

  return (
    <Screen mode="parent">
      <PipSays text={t(lang, 'logIntro')} color={COLORS.sky} />
      <Txt size={30} weight="bold" style={{ marginBottom: 4 }}>📒 {t(lang, 'logTitle')}</Txt>
      <Txt size={18} weight="semi" color="#94A3B8" style={{ marginBottom: 12 }}>
        {t(lang, 'logSummary', { a: skippedCount(log), n: log.length })}
      </Txt>

      <Row style={{ marginBottom: 10 }}>
        <Chip label={t(lang, 'logAll')} selected={filter === 'all'} onPress={() => setFilter('all')} color={COLORS.sky} />
        <Chip label={`⏭️ ${t(lang, 'logSkipped')}`} selected={filter === 'skipped'} onPress={() => setFilter('skipped')} color={COLORS.sun} />
        <Chip label={`🤖 ${t(lang, 'logUsed')}`} selected={filter === 'used'} onPress={() => setFilter('used')} color={COLORS.mint} />
      </Row>

      {log.length === 0 && <Card><Txt size={17} color="#CBD5E1">{t(lang, 'logEmpty')}</Txt></Card>}
      {shown.map((e) => (
        <Card key={e.id}>
          <Txt size={13} weight="medium" color="#94A3B8">
            {new Date(e.at).toLocaleString()} · {e.mode}
          </Txt>
          <Txt size={18} weight="semi" color="#FFFFFF" style={{ marginTop: 2 }}>"{e.question}"</Txt>
          <AiBadge outcome={e.outcome} lang={lang} />
          {e.ruleId ? <Txt size={13} weight="medium" color="#CBD5E1" style={{ marginTop: 6 }}>{t(lang, 'logRule')}: {e.ruleId}</Txt> : null}
          {e.entries?.length ? <Txt size={13} weight="medium" color="#CBD5E1">{t(lang, 'logNotes')}: {e.entries.join(', ')}</Txt> : null}
          {e.raw ? <Txt size={12} weight="medium" color="#FCD34D">AI said: {e.raw}</Txt> : null}
        </Card>
      ))}

      {log.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <BigButton emoji="📤" label={t(lang, 'logShare')} color={COLORS.sky} height={56} fontSize={18}
            onPress={() => Share.share({ message: logToText(log, (o) => t('en', OUTCOME_KEY[o])) }).catch(() => {})} />
          <BigButton emoji="🧹" label={t(lang, 'logClear')} color={COLORS.white} height={56} fontSize={18} onPress={clearLog} />
        </View>
      )}
    </Screen>
  );
}
