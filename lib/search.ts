import type {Entry} from './types';

/** Normalizes accents and casing for human-friendly Portuguese searches. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function searchableEntry(entry: Entry): string {
  return normalizeSearch([
    entry.title,
    entry.body,
    entry.tag,
    entry.data.url,
    entry.data.source,
    entry.data.answer,
    entry.data.explanation,
    ...(entry.data.options ?? []),
  ].filter(Boolean).join(' '));
}

export function matchesSearch(entry: Entry, query: string): boolean {
  return searchableEntry(entry).includes(normalizeSearch(query.trim()));
}
