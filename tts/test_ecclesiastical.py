import sys; sys.path.insert(0, "tts")
from ecclesiastical import respell_word as r, stressed_syllable as st, syllables

cases = {
    "caelum": "chèlum" if False else "cèlum",   # ae -> e, c+e = ch
    "cīvis": "cìvis",
    "amīcitia": "amicìtsia",   # penult long -> stress on ci; ti+a -> tsia
    "gaudeō": "gàudeo",
    "agō": "àgo",
    "aqua": "àqua",
    "lingua": "lìngua",
    "quod": "quod",
    "scientia": "scièntsia",
    "dīcō": "dìco",
    "fīlius": "fìlius",
    "homō": "òmo",
    "nihil": "nìkil",
    "ecclēsia": "ecclèsia",
    "tenebrae": "tènebre",
    "iam": "iam",
    "pāx": "paks",
    "gēns": "gens",
    "Christus": "crìstus",
}
bad = 0
for w, exp in cases.items():
    got = r(w)
    flag = "ok " if got == exp else "BAD"
    bad += got != exp
    print(flag, w, got, "" if got == exp else f"(expected {exp})")
print("bad:", bad)
