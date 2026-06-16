import type { BusinessHours, DaySchedule } from "@petdots/shared";

export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

export function formatDaySchedule(schedule: DaySchedule | null | undefined): string {
  if (!schedule) return "Fechado";
  return `${schedule.open} às ${schedule.close}`;
}

export const BUSINESS_HOURS_GROUPS: { key: keyof BusinessHours; label: string }[] = [
  { key: "weekdays", label: "Segunda a Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingos e Feriados" },
];
