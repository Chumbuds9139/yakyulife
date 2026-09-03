from pathlib import Path
import re

p=Path('src/flow/phases.js')
s=p.read_text(encoding='utf-8')
old=s
# In the university annual decision block, Japanese players enter NPB through the draft.
# Remove the separate direct-NPB contract path, leaving the NPB draft, MLB overseas path,
# and the option to stay in university.
start=s.find("  /* 大學季前：是否投入選秀與旅外（大二～大四） */")
if start < 0:
    raise SystemExit('university decision block not found')
end=s.find("  if(S.stage==='U'", start + 10)
# The next U-stage condition is not necessarily the end marker, so target the known tail.
marker="  /* 續留選項固定放在所有選秀／旅外選項之後。 */"
tail=s.find(marker, start)
if tail < 0:
    raise SystemExit('university decision tail not found')
# Preserve the tail and following code, replacing only the block's direct NPB calculation/offer.
block=s[start:tail]
block2=re.sub(r"\n    /\* 年齡懲罰：每長一歲，門檻微調，但簽約金大幅縮水 \*/.*?\n    const goPro=finishDecision;\n    if\(o>=reqNPB\)opts\.push\(\{t:'洽談日職合約'.*?\n      pickOfferUI\('日職球團報價','NPB',makeOffers\('NPB',2,bonusNPB,2,3,'NPB2',null\),goPro\);\}\}\);", "", block, flags=re.S)
if block2 == block:
    raise SystemExit('direct NPB option pattern not found')
s=s[:start]+block2+s[tail:]
# Clean the now-unused explanatory comment if any remains.
s=s.replace("  /* 大學季前：是否投入選秀與旅外（大二～大四） */", "  /* 大學季前：日本職棒選秀／旅外（大二～大四） */")
if s == old:
    raise SystemExit('no changes made')
p.write_text(s,encoding='utf-8')
print('updated src/flow/phases.js')
