"""
Turns the collected lines into the audio files the game plays.

    pip install kokoro soundfile
    node scripts/collect-voice-lines.mjs     # writes scripts/voice-lines.json
    python scripts/generate-voice.py

Needs ffmpeg on the PATH for the mp3 step. Google Colab already has it; on Windows it
comes with `winget install ffmpeg`.

Writes:
    public/audio/voice/<locale>/<name>.mp3
    public/audio/voice/manifest.json

Kokoro is Apache 2.0 and its voices are presets rather than clones of anyone, so nothing
generated here belongs to a person who would have to be asked. That is the reason it was
chosen over the services that sound like a particular actor.

Nothing here is destructive: a line whose file already exists is skipped, so this can be
run again after adding a few lines without regenerating the rest.
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import soundfile as sf
    from kokoro import KPipeline
except ImportError:  # pragma: no cover - a setup problem, not a runtime one
    sys.exit("Missing dependencies. Run: pip install kokoro soundfile")

ROOT = Path(__file__).resolve().parent.parent
LINES_FILE = ROOT / "scripts" / "voice-lines.json"
OUT_DIR = ROOT / "public" / "audio" / "voice"

SAMPLE_RATE = 24_000
# Mono and low: this is one voice reading short sentences, not music. The difference
# between 32k and 128k here is inaudible on a phone speaker and four times the download.
MP3_BITRATE = "32k"

# lang_code is Kokoro's own: 'e' is Spanish, 'a' is American English.
VOICES = {
    "es": {"lang_code": "e", "voice": "ef_dora"},
    "en": {"lang_code": "a", "voice": "af_heart"},
}

# A shade under one, matching the synthesiser: the default outruns a child reading along.
SPEED = 0.92


def to_mp3(samples, destination: Path) -> None:
    """Writes a wav, hands it to ffmpeg, and keeps only the mp3."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        wav_path = Path(handle.name)
    try:
        sf.write(wav_path, samples, SAMPLE_RATE)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path),
             "-ac", "1", "-b:a", MP3_BITRATE, str(destination)],
            check=True,
        )
    finally:
        wav_path.unlink(missing_ok=True)


def main() -> None:
    if not LINES_FILE.exists():
        sys.exit("No scripts/voice-lines.json. Run: node scripts/collect-voice-lines.mjs")

    lines_by_locale = json.loads(LINES_FILE.read_text(encoding="utf8"))
    manifest: dict[str, list[str]] = {}

    for locale, lines in lines_by_locale.items():
        settings = VOICES.get(locale)
        if not settings:
            print(f"! no voice configured for '{locale}', skipping")
            continue

        folder = OUT_DIR / locale
        folder.mkdir(parents=True, exist_ok=True)
        pipeline = KPipeline(lang_code=settings["lang_code"])
        made: list[str] = []

        for index, line in enumerate(lines, start=1):
            destination = folder / f"{line['name']}.mp3"
            if destination.exists():
                made.append(line["name"])
                continue

            print(f"[{locale} {index}/{len(lines)}] {line['text'][:60]}")
            chunks = [
                audio
                for _, _, audio in pipeline(line["text"], voice=settings["voice"], speed=SPEED)
            ]
            if not chunks:
                print("  ! produced nothing, skipped")
                continue

            # A long line comes back in pieces; they are one sentence and belong together.
            samples = chunks[0] if len(chunks) == 1 else __import__("numpy").concatenate(chunks)
            to_mp3(samples, destination)
            made.append(line["name"])

        manifest[locale] = made
        total_kb = sum(f.stat().st_size for f in folder.glob("*.mp3")) / 1024
        print(f"\n{locale}: {len(made)} clips, {total_kb:,.0f} KB\n")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf8"
    )
    print(f"Wrote {OUT_DIR / 'manifest.json'}")


if __name__ == "__main__":
    main()
