export interface DoctorInfo {
  name: string;
  qualification: string;
  title?: string;
  specialisation?: string;
  experience?: string;
  college?: string;
  languages?: string[];
  registration?: string;
  focusAreas?: string[];
  bio?: string[];
  quote?: string;
}

// Only facts confirmed by the clinic are filled in. Never invent experience, awards, colleges or registration numbers.
export const doctor: DoctorInfo = {
  name: 'Dr. Gayathri S',
  qualification: 'BAMS, MD',
  title: 'Ayurvedic Physician',
  specialisation: '', // ask the doctor
  experience: '', // ask the doctor, for example "12 years"
  college: '', // ask the doctor
  languages: [], // ask the doctor
  registration: '', // ask the doctor (state council registration number)
  focusAreas: [], // ask the doctor
  bio: [], // ask the doctor; a default is shown when this is empty
  quote: '', // ask the doctor
};
