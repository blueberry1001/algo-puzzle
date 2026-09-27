"""Create original, nonverbal fictional scene audio; no microphone or external assets."""
import math, random, struct, wave
from pathlib import Path

target = Path(__file__).resolve().parent.parent / 'media'
rate = 22050
for track in range(1, 4):
    rng = random.Random(917 + track)
    duration = 12 + track * 2
    samples = []
    for i in range(rate * duration):
        t = i / rate
        fade = min(1, t / .4, (duration - t) / .7)
        value = .016 * math.sin(2 * math.pi * 70 * t) + .008 * rng.uniform(-1, 1)
        for foot in [1.1, 1.65, 3.2, 3.7, 8.1, 8.8]:
            elapsed = t - foot
            if 0 < elapsed < .17:
                value += .24 * math.exp(-elapsed * 30) * math.sin(2 * math.pi * (100 - elapsed * 180) * elapsed)
        if track == 1 and 5 < t < 5.6:
            value += .05 * rng.uniform(-1, 1) * math.sin(math.pi * (t-5)/.6)
        if track == 2:
            for at, hz in [(4, 660), (4.4, 880), (4.8, 990)]:
                if 0 < t-at < 1.8:
                    value += .09 * math.exp(-(t-at)*2.7) * math.sin(2*math.pi*hz*(t-at))
        if track == 3 and 10 < t < 10.15:
            value += .11 * math.sin(2 * math.pi * 1100 * t)
        samples.append(struct.pack('<h', int(max(-1, min(1, value * fade)) * 32767)))
    with wave.open(str(target / f'recording-{track}.wav'), 'wb') as out:
        out.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        out.writeframes(b''.join(samples))
    print(f'recording-{track}.wav: {duration}s')
