export const site = {
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
} as const;