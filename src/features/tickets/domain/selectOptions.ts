/**
 * A native HTML select falls back to its first option when its current value
 * is absent from the rendered list. Keep the draft value visible instead of
 * silently displaying an unrelated WSN category.
 */
export function withSelectedOption(options: readonly string[], selectedValue: string): string[] {
  const selected = selectedValue.trim();
  const normalizedOptions = options.map((option) => option.trim()).filter(Boolean);

  if (!selected || normalizedOptions.includes(selected)) {
    return normalizedOptions;
  }

  return [selected, ...normalizedOptions];
}
