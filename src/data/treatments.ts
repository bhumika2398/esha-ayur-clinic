// Change this to 'jpg' or 'png' if your images use a different extension
const EXT = 'png';

export type Category = 'body' | 'skin' | 'womens' | 'weight';

export interface Treatment {
  slug: string;
  name: string;
  categories: Category[];
  image: string;
  duration: string;
  description: string;
  includes: string[];
}

export const categoryLabels: Record<Category, string> = {
  body: 'Body & Head Therapies',
  skin: 'Skin Care',
  womens: "Women's Care",
  weight: 'Weight Management',
};

const img = (folder: string, file: string) => `/images/${folder}/${file}.${EXT}`;

export const treatments: Treatment[] = [
  // ---------- BODY & HEAD ----------
  {
    slug: 'abhyanga',
    name: 'Abhyanga (Ayurvedic Oil Massage)',
    categories: ['body'],
    image: img('body-treatments', 'abhyanga'),
    duration: '20 min to 1 hr 15 min',
    description:
      'A warm, medicated-oil massage with long, rhythmic strokes, one of the foundations of Ayurvedic care. Traditionally used to relax tired muscles, calm the nervous system and support soft, healthy-looking skin and restful sleep. Choose full body, half body or a single area, with or without herbal steam.',
    includes: ['Sarvanga (full body)', 'Ardhanga (half body)', 'Ekanga (single part)', 'Shiro abhyanga (head)', 'Mukha abhyanga (face)', 'Pada abhyanga (feet)'],
  },
  {
    slug: 'pinda-sweda',
    name: 'Pinda Sweda (Herbal Bolus Massage)',
    categories: ['body'],
    image: img('body-treatments', 'pinda-sweda'),
    duration: '30 min to 1 hr',
    description:
      'Warm bundles filled with herbs, powders or other traditional ingredients are gently pressed over the body after oil application. The deep, soothing heat is traditionally used to ease stiffness, joint and muscle discomfort and general fatigue.',
    includes: ['Patra Pinda Sweda', 'Choorna Pinda Sweda', 'Mamsa Pinda Sweda', 'Jambeera Sweda', 'Kukkutanda Sweda'],
  },
  {
    slug: 'local-basti',
    name: 'Local Basti (Kati, Greeva, Janu)',
    categories: ['body'],
    image: img('body-treatments', 'local-basti'),
    duration: '45 min',
    description:
      'Warm medicated oil is held in a small reservoir of dough on the lower back, neck or knee. This focused treatment is traditionally used to support comfort and mobility in the spine and joints.',
    includes: ['Kati Basti (lower back)', 'Greeva Basti (neck)', 'Janu Basti (knee, one or both)'],
  },
  {
    slug: 'shirodhara',
    name: 'Shirodhara & Head Therapies',
    categories: ['body'],
    image: img('body-treatments', 'shirodhara'),
    duration: '45 min to 1 hr',
    description:
      'A steady, gentle stream of warm liquid flows over the forehead, or the head is bathed in a soothing oil pool. These therapies are traditionally chosen to quiet a busy mind, ease stress and support deeper sleep.',
    includes: ['Shiro Dhara', 'Shiro Basti', 'Takra Dhara (head)', 'Ksheera Dhara (head)'],
  },
  {
    slug: 'body-dhara',
    name: 'Dhara (Full & Half Body Streams)',
    categories: ['body'],
    image: img('body-treatments', 'body-dhara'),
    duration: '30 min to 1 hr',
    description:
      'A continuous, rhythmic stream of warm medicated milk, buttermilk, herbal decoction or fermented liquid is poured over the body. Each liquid is selected by the doctor to suit your constitution and needs.',
    includes: ['Ksheera Dhara (milk)', 'Takra Dhara (buttermilk)', 'Kashaya Dhara (herbal decoction)', 'Dhanyamla Dhara (fermented grain liquid)'],
  },
  {
    slug: 'netra-tarpana',
    name: 'Netra Tarpana (Eye Care)',
    categories: ['body'],
    image: img('body-treatments', 'netra-tarpana'),
    duration: '45 min',
    description:
      'Medicated ghee is held gently around the eyes in a dough ring. Traditionally used to refresh tired eyes, and popular with people who spend long hours on screens.',
    includes: ['Eye soothing and nourishing therapy'],
  },
  {
    slug: 'nasya-dhumapana',
    name: 'Nasya & Dhumapana',
    categories: ['body'],
    image: img('body-treatments', 'nasya-dhumapana'),
    duration: '30 min',
    description:
      'Medicated oil drops are applied through the nose, followed by inhalation of herbal smoke. Traditionally used to support clear breathing, the sinuses and the head and neck region.',
    includes: ['Nasya (nasal oil therapy)', 'Dhumapana (herbal inhalation)'],
  },
  {
    slug: 'swedana',
    name: 'Swedana (Herbal Sudation)',
    categories: ['body'],
    image: img('body-treatments', 'swedana'),
    duration: '30 to 45 min',
    description:
      'Gentle, controlled heat from warm sand or heated bricks is applied to the body. Traditionally used to relax stiff muscles, support circulation and prepare the body for other therapies.',
    includes: ['Valuka Sweda (warm sand, full or half body)', 'Ishtika Sweda (heated brick)'],
  },
  {
    slug: 'navara-theppu',
    name: 'Navara Theppu',
    categories: ['body'],
    image: img('body-treatments', 'navara-theppu'),
    duration: '45 min',
    description:
      'A warm paste made from Navara rice and herbs is applied over the body area. Traditionally used to nourish tissues and support strength and comfort.',
    includes: ['Navara rice and herbal paste application'],
  },
  {
    slug: 'panchakarma',
    name: 'Panchakarma Therapies',
    categories: ['body'],
    image: img('body-treatments', 'panchakarma'),
    duration: 'As advised by the doctor',
    description:
      'The classical Ayurvedic cleansing programme, planned individually after consultation. Panchakarma is traditionally used to reset the body and support long-term wellbeing, always under the doctor\'s supervision.',
    includes: ['Vamana', 'Virechana', 'Matra Basti', 'Kashaya Basti'],
  },
  {
    slug: 'jaloukavacharana',
    name: 'Jaloukavacharana (Leech Therapy)',
    categories: ['body'],
    image: img('body-treatments', 'jaloukavacharana'),
    duration: '1 hr',
    description:
      'A traditional Ayurvedic procedure using medicinal leeches, performed under hygienic, doctor-supervised conditions. Used in Ayurveda for certain localised skin and joint concerns after a proper assessment.',
    includes: ['Doctor assessment before the procedure', 'Sterile, single-use approach'],
  },

  // ---------- SKIN ----------
  {
    slug: 'navara-facial',
    name: 'Navara Facial',
    categories: ['skin'],
    image: img('skin-treatments', 'navara-facial'),
    duration: 'Approx. 1 hr',
    description:
      'A nourishing facial with Navara rice and herbs. Traditionally used to leave the skin feeling soft, refreshed and naturally radiant.',
    includes: ['Gentle cleansing', 'Navara herbal application', 'Face massage'],
  },
  {
    slug: 'kunkumadi-facial',
    name: 'Kunkumadi Taila Facial',
    categories: ['skin'],
    image: img('skin-treatments', 'kunkumadi-facial'),
    duration: 'Approx. 1 hr',
    description:
      'A facial using Kunkumadi Taila, a classical saffron-based Ayurvedic oil. Traditionally used to support an even-looking, glowing complexion.',
    includes: ['Gentle cleansing', 'Kunkumadi Taila massage', 'Herbal finish'],
  },

  // ---------- WOMEN'S CARE ----------
  {
    slug: 'yoni-pichu',
    name: 'Yoni Pichu',
    categories: ['womens'],
    image: img('womens-care', 'yoni-pichu'),
    duration: 'As advised by the doctor',
    description:
      'A traditional Ayurvedic therapy using a medicated-oil-soaked cotton pad, performed with care and full privacy. Recommended only after a consultation with the doctor.',
    includes: ['Private, doctor-guided procedure'],
  },
  {
    slug: 'yoni-prakshalana',
    name: 'Yoni Prakshalana',
    categories: ['womens'],
    image: img('womens-care', 'yoni-prakshalana'),
    duration: 'As advised by the doctor',
    description:
      'A herbal decoction wash, a traditional Ayurvedic cleansing method for women\'s intimate health. Always advised and performed after a proper consultation, with complete privacy.',
    includes: ['Private, doctor-guided procedure'],
  },

  // ---------- WEIGHT MANAGEMENT ----------
  {
    slug: 'udwarthana',
    name: 'Udwarthana (Herbal Powder Massage)',
    categories: ['weight', 'body'],
    image: img('weight-management', 'udwarthana'),
    duration: '45 min to 1 hr 15 min',
    description:
      'A vigorous, upward massage using dry herbal powders, followed by steam. Traditionally used to support healthy weight management, firmer-feeling skin and improved circulation. Available as full body or half body.',
    includes: ['Sarvanga Udwarthana (full body)', 'Ardhanga Udwarthana (half body)', 'Herbal steam'],
  },
  {
    slug: 'virechana',
    name: 'Virechana (Medicated Purgation)',
    categories: ['weight'],
    image: img('weight-management', 'virechana'),
    duration: 'Programme as advised',
    description:
      'A classical Panchakarma cleansing therapy performed under strict medical supervision after preparation. Used in Ayurvedic weight management programmes, only after the doctor assesses your suitability.',
    includes: ['Pre-treatment preparation', 'Doctor-supervised procedure', 'Post-treatment diet guidance'],
  },
  {
    slug: 'vamana',
    name: 'Vamana (Therapeutic Cleansing)',
    categories: ['weight'],
    image: img('weight-management', 'vamana'),
    duration: 'Programme as advised',
    description:
      'A classical Panchakarma therapy planned and supervised by the doctor. Offered as part of a personalised Ayurvedic weight management plan after full assessment.',
    includes: ['Pre-treatment preparation', 'Doctor-supervised procedure', 'Post-treatment diet guidance'],
  },
];