# Tennis for Two

A Duo take on the 1958 oscilloscope game. The court is seen from the side: a glowing ball
flies under gravity over a low net, and you strike it whenever it is on your half.

## Play

- **Strike:** when the ring appears around the ball, tap where you want it to land on the far
  half. A tap low over the court drives the ball just over the net; a tap high above it lobs.
- **Serve:** the ball waits in the server's hand; serve changes every two points, every point at 10-10.
- **Points:** a ball in the net, long, or landing twice on a side scores for the other player.
  First to 11, win by 2.
- **Opponent:** play the bot on Easy, Normal or Hard, or pick 2 Players and share the screen,
  each player tapping their own half.
- **Keyboard:** Space or A strikes, W and S raise and lower the angle; in 2 Players the right
  player uses Enter and the arrow keys.

The score and the record against the bot are kept in app storage, so a match survives a fold
and a relaunch. Only the display you are looking at runs the rally and makes sound; the other
copy draws the same score.

## Verify

From the repository root:

```sh
bun scripts/check-submissions.ts community-apps/tennis-for-two
```

## Layout

| File | Purpose |
| --- | --- |
| `manifest.json` | Identity `com.adrianpetkov.duo.tennisfortwo`, version, author, license |
| `main.tsx` | Display wiring, storage, input and the score board |
| `game.ts` | Rules, physics and the bot |
| `draw.ts` | Canvas paint of the scope, with colours read from the kit's tokens |
| `audio.ts` | Synth blips, no assets |
| `styles.ts` | Token-based layout |
| `icon.png`, `screenshots/` | 1024 px icon, inner display and cover |
