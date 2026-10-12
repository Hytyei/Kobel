#!/usr/bin/env python3
"""Checks that the Tactics Room lessons only use German from the class notes.
Usage: python3 validate_teaching.py   (run from anywhere; exits 1 on problems)"""
import json, re, glob, os, sys
here = os.path.dirname(os.path.abspath(__file__))
notes = sorted(glob.glob(os.path.join(here, "..", "*.notes")))
TOK = re.compile(r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*")
corpus, subjects = set(), set()
for p in notes:
    for line in open(p, encoding="utf-8"):
        if line.startswith("@subject"): subjects.add(line[8:].strip()); continue
        for t in TOK.findall(line): corpus.add(t.lower().strip("-"))
# subjects of the first four sessions live in the app's built-in seed (001-004 are untagged copies)
subjects |= {"Classroom & instructions","Countries & languages","Introductions & names","Sounds & articles","Greetings & polite phrases","Jobs & work","Questions & answers","Everyday verbs","Numbers","Personal details"}
# extra tokens used only as numbers/names already inside the notes' wording (documented, kept tiny)
ALLOW = set()
units = json.load(open(os.path.join(here, "units.json"), encoding="utf-8"))
GER_TABLES = {"sein = to be","heißen = to be called","haben = to have","Stems ending in -t","sprechen (e → i)","nehmen (e → i, double m)","lesen (e → ie)","schlafen (a → ä)","Regular endings","mein / meine","er / sie / es for things","Positive question","Negative question"}
bad = []
def chk(where, text):
    for t in TOK.findall(text):
        t = t.lower().strip("-")
        if len(t) > 1 and t not in corpus and t not in ALLOW:
            bad.append((where, t, text))
seen_subjects = set()
for u in units:
    if u.get("covers"): seen_subjects.add(u["covers"])
    if u["subject"]:
        seen_subjects.add(u["subject"])
        if u["subject"] not in subjects: bad.append((u["id"], "subject", u["subject"]))
    for i, b in enumerate(u["boards"]):
        w = f'{u["id"]}#{i}:{b["k"]}'
        k = b["k"]
        if k == "words":
            for it in b["items"]: chk(w, it[0])
        elif k == "dlg":
            for ln in b["lines"]: chk(w, ln[1])
        elif k == "table" and b["h"] in GER_TABLES:
            for r in b["rows"]:
                chk(w, r[1] if b["h"] not in ("mein / meine","er / sie / es for things","Positive question","Negative question") else r[0]+" "+r[1])
        elif k == "slots":
            for r in b["rows"]:
                for p in r["parts"]: 
                    if len(p) < 3 or True: chk(w, p[0]) if p[0][0:1].isalpha() and p[0] not in ("verb",) else None
        elif k == "order":
            for x in b["words"]: chk(w, x)
        elif k == "drill":
            if not (0 <= b["a"] < len(b["opts"])): bad.append((w, "answer index", b["a"]))
            if b.get("de"): chk(w, b["de"])
        elif k == "recap":
            if b["subject"] and b["subject"] not in subjects: bad.append((w, "subject", b["subject"]))
        if k == "table" and b["h"] in GER_TABLES and b["h"] in ("sein = to be",) and len(b["rows"]) != 6: bad.append((w,"rows",len(b["rows"])))
missing = subjects - seen_subjects
if missing: bad.append(("coverage", "subjects not taught", sorted(missing)))
for x in bad: print("PROBLEM", x)
print(f"{len(units)} units, {sum(len(u['boards']) for u in units)} boards, {len(bad)} problems")
sys.exit(1 if bad else 0)
