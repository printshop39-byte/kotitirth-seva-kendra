# नित्यसेवा पोथी — स्रोत फोटो

येथे पोथीच्या **स्पष्ट फोटो / स्कॅन** ठेवा. OCRवर पूर्ण विश्वास ठेवू नका.

## नामांकन

```
pNNN-title.jpg
```

उदाहरण:
- `p011-swami-jap.jpg`
- `p005-parjanya-sukta.jpg`
- `p009-ramraksha.jpg`
- `p018-navgraha.jpg`
- `p020-aikya-utsav.jpg`

## सध्याचे drafts — एकत्र रिव्ह्यू (`visibility: "test"`)

सर्व मुख्य रचना `public-index.json` मध्ये **test** म्हणून दाखवल्या आहेत (`#paath`) —
एकदाच बघून बदल सांगण्यासाठी. अंतिम verified नाहीत.

| फाईल | स्थिती |
|---|---|
| `navgraha-stotra` · `aikya-mantra` | जवळजवळ पूर्ण |
| `shiv-mahimna-anuvad` · `shiva-namavali` | आंशिक पूर्ण |
| `parjanya` · `kalbhairav` · `karunashtake` · इतर | आंशिक / [अस्पष्ट] खूणा |
| `pothi-batch-inventory` | फक्त यादी — public-index मध्ये नाही |
| `swami-jap` | draft; public-index मध्ये नाही |

## पडताळणी workflow

1. फोटो टाका (`source/pothi/` — commit होत नाही)  
2. `data/scriptures/drafts/*.json` मध्ये मजकूर (`status: "draft"`)  
3. संस्कृत/मराठी जाणणाऱ्या सेवेकऱ्याकडून अक्षरशः तपासा  
4. तपासणी झाल्यावरच `verified/` + `verified-by-centre` + `public-index`  
5. GitHub commit इतिहास जतन राहतो  

तपासणी चिन्हे: `ं` `ँ` `ः` `ऋ` `श/ष/स` `ण/न` `ळ/ल` `।` `॥` `ऽ`