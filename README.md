# श्री स्वामी समर्थ सेवा केंद्र – कोटितीर्थ, कोल्हापूर

QR स्कॅन केल्यावर उघडणारे मोबाईल-फ्रेंडली माहिती पेज. फक्त HTML — सर्व्हर, डेटाबेस, खर्च काहीही नाही.

| फाईल | काम |
|---|---|
| `index.html` | मुख्य पेज (QR स्कॅन केल्यावर हेच दिसते) |
| `data/*.json` | आरती / मंत्र / नित्यसेवा / उत्सव — जुनी (legacy) रचना, अजून वापरात |
| `data/scriptures/` | नवीन रचना — `public-index.json` (फक्त हीच वेबसाइट fetch करते; **सध्या मुद्दाम रिकामी**) + `drafts/` + `verified/`. तपशील: `data/scriptures/README.md` |
| `tests/fixtures/scriptures/` | फक्त चाचण्यांसाठी कृत्रिम नमुने — production data चा भाग कधीही नाही, वेबसाइट कधीही fetch करत नाही |
| `source/pothi/` | नित्यसेवा पोथीचे स्रोत फोटो (स्वतः commit होत नाहीत — `.gitignore` पहा) |
| `CONTENT-VERIFY.md` | मजकूर पडताळणी + जपमाळा नियम |
| `scripts/validate-scriptures.mjs` | `data/scriptures/` JSON schema + विस्तारित verified-content नियम + checksum + draft-exposure तपासणी (`npm run validate:scriptures`) |
| `scripts/test-validation-rules.mjs` | future-date / empty-verifiedBy / uncertain-content / draft-leak negative-tests (`npm run test:rules`) |
| `scripts/test-e2e.mjs` | Deep-link, चेतावणी बॅनर/लेबल्स, fixture-leak तपासणी, जपमाळा, service-worker Playwright चाचण्या (`npm run test:e2e`) |
| `scripts/test-mobile-viewports.mjs` | 320×568/360×800/390×844/412×915 वर responsive तपासणी (`npm run test:mobile`) |
| `qr.html` | QR तयार करून SVG / PNG / फलक PDF घेण्यासाठी |

---

## १. GitHub वर टाका (१० मिनिटे)

रेपो तयार आहे: `printshop39-byte/kotitirth-seva-kendra` — फाईल्सही आत आहेत.

1. **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main`, folder `/ (root)` → Save
2. २ मिनिटांनी लिंक तयार:
   `https://kotitirth-seva-kendra.vercel.app/`

## २. QR तयार करा

- वरची लिंक + `qr.html` उघडा
- लिंक चिकटवा → **SVG डाउनलोड** (फ्लेक्स/बोर्डसाठी) किंवा **फलक PDF प्रिंट करा**
- प्रिंटआधी एकदा स्वतः स्कॅन करून खात्री करा

---

## ३. माहिती बदलायची असेल तर

`index.html` मध्ये खाली `const KENDRA = {` हा भाग आहे — **फक्त तेवढाच बदला**:

```js
sevekari : "श्री सुनील तावरे",
phone    : "+91XXXXXXXXXX",     // <-- खरा नंबर टाका
mapQuery : "कोटितीर्थ तलाव, कोल्हापूर",

seva: [
  { t:"08:00", name:"भूपाळी व आरती",   sub:"दिवसाची सुरुवात" },
  { t:"10:30", name:"आरती",             sub:"मध्यान्ह सेवा" },
  { t:"18:00", name:"आरती व नित्यसेवा", sub:"सायंकाळची सेवा" }
]
```

वेळ नेहमी **२४ तासांच्या** फॉरमॅटमध्ये (`18:00` = सायं. ६). पेज आपोआप मराठी अंकात दाखवते.

> **महत्त्वाचे:** नंबर टाकेपर्यंत फोन/WhatsApp बटणांवर “नंबर टाका” दिसेल.

---

## ४. पेजवर काय काय आहे

- **आत्ता पट्टी** — पुढील सेवेला किती वेळ बाकी, चालू सेवा हायलाइट
- नित्य सेवा वेळापत्रक (timeline)
- मुद्रण विभाग वेळ
- बाल संस्कार वर्ग *(नमुना वेळ — बदला)*
- आजचे स्वामी वचन (रोज आपोआप बदलते)
- फोन · WhatsApp · Google Maps रस्ता · लिंक शेअर
- **उपयुक्त दुवे** — दिंडोरी प्रणित संकेतस्थळ, धार्मिक ग्रंथ
  *(नवा दुवा हवा असल्यास `KENDRA.links` मध्ये एक ओळ वाढवा)*

## ५. पुढे वाढवता येईल

- सेवा नोंदणीचा फॉर्म (Google Form किंवा Supabase)
- गुरुवार / पुण्यतिथी विशेष कार्यक्रमांची यादी
- फोटो गॅलरी
- इंग्रजी–मराठी भाषा बटण
