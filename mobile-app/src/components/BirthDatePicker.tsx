import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DatePickerSheet } from './DatePickerSheet';
import { colors } from '../theme/colors';
import { birthDateToString, birthMonthDays, dateInBirthMonth, moveBirthDateToMonth } from '../utils/birthDate';

export interface BirthDatePickerProps {
  value: Date;
  maximumDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Uses existing React Native components, including in Expo Go. */
export function BirthDatePicker({ value, maximumDate, onConfirm, onCancel }: BirthDatePickerProps) {
  const [selected, setSelected] = useState(value);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const maximum = birthDateToString(maximumDate);
  const years = Array.from({ length: maximumDate.getFullYear() - Math.min(1900, year) + 1 }, (_, index) => maximumDate.getFullYear() - index);
  const moveToMonth = (nextYear: number, nextMonth: number) => {
    setSelected(moveBirthDateToMonth(selected, nextYear, nextMonth, maximumDate));
  };
  const nextMonth = dateInBirthMonth(year, month + 1);
  const canGoNext = birthDateToString(nextMonth) <= maximum;
  const canGoBack = year > 1 || month > 0;

  return (
    <DatePickerSheet onCancel={onCancel} onConfirm={() => onConfirm(selected)}>
      <View style={styles.content}>
        <View style={styles.navigation}>
          <TouchableOpacity style={[styles.arrow, !canGoBack && styles.disabled]} onPress={() => moveToMonth(year, month - 1)} disabled={!canGoBack} accessibilityRole="button" accessibilityLabel="Previous month">
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headingButton} onPress={() => setView(view === 'months' ? 'days' : 'months')} accessibilityRole="button" accessibilityLabel="Choose month">
            <Text style={styles.heading}>{MONTHS[month]}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headingButton} onPress={() => setView(view === 'years' ? 'days' : 'years')} accessibilityRole="button" accessibilityLabel="Choose year">
            <Text style={styles.heading}>{year} ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.arrow, !canGoNext && styles.disabled]} onPress={() => moveToMonth(nextMonth.getFullYear(), nextMonth.getMonth())} disabled={!canGoNext} accessibilityRole="button" accessibilityLabel="Next month">
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>
        {view === 'years' ? (
          <FlatList
            style={styles.yearList}
            data={years}
            numColumns={3}
            keyExtractor={(item) => String(item)}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.option, item === year && styles.active]} onPress={() => { moveToMonth(item, month); setView('months'); }} accessibilityRole="button" accessibilityState={{ selected: item === year }}>
                <Text style={[styles.optionText, item === year && styles.activeText]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        ) : view === 'months' ? (
          <View style={styles.grid}>
            {MONTHS.map((name, index) => {
              const disabled = birthDateToString(dateInBirthMonth(year, index)) > maximum;
              return (
                <TouchableOpacity key={name} style={[styles.option, index === month && styles.active, disabled && styles.disabled]} disabled={disabled} onPress={() => { moveToMonth(year, index); setView('days'); }} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: index === month, disabled }}>
                  <Text style={[styles.optionText, index === month && styles.activeText]}>{name.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {WEEKDAYS.map((day) => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}
              {birthMonthDays(year, month).map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={styles.cell} />;
                const date = dateInBirthMonth(year, month, day);
                const disabled = birthDateToString(date) > maximum;
                const active = day === selected.getDate();
                return (
                  <TouchableOpacity key={day} style={[styles.cell, active && styles.active, disabled && styles.disabled]} onPress={() => setSelected(date)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${day} ${MONTHS[month]} ${year}`} accessibilityState={{ selected: active, disabled }}>
                    <Text style={[styles.day, active && styles.activeText]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.selectedDate}>{selected.getDate()} {MONTHS[month]} {year}</Text>
          </>
        )}
      </View>
    </DatePickerSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 12, paddingBottom: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 30, color: colors.primary },
  headingButton: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  heading: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  day: { fontSize: 15, color: colors.textPrimary },
  option: { width: '33.333333%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  active: { backgroundColor: colors.primary },
  activeText: { color: colors.textWhite },
  disabled: { opacity: 0.3 },
  yearList: { height: 264 },
  selectedDate: { textAlign: 'center', fontSize: 13, color: colors.textSecondary, marginTop: 12 },
});
