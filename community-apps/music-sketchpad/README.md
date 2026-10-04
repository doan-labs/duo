# Music Sketchpad

Music Sketchpad is a fold-aware step sequencer for Duo. The inner display puts
the sixteen-step grid beside a transport rail with tempo and saved loops, while
the cover flips the pads into big tap targets that stay playable one-handed.

Four voices ship in the box: a plucky keys row that walks a C major pentatonic
scale, a closed hi-hat, a snare and a kick. Tap pads to light them (or drag to
paint a run), tap a track name to mute it, drag the tempo slider between 60 and
184 BPM, and press play. Saved loops live across launches; the current sketch
autosaves a moment after your last edit.

Folding keeps the loop going. Both displays share one session transport, so
the copy on the other screen picks up the same playhead at the same step.
Only the owning copy schedules audio - the mirror just draws - and playback
stops cleanly when the owner pauses or goes away. If the browser withholds
audio until the owner display sees a tap, the app says so in the status line
and wakes on that next tap instead of bursting held notes.
