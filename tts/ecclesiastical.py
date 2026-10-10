"""Respell Latin into Italian orthography so an Italian TTS voice reads it with
ecclesiastical (Italianate) pronunciation, with Latin stress marked by an accent.

Input may carry macrons (ā ē ī ō ū), which are used for vowel length when placing stress.
"""
import re
import unicodedata

MACRON = "̄"
VOWELS = "aeiouy"
LIQUIDS = "lr"
MUTES = "bcdgptf"
ACCENT = {"a": "à", "e": "è", "i": "ì", "o": "ò", "u": "ù", "y": "ì"}


def _to_marked(word: str) -> list[tuple[str, bool]]:
    """Return [(letter, long?)] with macrons folded into a flag. Lowercase, letters only."""
    out: list[tuple[str, bool]] = []
    for ch in unicodedata.normalize("NFD", word.lower()):
        if ch == MACRON and out:
            out[-1] = (out[-1][0], True)
        elif unicodedata.category(ch) == "Mn":
            continue
        elif ch.isalpha():
            out.append((ch, False))
    return out


def _is_vowel_at(letters: list[tuple[str, bool]], i: int) -> bool:
    """Is letters[i] a vowel nucleus (not consonantal u/i)?"""
    ch = letters[i][0]
    if ch not in VOWELS:
        return False
    prev = letters[i - 1][0] if i > 0 else ""
    nxt = letters[i + 1][0] if i + 1 < len(letters) else ""
    if ch == "u" and prev == "q":
        return False
    if ch == "u" and prev == "g" and i >= 2 and letters[i - 2][0] == "n" and nxt in VOWELS:
        return False  # lingua, sanguis
    if ch == "u" and prev == "s" and i >= 2 and letters[i - 2][0] in "" and nxt in VOWELS:
        return False
    if ch == "i" and nxt in VOWELS and (i == 0 or prev in VOWELS):
        return False  # iam, eius, maior
    return True


def syllables(word: str) -> list[dict]:
    """Split into syllables: [{'nucleus': idx, 'long': bool, 'heavy': bool, 'start': i, 'end': j}]."""
    letters = _to_marked(word)
    nuclei: list[int] = []
    i = 0
    while i < len(letters):
        if _is_vowel_at(letters, i):
            nuclei.append(i)
            # diphthongs: ae, oe, au (and eu in a few words) form one nucleus
            pair = letters[i][0] + (letters[i + 1][0] if i + 1 < len(letters) else "")
            if pair in ("ae", "oe", "au") and _is_vowel_at(letters, i + 1):
                letters[i] = (letters[i][0], True)
                i += 1
        i += 1
    sylls = []
    for n, idx in enumerate(nuclei):
        diphthong = idx + 1 < len(letters) and letters[idx][0] + letters[idx + 1][0] in ("ae", "oe", "au") and letters[idx][1]
        end_idx = idx + (2 if diphthong else 1)
        after = "".join(l[0] for l in letters[end_idx : nuclei[n + 1]]) if n + 1 < len(nuclei) else ""
        # consonant cluster after the vowel; muta cum liquida does not make position
        cluster = after
        if len(cluster) >= 2 and cluster[-2] in MUTES and cluster[-1] in LIQUIDS:
            cluster = cluster[:-2] + cluster[-1:]
            cluster = cluster[:-1] if len(cluster) > 1 and False else cluster
        weight = len(re.sub(r"qu", "q", cluster).replace("x", "ks").replace("z", "dz"))
        if re.fullmatch(r"[bcdgptf][lr]", after):
            weight = 1
        sylls.append(
            {"nucleus": idx, "long": letters[idx][1], "heavy": letters[idx][1] or weight >= 2, "diph": diphthong}
        )
    return sylls


def stressed_syllable(word: str) -> int | None:
    s = syllables(word)
    if not s:
        return None
    if len(s) <= 2:
        return 0
    return len(s) - 2 if s[-2]["heavy"] else len(s) - 3


def respell_word(word: str) -> str:
    """Respell one Latin word (macrons optional) in Italian orthography with a stress accent."""
    letters = _to_marked(word)
    plain = "".join(l[0] for l in letters)
    if not plain:
        return ""
    sylls = syllables(word)
    stress_idx = None
    if len(sylls) > 1:
        k = stressed_syllable(word)
        stress_idx = sylls[k]["nucleus"] if k is not None else None

    out: list[str] = []
    n = len(plain)
    i = 0
    while i < n:
        c = plain[i]
        nxt = plain[i + 1] if i + 1 < n else ""
        nxt2 = plain[i + 2] if i + 2 < n else ""
        prev = plain[i - 1] if i > 0 else ""
        front = nxt in "eiy" or plain[i + 1 : i + 3] in ("ae", "oe")

        def put_vowel(v: str, at: int):
            out.append(ACCENT[v] if stress_idx == at else v)

        if c == "a" and nxt == "e":
            put_vowel("e", i); i += 2; continue
        if c == "o" and nxt == "e":
            put_vowel("e", i); i += 2; continue
        if c in VOWELS:
            put_vowel("i" if c == "y" else c, i); i += 1; continue
        if c == "c":
            if nxt == "h":
                out.append("ch" if nxt2 in "ei" else "c"); i += 2; continue
            out.append("c" if not front else "c"); i += 1; continue
        if c == "g":
            if nxt == "n":
                out.append("gn"); i += 2; continue
            out.append("g"); i += 1; continue
        if c == "s" and nxt == "c" and (nxt2 in "eiy" or plain[i + 2 : i + 4] in ("ae", "oe")):
            out.append("sc"); i += 2; continue
        if c == "t" and nxt == "h":
            out.append("t"); i += 2; continue
        if c == "p" and nxt == "h":
            out.append("f"); i += 2; continue
        if c == "r" and nxt == "h":
            out.append("r"); i += 2; continue
        if c == "t" and nxt == "i" and nxt2 in VOWELS and prev not in "sxt" and i > 0:
            out.append("ts"); i += 1; continue
        if c == "h":
            if plain in ("mihi", "nihil") and i == 2:
                out.append("k")
            i += 1; continue
        if c == "x":
            out.append("ks"); i += 1; continue
        if c == "z":
            out.append("dz"); i += 1; continue
        if c == "q":
            out.append("q"); i += 1; continue
        if c == "j":
            out.append("i"); i += 1; continue
        out.append(c); i += 1
    return "".join(out)


def respell(text: str) -> str:
    return " ".join(respell_word(w) for w in re.split(r"[\s,;]+", text) if w and not w.startswith("-"))
