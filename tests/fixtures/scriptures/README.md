# चाचणी फिक्श्चर — production नाही

`verified-sample.json` ही एक **कृत्रिम** नोंद आहे — कोणत्याही नित्यसेवा पोथीतून
घेतलेली नाही. फक्त `scripts/test-e2e.mjs` मधल्या तात्पुरत्या overlay server
चाचणीसाठी वापरली जाते, जेणेकरून `public-index → verified/ → website`
रेंडरिंग pipeline प्रत्यक्ष Chromium मध्ये सिद्ध करता येईल — **production
`data/scriptures/` ला स्पर्शही न करता.**

नियम:
- ही फाईल कधीही `data/scriptures/drafts/` किंवा `data/scriptures/verified/`
  मध्ये कॉपी करू नये.
- ही फाईल कधीही `data/scriptures/public-index.json` मध्ये संदर्भित करू नये.
- वेबसाइटचा production कोड `tests/fixtures/` कधीही fetch करत नाही —
  `scripts/test-e2e.mjs` मधली "test fixtures कधीही fetch/display होत नाहीत"
  ही चाचणी हे स्वयंचलितपणे सिद्ध करते.
