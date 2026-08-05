# `data/scriptures/` — नवीन धार्मिक-मजकूर रचना (Phase 1 + 2)

> हे existing `data/aarti.json`, `data/mantra.json`, `data/nityaseva.json`,
> `data/utsav-2026.json` यांना **replace करत नाही**. जुनी रचना कार्यरत राहते;
> मोठा पाठ अजून इथे स्थलांतरित केलेला नाही (फक्त architecture सिद्ध
> करण्यासाठी दोन छोटे नमुने आहेत — खाली पहा).

## फोल्डर रचना

```text
data/scriptures/
  public-index.json     ← वेबसाइट ONLY हीच फाईल fetch करते
  drafts/                ← पडताळणी न झालेले / अर्धवट मजकूर — वेबसाइटवर कधीही दिसत नाहीत
  verified/               ← status=verified-by-centre + sourceCompared=true च असलेल्या फाईल्स
  schema/                 ← JSON Schema (ajv) — scripture.schema.json, public-index.schema.json
  checksums.json          ← प्रत्येक फाईलच्या मजकुराचा sha256 — "exact character integrity" तपासणीसाठी
```

## नियम (हे मोडणारा बदल कधीही commit करू नये)

1. `public-index.json` मध्ये **फक्त** असे item टाकावेत ज्यांच्या फाईलमध्ये:
   `verification.status === "verified-by-centre"` **आणि**
   `verification.sourceCompared === true`.
2. `public-index.json` मधला `file` field नेहमी `verified/...json` असाच असावा —
   कधीही `drafts/...` नसावा. Schema (`pattern: ^verified/`) + validator दोन्ही हे अडवतात.
3. `drafts/` मधली कोणतीही फाईल कोणत्याही परिस्थितीत `public-index.json` मध्ये
   संदर्भित होता कामा नये — `npm run validate:scriptures` हे स्वयंचलितपणे तपासते.
4. कोणताही existing धार्मिक मजकूर **मानवी सेवेकऱ्याने स्पष्टपणे पडताळणी दिल्याशिवाय**
   `verified-by-centre` केला जाणार नाही. नवीन स्थलांतरित मजकूर नेहमी
   `status: "draft"`, `sourceCompared: false` असाच सुरू होतो.

## प्रत्येक scripture फाईलची रचना

```json
{
  "id": "kebab-case-id",
  "title": "मराठी/संस्कृत शीर्षक",
  "language": "sa | mr | hi | mixed",
  "script": "Devanagari",
  "category": "aarti | mantra | stotra | prarthana | sukta | test | other",
  "kadhi": "कधी म्हणावे — किंवा null",
  "verification": {
    "status": "draft | second-pass | verified-by-centre",
    "verifiedBy": "",
    "verifiedDate": "YYYY-MM-DD किंवा \"\"",
    "sourceCompared": false
  },
  "source": {
    "label": "उदा. नित्यसेवा पोथी, पृष्ठ ३",
    "sourcePage": 3,
    "sourceImage": "p003.jpg"
  },
  "sections": [
    { "type": "heading", "lines": ["..."] },
    { "type": "verse", "lines": ["ओळ १", "ओळ २"], "number": "१" },
    { "type": "refrain", "lines": ["...॥धृ॥"] },
    { "type": "mantra", "lines": ["..."] },
    { "type": "prose", "lines": ["..."] },
    { "type": "note", "lines": ["..."] },
    { "type": "phalashruti", "lines": ["..."] }
  ]
}
```

`ovya` (एकच सपाट array) ऐवजी हे generic `sections` वापरले आहे — प्रत्येक ओळीचा
प्रकार (मथळा / श्लोक / धृपद / मंत्र / गद्य / टीप / फलश्रुती) वेगळा ओळखता येतो,
आणि रेंडरिंग `innerHTML` string जोडणीऐवजी सुरक्षित DOM (`textContent`) ने होते.

**मजकूर जसाच्या तसा** — शब्द, मात्रा, अनुस्वार/चंद्रबिंदू, विसर्ग, जोडाक्षर,
।/॥, श्लोक क्रमांक, Unicode normalization कशातही बदल करू नये.
`checksums.json` त्या नेमक्या मजकुरावर sha256 ठेवतो — कोणीही फाईल पुन्हा सेव्ह
करताना अनवधानाने काही बदलले तर `npm run validate:scriptures` अपयशी होईल.

## स्रोत फोटो

पोथीचे स्कॅन/फोटो कधीही commit होत नाहीत (`.gitignore` पहा) — फक्त `source/pothi/`
मध्ये local ठेवावेत. JSON मध्ये फक्त filename (`sourceImage`) नोंदवला जातो,
जेणेकरून कोणती फाईल कोणत्या फोटोविरुद्ध ताडून पाहिली हे इतिहासात राहते.

## सद्य नमुने (Phase 1 + 2 प्रात्यक्षिक — संपूर्ण migration नाही)

| फाईल | स्थिती | कारण |
|---|---|---|
| `drafts/swami-jap.json` | `draft` | existing मजकूर स्थलांतरित; मानवी पडताळणी अजून मिळालेली नाही → नियम ४ नुसार draft |
| `verified/qa-sample-entry.json` | `verified-by-centre` | **खरी धार्मिक सामग्री नाही** — फक्त `public-index → verified/ → website` साखळी सिद्ध करण्यासाठी कृत्रिम नोंद. विलीनीकरणापूर्वी काढा किंवा खऱ्या पडताळलेल्या मजकुराने बदला. |

## Validation

```bash
npm install
npm run validate:scriptures   # JSON Schema + manifest existence + draft-exposure + checksum तपासणी
npm run test:e2e              # Playwright — deep-links, जपमाळा regression, service-worker cache
```
