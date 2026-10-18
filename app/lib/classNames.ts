export const classNames = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");
