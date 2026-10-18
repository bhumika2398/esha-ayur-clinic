import type { Category } from './treatments';

export interface CategoryPage {
  slug: string;
  key: Category;
  label: string;
  blurb: string;
  title: string;
  accent: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
}

export const categoryPages: CategoryPage[] = [
  {
    slug: 'body-care',
    key: 'body',
    label: 'Body Care',
    blurb: 'Massages, dhara, basti, sweda, Panchakarma',
    title: 'Body & head',
    accent: 'therapies',
    intro: 'Oil massages, herbal boluses, dhara, basti, eye and nasal therapies and Panchakarma, planned after a consultation.',
    seoTitle: 'Ayurvedic Body Care Therapies in Bengaluru | Esha Ayur Care',
    seoDescription: 'Abhyanga, Pinda Sweda, Shirodhara, Basti, Netra Tarpana, Panchakarma and more at Esha Ayur Care, Byatarayanapura, Bengaluru.',
  },
  {
    slug: 'skin-care',
    key: 'skin',
    label: 'Skin Care',
    blurb: 'Navara and Kumkumadi facials',
    title: 'Ayurvedic',
    accent: 'skin care',
    intro: 'Facials based on traditional Ayurvedic ingredients, for skin that feels soft, calm and refreshed.',
    seoTitle: 'Ayurvedic Skin Care & Facials in Bengaluru | Esha Ayur Care',
    seoDescription: 'Navara facial and Kumkumadi Taila facial at Esha Ayur Care, Byatarayanapura, Bengaluru.',
  },
  {
    slug: 'womens-care',
    key: 'womens',
    label: "Women's Care",
    blurb: 'Private, doctor-guided therapies',
    title: "Women's",
    accent: 'care',
    intro: 'Private, respectful Ayurvedic care, offered only after a consultation with the doctor.',
    seoTitle: "Ayurvedic Women's Care in Bengaluru | Esha Ayur Care",
    seoDescription: "Yoni Pichu and Yoni Prakshalana, doctor-guided women's care at Esha Ayur Care, Bengaluru.",
  },
  {
    slug: 'weight-management',
    key: 'weight',
    label: 'Weight Management',
    blurb: 'Udwarthana, Virechana, Vamana',
    title: 'Ayurvedic',
    accent: 'weight management',
    intro: 'Herbal powder massage and doctor-supervised Panchakarma, planned around your body and goals.',
    seoTitle: 'Ayurvedic Weight Management in Bengaluru | Esha Ayur Care',
    seoDescription: 'Udwarthana, Virechana and Vamana weight management therapies at Esha Ayur Care, Bengaluru.',
  },
];