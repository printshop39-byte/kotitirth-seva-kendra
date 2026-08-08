# `data/scriptures/` — नवीन धार्मिक-मजकूर रचना (Phase 1 + 2)

> हे existing `data/aarti.json`, `data/mantra.json` यांना **replace करत नाही**.
> जुनी रचना कार्यरत राहते; मोठा पाठ अजून इथे स्थलांतरित केलेला नाही.
> (`data/nityaseva.json` व `data/utsav-2026.json` या पूर्वीच्या न-वापरलेल्या
> फाईल्स काढल्या आहेत — वारानुसार सेवा व उत्सव-तारखा index.html मध्येच
> embedded आहेत.)

## फोल्डर रचना

```text
data/scriptures/
  public-index.json     ← वेबसाइट ONLY हीच फाईल fetch करते — सध्या मुद्दाम रिकामी (items: [])
  drafts/                ← पडताळणी न झालेले / अर्धवट मजकूर — वेबसाइटवर कधीही दिसत नाहीत
  verified/               ← status=verified-by-centre + sourceCompared=true च असलेल्या फाईल्स
  schema/                 ← JSON Schema (ajv) — scripture.schema.json, public-index.schema.json
  checksums.json          ← प्रत्येक फाईलच्या मजकुराचा sha256 — "exact character integrity" तपासणीसाठी

tests/fixtures/scriptures/
  verified-sample.json    ← फक्त चाचण्यांसाठी कृत्रिम नमुना — production data चा भाग कधीही नाही
```

## पडताळणी workflow (कोणताही मजकूर verified-by-centre होण्याआधी हे सर्व टप्पे पूर्ण व्हावे लागतात)

```
फोटो → AI transcription → दुसऱ्या modelची तुलना
     → मानवाकडून मूळ पुस्तकाशी पडताळणी
     → verified JSON
     → public-index entry
```

1. **फोटो** — नित्यसेवा पोथीचे स्पष्ट छायाचित्र (`source/pothi/` मध्ये local, commit होत नाही).
2. **AI transcription** — फोटोवरून अक्षरशः उतरवलेला मजकूर; अस्पष्ट जागी
   `[अस्पष्ट: संभाव्य ___]` आणि/किंवा `uncertainReadings` नोंदवला जातो.
3. **दुसऱ्या modelची तुलना** — स्वतंत्र दुसऱ्या transcriptionशी अक्षरशः तुलना
   (मात्रा/अनुस्वार/विसर्ग/श-ष-स/ण-न/ळ-ल/जोडाक्षर/।-॥/श्लोक क्रमांक) — फरक
   सापडल्यास फोटोच अंतिम स्रोत.
4. **मानवाकडून मूळ पुस्तकाशी पडताळणी** — संस्कृत/मराठी जाणणाऱ्या सेवेकऱ्याने
   प्रत्यक्ष पोथीशी अक्षरशः ताडून बघणे. इथेच `uncertainReadings` रिकामे व्हावे
   लागते व कोणतीही `[अस्पष्ट` खूण उरता कामा नये.
5. **verified JSON** — वरील पडताळणी पूर्ण झाल्यावरच `verification.status`
   `"verified-by-centre"` करावा, खरे `verifiedBy` (सेवेकऱ्याचे नाव, किमान ३
   अक्षरे), खरी `verifiedDate` (भविष्यातील नाही), आणि `source.pages` /
   `source.images` भरावेत (दोन्ही रिकामे असू शकत नाहीत).
6. **public-index entry** — फक्त याच शेवटच्या टप्प्यानंतर `public-index.json`
   मध्ये त्या फाईलचा संदर्भ जोडावा.

**कोणत्याही टप्प्यावर टप्पा चुकवून पुढे जाऊ नये.** खोटे/स्वतःच गृहीत धरलेले
`verifiedBy` किंवा `verifiedDate` टाकून `verified-by-centre` करणे सक्त मनाई
आहे — `npm run validate:scriptures` व `npm run test:rules` हे स्वयंचलितपणे
अडवतात (खाली पहा).

## नियम (हे मोडणारा बदल कधीही commit करू नये)

