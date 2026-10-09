/** Small text formatters shared by the coach panel, coach strip and felt. */

export function percent(value: number | null): string {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
