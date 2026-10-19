import { fetchSingleRow, pick } from '../lib/remote';

export interface SiteConfig {
  name: string;
  shortName: string;
  url: string;
  defaultTitle: string;
  defaultDescription: string;
  doctor: { name: string; qualification: string };
  phoneDisplay: string;
  phoneTel: string;
  whatsapp: string;
  email: string;
  address: { street: string; area: string; city: string; state: string; pincode: string; country: string };
  hours: { clinic: string; online: string };
  mapsUrl: string;
  sheetUrl: string;
  showPrices: boolean;
  pricingNote: string;
  announcement: string;
}

const defaults: SiteConfig = {
  name: 'Esha Ayur Care and Pharmacy',
  shortName: 'Esha Ayur Care',
  url: 'https://www.example.com', // replace with your real domain later
  defaultTitle: 'Esha Ayur Care | Ayurvedic Clinic in Bengaluru',
  defaultDescription:
    'Authentic Ayurvedic treatments in Byatarayanapura, Bengaluru by Dr. Gayathri S (BAMS, MD). Abhyanga, Shirodhara, Panchakarma, skin and women\'s care, plus online consultation.',

  doctor: {
    name: 'Dr. Gayathri S',
    qualification: 'BAMS, MD',
  },

  phoneDisplay: '098805 35528',
  phoneTel: '+919880535528',
  whatsapp: '919880535528',
  email: 'gayathrimadhoo@gmail.com',

  address: {
    street: 'Amruth Nagar Main Rd, opposite BBMP park, Sonnappa Layout, H A Farm Post',
    area: 'Amruthnagar, Byatarayanapura',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560024',
    country: 'IN',
  },

  hours: {
    clinic: 'Mon to Sat: 10:00 AM to 1:30 PM and 5:30 PM to 8:30 PM',
    online: 'Online consultation: 1:30 PM to 5:30 PM',
  },

  mapsUrl: '',
  sheetUrl: '',
  showPrices: true,
  pricingNote: 'Package rates apply when you book a series of 3, 5 or 7 days. Please ask the clinic for details.',
  announcement: '',
};

// Settings saved in the admin panel are merged over the defaults above at build time.
// If Supabase is unreachable or the table is empty, the defaults are used unchanged.
// (Skipped in the browser: the admin panel imports starter content that pulls in this file.)
const [s, d] =
  typeof window === 'undefined'
    ? await Promise.all([fetchSingleRow('site_settings'), fetchSingleRow('doctor_profile')])
    : [null, null];

export const site: SiteConfig = s || d
  ? {
      ...defaults,
      doctor: {
        name: pick(d?.name, defaults.doctor.name),
        qualification: pick(d?.qualification, defaults.doctor.qualification),
      },
      phoneDisplay: pick(s?.phone_display, defaults.phoneDisplay),
      phoneTel: pick(s?.phone_tel, defaults.phoneTel),
      whatsapp: pick(s?.whatsapp, pick(s?.phone_tel, defaults.phoneTel).replace(/\D/g, '')),
      email: pick(s?.email, defaults.email),
      address: {
        street: pick(s?.street, defaults.address.street),
        area: pick(s?.area, defaults.address.area),
        city: pick(s?.city, defaults.address.city),
        state: pick(s?.state, defaults.address.state),
        pincode: pick(s?.pincode, defaults.address.pincode),
        country: defaults.address.country,
      },
      hours: {
        clinic: pick(s?.clinic_hours, defaults.hours.clinic),
        online: pick(s?.online_hours, defaults.hours.online),
      },
      mapsUrl: pick(s?.maps_url, ''),
      sheetUrl: pick(s?.sheet_url, ''),
      showPrices: s ? s.show_prices !== false : true,
      pricingNote: pick(s?.pricing_note, defaults.pricingNote),
      announcement: pick(s?.announcement, ''),
    }
  : defaults;