1. `public-index.json` मध्ये **फक्त** असे item टाकावेत ज्यांच्या फाईलमध्ये
   `verification.status === "verified-by-centre"` **आणि**
   `verification.sourceCompared === true`.
2. `public-index.json` मधला `file` field नेहमी `verified/...json` असाच असावा —
   कधीही `drafts/...` नसावा. Schema (`pattern: ^verified/`) + validator दोन्ही हे अडवतात.
3. `drafts/` मधली कोणतीही फाईल कोणत्याही परिस्थितीत `public-index.json` मध्ये
   संदर्भित होता कामा नये.
4. कोणताही existing धार्मिक मजकूर **मानवी सेवेकऱ्याने स्पष्टपणे पडताळणी दिल्याशिवाय**
   `verified-by-centre` केला जाणार नाही. नवीन स्थलांतरित मजकूर नेहमी
   `status: "draft"`, `sourceCompared: false` असाच सुरू होतो.
5. `verification.verifiedBy` किमान ३ (trim केल्यावर) अक्षरांचे खरे नाव असावे —
   रिकामे किंवा placeholder नाव चालणार नाही.
6. `verification.verifiedDate` वैध `YYYY-MM-DD` तारीख असावी, आणि **भविष्यातील
   असू शकत नाही**.
7. `source.pages` व `source.images` — दोन्ही किमान एक नोंद असलेले असावेत
   (`verified-by-centre` साठी). `images` म्हणजे फक्त filename/संदर्भ — प्रत्यक्ष
   फोटो कधीही commit होत नाही.
8. `uncertainReadings` field असल्यास ती रिकामी array असावी (किंवा field
   अजिबात नसावे) — म्हणजे transcription-वेळचे कोणतेही प्रश्न शिल्लक नाहीत.
9. मजकुरात कुठेही `"[अस्पष्ट"` अशी खूण असेल तर ते `verified-by-centre` होऊ शकत
   नाही.
10. **कृत्रिम/चाचणी नमुने फक्त `tests/fixtures/scriptures/` मध्ये राहतात** —
    `data/scriptures/drafts/`, `data/scriptures/verified/`, किंवा
    `public-index.json` मध्ये कधीही कॉपी करू नयेत. वेबसाइट कधीही
    `tests/fixtures/` fetch करत नाही (e2e चाचणी हे सिद्ध करते).
11. **`visibility: "test"` — तात्पुरती public draft-test नोंद (मोबाईल UX
    चाचणीसाठी अपवाद, पण गेट सैल नाही):**
    - `public-index.json` मधल्या item ला `"visibility": "test"` दिले, तरच तो
      `drafts/...json` कडे निर्देश करू शकतो — इतर सर्व नोंदींसाठी नियम १-२
      (फक्त `verified/`) जसेच्या तसे कडक राहतात.
    - अशा नोंदीच्या फाईलमध्ये **अजूनही** `verification.status === "draft"`,
      `sourceCompared === false`, आणि **किमान एक** `uncertainReadings`
      नोंद असावीच लागते (पूर्णपणे "स्वच्छ" मजकूर test-mode मध्ये प्रकाशित
      करता येत नाही — पारदर्शकता बंधनकारक).
    - साइटवर अशा नोंदीसाठी कधीही "पडताळलेले" बॅज दिसत नाही — त्याऐवजी ठळक
      चेतावणी बॅनर + `Draft` / `source comparison incomplete` / `N readings
      pending human review` ही लेबल्स दाखवली जातात.
    - `npm run validate:scriptures` व `npm run test:rules` दोन्ही ही नियम
      स्वतंत्रपणे तपासतात (server-side), आणि `index.html` चा loader सुद्धा
      (client-side, defense-in-depth) तीच अट पुन्हा तपासतो.

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
    "pages": [3],
    "images": ["p003.jpg"]
  },
  "uncertainReadings": [],
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

## `public-index.json` मधील प्रत्येक item ची रचना

```json
{
  "id": "kebab-case-id",
  "file": "verified/....json",
  "title": "...",
  "category": "...",
  "visibility": "test"
}
```

