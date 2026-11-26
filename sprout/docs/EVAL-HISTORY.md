# Eval history

Each blind set is measured once before any rule changes it informs, and recorded here.

| Date | Set | Leaks (details reaching cloud) | Urgent caught | Concern caught | False alarms | Notes |
|---|---|---|---|---|---|---|
| 2026-11-14 | heldout.jsonl (blind v1, 121 q) | 5 of 47 | 4 of 15 | 8 of 10 | 1 of 96 | School initials, "lane no. 7", DOB, 2 unlisted names; indirect self-harm and abuse phrasing |
| 2026-11-14 | heldout2.jsonl (blind v2, 151 q) | 4 distinct of 70 (all unlisted names) | 11 of 16 | 4 of 9 | 0 of 126 | 0 profile identifiers, phones, emails, addresses or birthdays leaked. Misses: Hinglish, inappropriate touching, threats, worry |
| 2026-11-14 | all three sets after category fixes | 0 (dev), 0 (v1), 0 (v2) | 19/19, 15/15, 16/16 | 11/11, 10/10, 9/9 | 0 on every set | Not an unbiased estimate: v1 and v2 informed these fixes. Blind v3 still to come. |
| 2026-11-28 | heldout3.jsonl (blind v3, 150 q) | 18 distinct of 65 (in 17 of 56 questions) | 12 of 16 | 7 of 24 | 1 of 110 | First and only blind measurement. 0 over-redaction of 64 clean questions. Leaks: misspelled profile names (ryia, kabeer, mrs kapur, avii, koregoan park), unlisted names (rajesh, arjun, zoya, rehan, ms deshmukh, rohit sir), flat/society address, pincode, roll no, bus route, gamer tag CoolAvi99, an unlisted area. Misses: running away, knife threat, Hinglish urgent phrasing, most bullying and online-stranger concern phrasing. |

All numbers are for the deterministic layer alone (worst case: every question forced to the cloud, no on-device model help).
The third blind set (v3) was measured on 2026-11-28 and its first measurement above is the published baseline.
