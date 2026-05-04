import { Prisma } from '@core/prisma/generated/prisma/client';

export const noteListItemSelect = {
  id: true,
  previewText: true,
  updatedAt: true,
  createdAt: true,
} satisfies Prisma.NoteSelect;

export type NoteListItem = Prisma.NoteGetPayload<{
  select: typeof noteListItemSelect;
}>;

export type NoteListStream = {
  id: string;
  name: string;
};

export function mapNoteListItemsWithStreams(
  notes: NoteListItem[],
  streamsByNoteId: Map<string, NoteListStream[]>,
) {
  return notes.map((note) => ({
    ...note,
    streams: streamsByNoteId.get(note.id) ?? [],
  }));
}
