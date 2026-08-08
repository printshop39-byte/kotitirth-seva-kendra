# मजकूर अचूकता — आरती · मंत्र · स्तोत्र

एक मात्रा / अनुस्वार / विसर्ग चुकला तरी अर्थ व उच्चार बदलतो.
म्हणून साइटवरचा धार्मिक मजकूर **verified JSON** फाईल्समधून येतो.

> **नवीन रचना (Phase 1+2):** `data/scriptures/public-index.json` +
> `data/scriptures/drafts/` + `data/scriptures/verified/` — सविस्तर schema,
> नियम व workflow साठी `data/scriptures/README.md` पहा. खाली दिलेली जुनी
> `data/*.json` रचना अजूनही कार्यरत आहे (संपूर्ण मजकूर अजून स्थलांतरित झालेला
> नाही) — दोन्ही रचनांचे मूळ तत्त्व एकच आहे: **मानवी सेवेकऱ्याने अक्षरशः
> तपासल्याशिवाय कोणताही मजकूर "verified" होत नाही.**
>
> पूर्ण पडताळणी pipeline:
>
> ```
> फोटो → AI transcription → दुसऱ्या modelची तुलना
>      → मानवाकडून मूळ पुस्तकाशी पडताळणी
>      → verified JSON
>      → public-index entry
> ```
>
> `data/scriptures/public-index.json` **सध्या मुद्दाम रिकामी आहे** —
> वरील पूर्ण pipeline पार केलेला एकही मजकूर अजून नाही. **खोटे किंवा
> स्वतःच गृहीत धरलेले `verifiedBy` अथवा `verifiedDate` टाकून कोणताही
> मजकूर verified करणे सक्त मनाई आहे** — असे केल्यास
> `npm run validate:scriptures` / `npm run test:rules` अपयशी होतील
> (उदा. `verifiedBy` किमान ३ अक्षरांचे खरे नाव हवे, `verifiedDate`
> भविष्यातील असू शकत नाही, `source.pages`/`source.images` रिकामे
> चालणार नाही, `uncertainReadings` शिल्लक असता कामा नये).
>
> **कृत्रिम/चाचणी नमुने फक्त `tests/fixtures/scriptures/` मध्ये राहतात** —
> `data/scriptures/` च्या आत कधीही नाहीत; वेबसाइट `tests/fixtures/`
> कधीही fetch करत नाही (हे `npm run test:e2e` स्वयंचलितपणे सिद्ध करते).
>
> **अपवाद — `visibility: "test"` (तात्पुरती मोबाईल UX चाचणी):** एखाद्या
> `draft` मजकुराची फक्त मोबाईलवरील दिसण्या/UX ची चाचणी छोट्या ओळखीच्या
> गटासोबत करायची असेल, तर `public-index.json` मधल्या item ला
> `"visibility": "test"` देऊन तो `drafts/...json` कडे निर्देश करू शकतो —
> पण हे कधीही सामान्य verified-by-centre गेट सैल करत नाही: अशा नोंदीच्या
> फाईलमध्ये `status` अजूनही `"draft"`, `sourceCompared` अजूनही `false`,
> आणि किमान एक `uncertainReadings` नोंद बंधनकारक असतेच. साइटवर अशा
> नोंदीसाठी कधीही "पडताळलेले" बॅज दिसत नाही — त्याऐवजी ठळक चेतावणी बॅनर +
> Draft/uncertain लेबल्स दाखवली जातात. तपशील: `data/scriptures/README.md`
> (नियम ११).

## फाईल रचना (जुनी — `data/*.json`)

```text
data/
  aarti.json        ← आरत्यांचा पाठ — index.html runtime वर fetch करते, असल्यास embedded KENDRA.paath ला override करते
  mantra.json       ← मंत्र / स्तोत्र नमुने — तेच, KENDRA.visheshSeva ला जोड म्हणून दाखवते
source/pothi/       ← मूळ पोथीचे फोटो (OCR नको)
```

> **वारांप्रमाणे नित्यसेवा (KENDRA.varSeva) व उत्सव-तारखा (KENDRA.utsavDates)**
> वेगळ्या JSON फाईलमध्ये नाहीत — index.html मध्येच थेट embedded आहेत (source of
> truth तिथेच). पूर्वी `data/nityaseva.json` व `data/utsav-2026.json` या नावाने
> स्वतंत्र फाईल्स होत्या, पण त्या कधीही प्रत्यक्ष fetch/वापरल्या जात नव्हत्या
> (मृत/orphaned) — गोंधळ टाळण्यासाठी काढून टाकल्या आहेत.

## प्रत्येक मजकुराची माहिती

```json
{
  "title": "श्री स्वामी समर्थ आरती",
  "language": "mr",
  "script": "Devanagari",
  "status": "verified",
  "source": "नित्यसेवा पोथी, पृष्ठ ३४",
  "verifiedBy": "केंद्रातील अधिकृत सेवेकरी",
  "verifiedDate": "2026-08-05"
}
```

`status`:
- `draft` — मसुदा; साइटवर “पडताळणी सुरू” दिसेल
- `verified` — सेवेकऱ्याकडून अक्षरशः तपासले

## सुरक्षित workflow

1. मूळ पोथीचे स्पष्ट फोटो / PDF → `source/pothi/`
2. मजकूर **हाताने** टाइप करा (OCR फक्त मदत)
3. सुरुवातीला `draft`
4. संस्कृत जाणणारा सेवेकरी तपासेल
5. मगच `verified`
6. बदल GitHub इतिहासाने जतन

## जपमाळा मोजणी

| पद्धत | विश्वास | साइटवर |
|---|---|---|
| Tap count | सर्वात जास्त | ✅ मुख्य |
| Timer auto (मंद/मध्यम/जलद) | मध्यम | ✅ ऐच्छिक |
| Micने मंत्र ऐकणे | कमी | ❌ नाही |

Auto मोड: Pause/Resume, screen wake lock, ५४ व १०८ वर वेगळा कंपन, «एक मागे».
