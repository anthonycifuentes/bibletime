import { useMemo } from "react"

import { useTranslation } from "@/modules/core/i18n"
import type { Song } from "@/modules/songs/interfaces"
import { filterSongs } from "@/modules/songs/lib/filter-songs"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

interface SongListProps {
  songs: Song[]
  selectedSongId: string | null
  query: string
  canWrite: boolean
  onQueryChange: (query: string) => void
  onSelectSong: (songId: string) => void
  onNewSong: () => void
  onSearchWeb: () => void
}

/**
 * The Songs tab's first column: the repertoire, a search box filtering it by
 * title/author/lyrics, and the two ways to get a new song in — write one or
 * import one.
 */
export function SongList({
  songs,
  selectedSongId,
  query,
  canWrite,
  onQueryChange,
  onSelectSong,
  onNewSong,
  onSearchWeb,
}: SongListProps) {
  const { t } = useTranslation()

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t("songs.searchPlaceholder")}
        aria-label={t("songs.searchAriaLabel")}
        className="shrink-0"
      />

      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!canWrite}
          onClick={onNewSong}
        >
          {t("songs.newSong")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={!canWrite}
          onClick={onSearchWeb}
        >
          {t("songs.searchWeb")}
        </Button>
      </div>

      {!canWrite ? (
        <p className="shrink-0 text-xs text-muted-foreground">{t("songs.readOnly")}</p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {songs.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-sm font-medium">{t("songs.emptyLibraryTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("songs.emptyLibraryDescription")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{t("songs.noResults", { query })}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => onSelectSong(song.id)}
                  aria-current={song.id === selectedSongId}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
                    song.id === selectedSongId && "bg-accent"
                  )}
                >
                  <span className="block truncate text-sm font-medium">{song.title}</span>
                  {song.author ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {song.author}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
