import { useId, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  PressableStateCallbackType,
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { Colors, FontFamily, MonoFamily, Radius, Spacing } from './theme';

/**
 * `hovered` is real on React Native Web and absent from the React Native types,
 * because hover does not exist on a touchscreen. Declaring it here is the whole
 * cost of having desktop hover feedback across the app.
 */
type PressableState = PressableStateCallbackType & { readonly hovered?: boolean };

/**
 * The UI vocabulary of the spike, and the instrument of measurement A5
 * (ADR-0008).
 *
 * React Native Web renders everything as `<div>`: no heading, no landmark, no
 * `<button>`, no selectable text. The question the gate answers is not whether
 * that can be corrected — it can — but **where** the correction lives. Every
 * accessibility decision below is written once, inside a wrapper, and applies
 * to every screen that uses it. What could NOT be generalised is marked
 * `A5-MANUAL` at the point of use, and counted in the report.
 */

type Level = 1 | 2 | 3 | 4;

const HEADING_SIZE: Record<Level, number> = { 1: 30, 2: 22, 3: 17, 4: 14 };

/**
 * A heading. RNW has no `<h1>`; `role="heading"` plus `aria-level` is the
 * documented equivalent and is what a screen reader announces.
 */
export function Heading({
  level,
  children,
  style,
}: {
  level: Level;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      role="heading"
      aria-level={level}
      style={[styles.heading, { fontSize: HEADING_SIZE[level] }, style]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  numberOfLines,
  style,
  role,
}: {
  children: ReactNode;
  muted?: boolean;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  /** `alert` and `status` are how a screen reader is told to announce a
   * message that appeared without the person asking for it — a failed sign-in,
   * an empty result. Without it the text is drawn and never spoken. */
  role?: 'alert' | 'status';
}) {
  return (
    <Text
      role={role}
      numberOfLines={numberOfLines}
      style={[styles.body, muted && styles.muted, style]}
    >
      {children}
    </Text>
  );
}

/** Money and codes: tabular figures so columns of prices line up. */
export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

export type LandmarkRole = 'banner' | 'navigation' | 'main' | 'contentinfo' | 'region';

/**
 * A page region. RNW emits a flat sea of `<div>`, so without this every screen
 * fails the axe rule "all page content should be contained by landmarks".
 */
export function Landmark({
  role,
  label,
  children,
  style,
}: {
  role: LandmarkRole;
  label?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View role={role} aria-label={label} style={style}>
      {children}
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Section({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type ButtonTone = 'primary' | 'neutral' | 'danger';

export function Button({
  label,
  onPress,
  tone = 'neutral',
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      style={({ pressed, hovered }: PressableState) => [
        styles.button,
        compact && styles.buttonCompact,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'danger' && styles.buttonDanger,
        hovered && styles.buttonHovered,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'primary' && styles.buttonLabelPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A labelled text input.
 *
 * The keyboard and autofill props are passed straight through to `TextInput`
 * rather than reinvented: they are what makes an e-mail field offer an e-mail
 * keyboard and a password field hide what is typed, and every one of them is a
 * property of *this* field, not of the wrapper.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  style,
  secureTextEntry,
  keyboardType,
  inputMode,
  autoCapitalize,
  autoComplete,
  maxLength,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  inputMode?: TextInputProps['inputMode'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
}) {
  // The label/input/hint/error association is built here so no screen has to
  // invent ids: RNW gives `<TextInput>` no `<label>` of its own.
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter((id): id is string => id !== null)
    .join(' ');

  return (
    <View style={[styles.field, style]}>
      <Text nativeID={labelId} style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        aria-labelledby={labelId}
        aria-describedby={describedBy.length > 0 ? describedBy : undefined}
        aria-invalid={Boolean(error)}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {hint ? (
        <Text nativeID={`${fieldId}-hint`} style={styles.fieldHint}>
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text nativeID={`${fieldId}-error`} role="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A small set of mutually exclusive options, as chips.
 *
 * Chips and not a `<select>` for the same reason the neighbourhood picker uses
 * them: a native picker on a phone hides every option behind a modal, and with
 * two or three of them the whole set fits on screen.
 *
 * `radiogroup`/`radio` rather than a row of buttons: RNW draws `<div>`s, so
 * without the roles a screen reader announces three unrelated controls instead
 * of one choice with three options — and `aria-checked` is what says which.
 */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View role="radiogroup" aria-label={label} style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onPress={() => {
                onChange(option.value);
              }}
              style={({ hovered }: PressableState) => [
                styles.chip,
                hovered && !selected && styles.buttonHovered,
                selected && styles.chipSelected,
              ]}
            >
              <Text style={[styles.body, selected && styles.chipLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger';

const BADGE_BACKGROUND: Record<BadgeTone, string> = {
  neutral: Colors.surfaceAlt,
  accent: Colors.accentSoft,
  positive: Colors.positiveSoft,
  warning: Colors.warningSoft,
  danger: Colors.dangerSoft,
};

const BADGE_TEXT: Record<BadgeTone, string> = {
  neutral: Colors.textMuted,
  accent: Colors.accent,
  positive: Colors.positive,
  warning: Colors.warning,
  danger: Colors.danger,
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_BACKGROUND[tone] }]}>
      <Text style={[styles.badgeLabel, { color: BADGE_TEXT[tone] }]}>{label}</Text>
    </View>
  );
}

/**
 * Table shell. The comparator IS a table; pretending otherwise is the trap.
 * The four wrappers carry `table`/`row`/`columnheader`/`cell` so the structure
 * survives into the accessibility tree instead of collapsing into `<div>`s.
 */
export function Table({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View role="table" aria-label={label} style={styles.table}>
      {children}
    </View>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <View role="row" style={[styles.row, styles.headerRow]}>
      {children}
    </View>
  );
}

export function TableRow({
  children,
  onPress,
  zebra,
  label,
}: {
  children: ReactNode;
  onPress?: () => void;
  zebra?: boolean;
  label?: string;
}) {
  if (!onPress) {
    return (
      <View role="row" style={[styles.row, zebra && styles.rowZebra]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      role="row"
      aria-label={label}
      style={({ hovered }: PressableState) => [
        styles.row,
        zebra && styles.rowZebra,
        hovered && styles.rowHovered,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Cell({
  children,
  width,
  align = 'left',
  header,
}: {
  children: ReactNode;
  width: number;
  align?: 'left' | 'right';
  header?: boolean;
}) {
  return (
    <View
      role={header ? 'columnheader' : 'cell'}
      style={[styles.cell, { flexGrow: width, flexBasis: width * 8 }]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          numberOfLines={2}
          style={[
            styles.body,
            header && styles.columnHeaderLabel,
            align === 'right' && styles.alignRight,
          ]}
        >
          {children}
        </Text>
      ) : (
        <View style={align === 'right' ? styles.cellRight : undefined}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  section: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  // `userSelect: 'text'` is the one style every piece of text needs on the web:
  // RNW ships `user-select: none` so a long-press on mobile does not select, and
  // that makes copying a price impossible with the mouse (B2).
  heading: { fontFamily: FontFamily, fontWeight: '700', color: Colors.text, userSelect: 'text' },
  body: {
    fontFamily: FontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    userSelect: 'text',
  },
  muted: { color: Colors.textMuted },
  mono: {
    fontFamily: MonoFamily,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    color: Colors.text,
    userSelect: 'text',
  },
  alignRight: { textAlign: 'right' },
  cellRight: { alignItems: 'flex-end' },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  buttonPrimary: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  buttonDanger: { borderColor: Colors.danger },
  buttonHovered: { backgroundColor: Colors.surfaceAlt },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { fontFamily: FontFamily, fontSize: 14, fontWeight: '600', color: Colors.text },
  buttonLabelPrimary: { color: '#FFFFFF' },
  field: { gap: Spacing.xs },
  fieldLabel: {
    fontFamily: FontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  input: {
    fontFamily: FontFamily,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.danger },
  fieldHint: { fontFamily: FontFamily, fontSize: 12, color: Colors.textMuted },
  fieldError: { fontFamily: FontFamily, fontSize: 12, color: Colors.danger },
  // Same shape as the neighbourhood chips of the comparator; `flexWrap` is what
  // keeps them on screen at 390px.
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipLabelSelected: { color: '#FFFFFF', fontWeight: '600' },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  badgeLabel: { fontFamily: FontFamily, fontSize: 12, fontWeight: '600' },
  table: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  headerRow: { backgroundColor: Colors.surfaceAlt },
  rowZebra: { backgroundColor: '#FBFCFD' },
  rowHovered: { backgroundColor: Colors.accentSoft },
  columnHeaderLabel: { fontWeight: '700', fontSize: 13, color: Colors.textMuted },
  cell: { minWidth: 0 },
});