`visibility` ऐच्छिक आहे — फक्त वरील नियम ११ प्रमाणे तात्पुरत्या public
draft-test नोंदींसाठी `"test"` असा टाकावा; इतर सर्व नोंदींसाठी हा field
पूर्णपणे अनुपस्थित ठेवावा (आणि `file` नेहमी `verified/...json` असावा).

`ovya` (एकच सपाट array) ऐवजी हे generic `sections` वापरले आहे — प्रत्येक ओळीचा
प्रकार (मथळा / श्लोक / धृपद / मंत्र / गद्य / टीप / फलश्रुती) वेगळा ओळखता येतो,
आणि रेंडरिंग `innerHTML` string जोडणीऐवजी सुरक्षित DOM (`textContent`) ने होते.

**मजकूर जसाच्या तसा** — शब्द, मात्रा, अनुस्वार/चंद्रबिंदू, विसर्ग, जोडाक्षर,
।/॥, श्लोक क्रमांक, Unicode normalization कशातही बदल करू नये.
`checksums.json` त्या नेमक्या मजकुरावर sha256 ठेवतो — कोणीही फाईल पुन्हा सेव्ह
करताना अनवधानाने काही बदलले तर `npm run validate:scriptures` अपयशी होईल.

## स्रोत फोटो

पोथीचे स्कॅन/फोटो कधीही commit होत नाहीत (`.gitignore` पहा) — फक्त `source/pothi/`
मध्ये local ठेवावेत. JSON मध्ये फक्त filename (`source.images`) नोंदवला जातो,
जेणेकरून कोणती फाईल कोणत्या फोटोविरुद्ध ताडून पाहिली हे इतिहासात राहते.

## सद्य स्थिती

| ठिकाण | स्थिती | कारण |
|---|---|---|
| `data/scriptures/public-index.json` | १ नोंद — `ishwar-prarthana`, `visibility: "test"` | तात्पुरती मोबाईल UX चाचणी (छोट्या ओळखीच्या गटासाठी) — verified-by-centre नाही, sourceCompared=false, ३ uncertainReadings अजूनही शिल्लक. साइटवर स्पष्ट चेतावणी बॅनर व Draft लेबल्ससह दिसते. |
| `data/scriptures/drafts/ishwar-prarthana.json` | `draft` | वरील visibility="test" नोंदीने संदर्भित; मानवी सेवेकरी पडताळणी अजून बाकी (३ अनिश्चित विरामचिन्हे) |
| `data/scriptures/drafts/swami-jap.json` | `draft`, public-index मध्ये संदर्भित नाही | existing मजकूर स्थलांतरित; मानवी पडताळणी अजून मिळालेली नाही |
| `tests/fixtures/scriptures/verified-sample.json` | फक्त चाचणीसाठी | **खरी धार्मिक सामग्री नाही** — `data/scriptures/` च्या बाहेर, `public-index → verified/ → website` साखळी चाचण्यांमध्ये सिद्ध करण्यासाठी. वेबसाइट production मध्ये हे कधीही fetch करत नाही. |

खरोखर "verified-by-centre" (म्हणजे साधा हिरवा "पडताळलेले" बॅज दाखवणारा,
`verified/` फोल्डरमधला) मजकूर अजून एकही नाही — तो फक्त मानवी सेवेकऱ्याच्या
स्पष्ट पडताळणीनंतरच जोडला जाईल.

## Validation

```bash
npm install
npm run validate:scriptures   # खऱ्या data/scriptures/ वर: JSON Schema + manifest existence
                               # + विस्तारित verified-content नियम + visibility=test नियम + checksum
npm run test:rules            # तात्पुरत्या fixture फोल्डरवर: future-date, empty-verifiedBy,
                               # uncertainReadings, [अस्पष्ट, draft-leak, visibility=test
                               # negative/positive चाचण्या
npm run test:e2e              # Playwright — deep-links, चेतावणी बॅनर/लेबल्स, fixture-leak तपासणी,
                               # जपमाळा regression, service-worker cache, client-side गेट तपासणी
npm run test:mobile           # Playwright — 320×568/360×800/390×844/412×915 वर responsive तपासणी
npm test                      # वरील चारही एकत्र
```
