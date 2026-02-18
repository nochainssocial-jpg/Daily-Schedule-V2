// app/print-floating.tsx
import React, { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSchedule } from '@/hooks/schedule-store';
import * as Data from '@/constants/data';

type ColKey = 'frontRoom' | 'scotty' | 'twins';

const timeSlots: Array<{
  id: string;
  startTime?: string;
  endTime?: string;
  displayTime?: string;
}> = Array.isArray((Data as any).timeSlots) ? (Data as any).timeSlots : [];

function slotLabel(slot: any): string {
  if (!slot) return '';
  const raw =
    slot.displayTime ||
    (slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : '');
  return String(raw).replace(/\s/g, '').toLowerCase();
}

function isFSOTwinsSlot(slot?: any): boolean {
  const label = slotLabel(slot);
  if (!label) return false;
  return (
    label === '11:00am-11:30am' ||
    label === '11:00-11:30' ||
    label === '1:00pm-1:30pm' ||
    label === '13:00-13:30'
  );
}

export default function PrintFloatingScreen() {
  const { timeSlots } = useSchedule() as any;

  const params = useLocalSearchParams<{ staff?: string; date?: string }>();
  const filterStaffId =
    params.staff && params.staff !== 'ALL' ? String(params.staff) : null;

  const { staff = [], floatingAssignments = {}, selectedDate } =
    useSchedule() as any;

  const staffById = useMemo(() => {
    const m: Record<string, any> = {};
    (staff || []).forEach((s: any) => {
      m[s.id] = s;
    });
    return m;
  }, [staff]);

  const selectedStaffName = useMemo(() => {
    if (!filterStaffId) return 'Everyone';
    return staffById[filterStaffId]?.name || 'Selected staff';
  }, [filterStaffId, staffById]);

  const dateLabel = useMemo(() => {
    if (params.date) {
      const d = new Date(params.date as string);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-AU', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-AU', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return '';
  }, [params.date, selectedDate]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const id = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(id);
    }
  }, []);

  const getRow = (slotId: string) =>
    (floatingAssignments as any)[slotId] || {};

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        paddingVertical: 24,
        paddingHorizontal: 16,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 880,
          alignSelf: 'center',
          paddingBottom: 24,
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: '800',
            marginBottom: 4,
            color: '#111827',
          }}
        >
          Floating Assignments
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: '#4b5563',
            marginBottom: 12,
          }}
        >
          Staff:{' '}
          <Text style={{ fontWeight: '600' }}>{selectedStaffName}</Text>
          {dateLabel ? (
            <>
              {'  '}|{'  '}Date:{' '}
              <Text style={{ fontWeight: '600' }}>{dateLabel}</Text>
            </>
          ) : null}
        </Text>

        {/* Table */}
        <View
          style={{
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#f9fafb',
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <HeaderCell label="Time" flex={1.1} />
            <HeaderCell label="Front Room" />
            <HeaderCell label="Scotty" />
            <HeaderCell label="Twins" />
          </View>

          {(timeSlots || []).map((slot: any, idx: number) => {
            const slotId = String(slot.id ?? idx);
            const row = getRow(slotId);

            const frStaff = row.frontRoom ? staffById[row.frontRoom] : undefined;
            const scStaff = row.scotty ? staffById[row.scotty] : undefined;
            const twStaff = row.twins ? staffById[row.twins] : undefined;

            let fr = '';
            let sc = '';
            let tw = '';

            const fso = isFSOTwinsSlot(slot);

            if (!filterStaffId) {
              fr = frStaff?.name ?? '';
              sc = scStaff?.name ?? '';
              tw = twStaff?.name ?? '';
            } else {
              const matchId = filterStaffId;
              if (frStaff && frStaff.id === matchId) fr = frStaff.name ?? '';
              if (scStaff && scStaff.id === matchId) sc = scStaff.name ?? '';
              if (twStaff && twStaff.id === matchId) tw = twStaff.name ?? '';
            }

            const baseRowStyle =
              idx % 2 === 0
                ? { backgroundColor: '#ffffff' }
                : { backgroundColor: '#f9fafb' };

            return (
              <View
                key={slotId}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e5e7eb',
                  },
                  baseRowStyle,
                ]}
              >
                {/* Time cell */}
                <View
                  style={{
                    flex: 1.1,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRightWidth: 1,
                    borderRightColor: '#e5e7eb',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0f172a',
                    }}
                  >
                    {slot.displayTime ||
                      `${slot.startTime ?? ''} - ${slot.endTime ?? ''}`}
                  </Text>
                </View>

                {/* Front Room */}
                <CellView style={{ flex: 1 }} label={fr} />

                {/* Scotty */}
                <CellView style={{ flex: 1 }} label={sc} />

                {/* Twins */}
                <CellView
                  style={[
                    { flex: 1 },
                    fso ? { backgroundColor: '#fef2f2' } : null,
                  ]}
                  label={tw}
                  fsoTag={fso}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function HeaderCell({ label, flex = 1 }: { label: string; flex?: number }) {
  return (
    <View
      style={{
        flex,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#0f172a',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function CellView({
  label,
  style,
  fsoTag,
}: {
  label: string;
  style?: any;
  fsoTag?: boolean;
}) {
  const trimmed = (label || '').trim();
  const isEmpty = !trimmed;

  return (
    <View
      style={[
        {
          paddingVertical: 10,
          paddingHorizontal: 8,
          borderLeftWidth: 1,
          borderLeftColor: '#e5e7eb',
          justifyContent: 'center',
          position: 'relative',
        },
        style,
      ]}
    >
      {isEmpty ? (
        <Text
          style={{
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          {/* blank or dash – choose style you prefer */}
        </Text>
      ) : (
        <Text
          style={{
            color: '#0f172a',
            fontWeight: '600',
            fontSize: 13,
          }}
        >
          {trimmed}
        </Text>
      )}

      {fsoTag && (
        <View
          style={{
            position: 'absolute',
            right: 8,
            bottom: 6,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 2,
              paddingHorizontal: 6,
              backgroundColor: '#fce7f3',
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: '#be185d',
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              FSO
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
