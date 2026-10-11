"""Restored classical Latin pronunciation as IPA, from macronized spelling.

Vowel length comes from the macrons; stress from the penultimate rule
(heavy penult takes the stress, otherwise the antepenult). Output uses only
symbols that both Piper (espeak IPA) and Kokoro accept.
"""
import re
import unicodedata

LONG = {"ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u", "ȳ": "y"}
SHORT_Q = {"a": "a", "e": "ɛ", "i": "ɪ", "o": "ɔ", "u": "ʊ", "y": "y"}
LONG_Q = {"a": "aː", "e": "eː", "i": "iː", "o": "oː", "u": "uː", "y": "yː"}
DIPH = {"ae": "aj", "au": "aw", "oe": "oj", "ei": "ej", "eu": "ew"}
STOPS = set("pbtdkgf")
LIQUIDS = set("lr")


def _tokens(word: str):
    """Split a lowercase word into (kind, sound, letters) units: kind is 'V' (vowel nucleus) or 'C'."""
    w = unicodedata.normalize("NFC", word.lower()).replace("j", "i")
    out = []
    i = 0
    while i < len(w):
        c = w[i]
        nxt = w[i + 1] if i + 1 < len(w) else ""
        prev_v = bool(out) and out[-1][0] == "V"
        base_next = LONG.get(nxt, nxt)
        if c in "aeiouy" and c + nxt in DIPH and not (c + nxt in ("ei", "eu") and i + 2 < len(w) and w[i + 2] in "aeiouāēīōū"):
            # ei/eu are rare true diphthongs; treat them as such only word-finally or before a consonant
            if c + nxt in ("ae", "au", "oe") or (i + 2 >= len(w)):
                out.append(("V", DIPH[c + nxt], 2, True))
                i += 2
                continue
        if c == "i" and (i == 0 or prev_v) and base_next in "aeiouy" and nxt:
            # consonantal i: iam, maior (intervocalic i is doubled: mai-ior)
            if prev_v and i > 0:
                out.append(("C", "j", 1, False))
            out.append(("C", "j", 1, False))
            i += 1
            continue
        if c in LONG:
            out.append(("V", LONG_Q[LONG[c]], 1, True))
        elif c in SHORT_Q:
            if c == "u" and out and out[-1][1] in ("k", "g") and base_next in "aeiouy" and nxt and (out[-1][3] or (out[-1][1] == "g" and len(out) > 1 and out[-2][1] == "ŋ")):
                out[-1] = ("C", out[-1][1] + "w", 1, False)  # qu, ngu → kw, gw
            elif c == "u" and (i == 0 or prev_v) and base_next in "aeiouy" and nxt:
                out.append(("C", "w", 1, False))  # u written for v
            else:
                out.append(("V", SHORT_Q[c], 1, False))
        elif c == "v":
            out.append(("C", "w", 1, False))
        elif c in "cq":
            out.append(("C", "k", 1, c == "q"))  # 4th field marks q, so cuius stays /kʊjʊs/
        elif c == "x":
            out += [("C", "k", 1, False), ("C", "s", 1, False)]
        elif c == "z":
            out += [("C", "d", 1, False), ("C", "z", 1, False)]
        elif c == "h":
            if out and out[-1][1] in ("p", "t", "k"):
                i += 1
                continue  # ph th ch: plain stops
            out.append(("C", "h", 1, False))
        elif c == "n" and base_next in ("c", "g", "q", "x", "k"):
            out.append(("C", "ŋ", 1, False))
        elif c == "g" and nxt == "n":
            out.append(("C", "ŋ", 1, False))
        elif c.isalpha():
            out.append(("C", c, 1, False))
        i += 1
    return out


def _stress_index(units) -> int | None:
    """Index of the stressed vowel unit."""
    vs = [k for k, u in enumerate(units) if u[0] == "V"]
    if len(vs) < 2:
        return vs[0] if vs else None
    if len(vs) == 2:
        return vs[0]
    pen = vs[-2]
    heavy = units[pen][3]
    if not heavy:
        cons = [u[1] for u in units[pen + 1 : vs[-1]]]
        # closed syllable, unless the cluster is stop + liquid (muta cum liquida)
        if len(cons) >= 2 and not (len(cons) == 2 and cons[0][0] in STOPS and cons[1] in LIQUIDS):
            heavy = True
        if len(cons) == 1 and cons[0] in ("ks", "dz"):
            heavy = True
    return pen if heavy else vs[-3]


def word_ipa(word: str) -> str:
    units = _tokens(word)
    st = _stress_index(units)
    if st is None:
        return "".join(u[1] for u in units)
    # the stress mark goes before the onset: the consonants just before the vowel that start a syllable
    on = st
    prev = st - 1
    cons = []
    while prev >= 0 and units[prev][0] == "C":
        cons.insert(0, units[prev][1])
        prev -= 1
    if cons:
        take = 2 if len(cons) >= 2 and cons[-2][0] in STOPS and cons[-1] in LIQUIDS else 1
        if prev < 0:
            take = len(cons)  # word-initial cluster stays together
        on = st - take
    parts = [u[1] for u in units]
    vs = sum(1 for u in units if u[0] == "V")
    if vs > 1:
        parts.insert(on, "ˈ")
    s = "".join(parts)
    # geminates: tt → tː
    return re.sub(r"([bdfgklmnprst])\1", r"\1ː", s)


def text_ipa(text: str) -> str:
    return " ".join(word_ipa(w) for w in re.findall(r"[^\W\d_]+", text))


if __name__ == "__main__":
    import sys
    for w in sys.argv[1:] or ["amāvī", "cōnsul", "puella", "aequus", "quaerō", "vīcī", "magnus", "iūlius", "maior", "philosophia", "dīcitur", "tenebrae", "accesserimus", "adhibeāris", "cuius", "lingua", "exercitus", "fēcērunt", "rēx"]:
        print(w, word_ipa(w))
