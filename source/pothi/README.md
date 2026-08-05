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

## सध्याचे drafts (`data/scriptures/drafts/`)

फोटो बॅचवरून सुरू — **public-index मध्ये अजून जोडलेले नाहीत** (नंतर चेक झाल्यावर):

| फाईल | स्थिती |
|---|---|
| `navgraha-stotra.json` | जवळजवळ पूर्ण (पृ. १८) |
| `aikya-mantra.json` | पूर्ण (पृ. २०) |
| `shiv-mahimna-anuvad.json` | ११–३२; १–१० व ३३–४३ बाकी |
| `shiva-namavali.json` | १–४४; ४५–१०८ बाकी |
| `kalbhairav-ashtak.json` | १–४; ५–८ बाकी |
| `parjanya-sukta.json` | आंशिक |
| `karunashtake-shanivari.json` | आंशिक |
| `pothi-batch-inventory.json` | बाकी रचनांची यादी |

## पडताळणी workflow

1. फोटो टाका (`source/pothi/` — commit होत नाही)  
2. `data/scriptures/drafts/*.json` मध्ये मजकूर (`status: "draft"`)  
3. संस्कृत/मराठी जाणणाऱ्या सेवेकऱ्याकडून अक्षरशः तपासा  
4. तपासणी झाल्यावरच `verified/` + `verified-by-centre` + `public-index`  
5. GitHub commit इतिहास जतन राहतो  

तपासणी चिन्हे: `ं` `ँ` `ः` `ऋ` `श/ष/स` `ण/न` `ळ/ल` `।` `॥` `ऽ`