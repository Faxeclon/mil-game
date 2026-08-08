# Recorded lines

Empty on purpose. The game narrates with the device's own voice, which is the decision the
team took: it works on any phone, weighs nothing, needs no account and no licence to check.

The layer that would play recordings is built and tested anyway, because it costs nothing
while this folder is empty — every line simply falls through to the synthesiser. If a
better voice is ever wanted, it can be added later without touching a single component.

## Adding recordings later

```bash
node scripts/collect-voice-lines.mjs     # writes scripts/voice-lines.json
pip install kokoro soundfile             # Kokoro is Apache 2.0: no licence to clear
python scripts/generate-voice.py         # fills this folder and rewrites manifest.json
```

Files land here as `<locale>/<name>.mp3`, where the name is a hash of the line itself. The
game asks for that name, plays the file if the manifest lists it, and speaks the line
itself when it does not. Recordings can therefore be added a handful at a time.

**One consequence worth knowing:** the name comes from the words. Edit a line in
`src/messages/*.json` and its recording stops matching, so that line quietly returns to the
synthesiser until it is generated again. That is deliberate — the alternative is a clip
confidently saying the old wording.

`manifest.json` stays here even while empty. Without it every visit would ask the network
for a file that is not there, which is a wasted request on a phone that has few to spare.
