import { site } from './site';

export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Where is Esha Ayur Care and Pharmacy located?',
    answer: `${site.name} is in Amruth Nagar, Byatarayanapura, Bengaluru ${site.address.pincode}, on Amruth Nagar Main Road, opposite the BBMP park in Sonnappa Layout, near H A Farm Post.`,
  },
  {
    question: 'What are the clinic timings?',
    answer: `The clinic is open Monday to Saturday, 10:00 AM to 1:30 PM and 5:30 PM to 8:30 PM. Between 1:30 PM and 5:30 PM, consultations are available online.`,
  },
  {
    question: 'Who is the doctor at Esha Ayur Care?',
    answer: `${site.doctor.name} (${site.doctor.qualification}) is the Ayurvedic doctor at the clinic. She personally guides consultations, therapy plans and medicines.`,
  },
  {
    question: 'Can I consult the doctor online?',
    answer: 'Yes. Online consultations are available Monday to Saturday between 1:30 PM and 5:30 PM. Choose "Online consultation" when you book a Doctor Consultation on this website.',
  },
  {
    question: 'How do I book an appointment?',
    answer: `Use the booking form on this website to choose your department, treatment, date and time, then confirm on WhatsApp or by email. You can also call ${site.phoneDisplay}. The clinic will confirm your slot.`,
  },
  {
    question: 'Do I need a consultation before starting a therapy?',
    answer: 'Yes. Therapies are recommended after the doctor understands your health, history and needs. This keeps each plan safe and suited to you.',
  },
  {
    question: 'What is Abhyanga?',
    answer: 'Abhyanga is a traditional Ayurvedic massage with warm medicated oil. It is traditionally used to relax muscles, calm the mind and support soft, healthy-looking skin. It can be done on the full body, half body or a single area, with or without herbal steam.',
  },
  {
    question: 'What is Shirodhara?',
    answer: 'Shirodhara is a therapy in which a steady stream of warm liquid flows gently over the forehead. It is traditionally used to calm a busy mind, ease stress and support restful sleep.',
  },
  {
    question: 'What is Panchakarma?',
    answer: 'Panchakarma is the classical Ayurvedic cleansing programme. It includes therapies such as Vamana, Virechana and Basti, and is always planned and supervised by the doctor after an assessment.',
  },
  {
    question: 'What is Pinda Sweda?',
    answer: 'Pinda Sweda is a warm herbal bolus massage. Bundles filled with herbs, powders or other traditional ingredients are gently pressed over the body. It is traditionally used to ease stiffness and general fatigue.',
  },
  {
    question: 'What skin care treatments do you offer?',
    answer: 'The clinic offers the Navara Facial and the Kumkumadi Taila Facial, both based on traditional Ayurvedic ingredients and designed to leave skin feeling soft and refreshed.',
  },
  {
    question: 'Do you offer weight management therapies?',
    answer: 'Yes. Ayurvedic weight management at the clinic includes Udwarthana (herbal powder massage) and doctor-supervised Panchakarma therapies such as Virechana and Vamana, planned after a full assessment.',
  },
  {
    question: "Is women's care handled privately?",
    answer: "Yes. Yoni Pichu and Yoni Prakshalana are offered only after a consultation with the doctor, in a private and respectful setting.",
  },
  {
    question: 'How long does a therapy session take?',
    answer: 'Most sessions take between 20 minutes and about 1 hour 15 minutes, depending on the therapy. Panchakarma programmes are planned individually by the doctor.',
  },
  {
    question: 'How much do therapies cost?',
    answer: `Prices depend on the therapy and whether you choose a single session or a package. Please call ${site.phoneDisplay} or send a message on WhatsApp and the clinic will share the details.`,
  },
  {
    question: 'Is there a pharmacy at the clinic?',
    answer: 'Yes. Esha Ayur Care has its own pharmacy, so you can collect your Ayurvedic medicines in the same visit as your consultation or therapy.',
  },
];