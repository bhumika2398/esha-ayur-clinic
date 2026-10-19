import type { Category } from './treatments';

export interface PriceItem {
  id: string;
  category: Category;
  group_name: string;
  service: string;
  duration: string;
  price: number | null; // single session, in INR
  pkg3: number | null; // per session when booking 3 days
  pkg5: number | null;
  pkg7: number | null;
  note: string;
}

const N = null;
const PPS = 'PPS = Patra Pinda Sweda (confirm with the doctor)';
const SSPS = 'SSPS = Shashtika Shali Pinda Sweda (confirm with the doctor)';

// Built-in price list. It is used on the website when the database has no price items,
// and by the admin panel's "Import current price list" button.
// Columns: category, group, service, duration, session, 3-day, 5-day, 7-day, note
type Row = [Category, string, string, string, number | null, number | null, number | null, number | null, string?];

const rows: Row[] = [
  ['body', 'Abhyanga', 'Sarvanga Abhyanga with steam', '1 hr 15 min', 1800, 1800, 1700, 1600],
  ['body', 'Abhyanga', 'Sarvanga Abhyanga with steam', '1 hr', 1600, 1500, 1450, 1350],
  ['body', 'Abhyanga', 'Ardhanga Abhyanga', '30 min', 1200, 1150, 1100, 1000],
  ['body', 'Abhyanga', 'Ardhanga Abhyanga with steam', '45 min', 1500, 1400, 1300, 1200],
  ['body', 'Abhyanga', 'Ekanga Abhyanga with steam', '30 min', 900, N, N, N],
  ['body', 'Abhyanga', 'Shiro Abhyanga (head)', '20 min', 500, N, N, N],
  ['body', 'Abhyanga', 'Mukha Abhyanga (face)', '20 min', 500, N, N, N],
  ['body', 'Abhyanga', 'Pada Abhyanga (feet)', '20 min', 800, N, N, N],
  ['body', 'Pinda Sweda', 'Sarvanga Patra Pinda Sweda', '50 min', 1800, 1700, 1600, 1500],
  ['body', 'Pinda Sweda', 'Ardhanga Abhyanga with Patra Pinda Sweda (PPS)', '1 hr', 2500, 2250, 2150, 2000, PPS],
  ['body', 'Pinda Sweda', 'Ekanga Abhyanga with Patra Pinda Sweda (PPS)', '30 min', 1000, N, N, N, PPS],
  ['body', 'Pinda Sweda', 'Sarvanga Abhyanga with SSPS', '1 hr 30 min', 2800, N, N, N, SSPS],
  ['body', 'Pinda Sweda', 'Ardhanga Abhyanga with SSPS', '1 hr', 2000, N, N, N, SSPS],
  ['body', 'Pinda Sweda', 'Ekanga Abhyanga with SSPS', '30 min', 1200, N, N, N, SSPS],
  ['body', 'Pinda Sweda', 'Sarvanga Choorna Pinda Sweda', '1 hr', 1800, N, N, N],
  ['body', 'Pinda Sweda', 'Mamsa Pinda Sweda', '1 hr', 2500, N, N, N],
  ['body', 'Pinda Sweda', 'Ardhanga Choorna Pinda Sweda (CPS)', '45 min', 1400, N, N, N, 'CPS = Choorna Pinda Sweda (confirm with the doctor)'],
  ['body', 'Pinda Sweda', 'Ekanga Kukkutanda Sweda', '30 min', 1000, N, N, N],
  ['body', 'Pinda Sweda', 'Jambeera Sweda (Ekanga)', '30 min', 1000, N, N, N, 'Spelling to confirm (original sheet says Jabeera)'],
  ['body', 'Pinda Sweda', 'Kukkutanda Sweda (Sthanika)', '45 min', 1200, N, N, N],
  ['body', 'Udwarthana', 'Sarvanga Udwarthana with steam', '1 hr 15 min', 2000, 1800, 1700, 1600],
  ['body', 'Udwarthana', 'Ardhanga Udwarthana with steam', '45 min', 1600, N, N, N],
  ['body', 'Local Basti', 'Kati Basti', '45 min', 1300, N, N, N],
  ['body', 'Local Basti', 'Greeva Basti', '45 min', 1300, N, N, N],
  ['body', 'Local Basti', 'Janu Basti (single knee)', '45 min', 1300, N, N, N],
  ['body', 'Local Basti', 'Janu Basti (both knees)', '45 min', 1700, N, N, N],
  ['body', 'Shirodhara and Head', 'Shiro Dhara', '45 min', 2000, N, N, N],
  ['body', 'Shirodhara and Head', 'Shiro Basti', '1 hr', 2400, N, N, N],
  ['body', 'Shirodhara and Head', 'Ksheera Dhara (head)', '45 min', 1700, N, N, N],
  ['body', 'Shirodhara and Head', 'Takra Dhara (head)', '45 min', 1700, N, N, N],
  ['body', 'Body Dhara', 'Ksheera Dhara (Sarvanga)', '1 hr', 2200, N, N, N],
  ['body', 'Body Dhara', 'Takra Dhara (Sarvanga)', '1 hr', 2100, N, N, N],
  ['body', 'Body Dhara', 'Sarvanga Kashaya Dhara', '30 min', 1500, N, N, N],
  ['body', 'Body Dhara', 'Dhanyamla Dhara (Sarvanga)', '30 min', 1700, N, N, N],
  ['body', 'Body Dhara', 'Dhanyamla Dhara (Ardhanga)', '30 min', 1300, N, N, N],
  ['body', 'Eye and Nasal', 'Netra Tarpana', '45 min', 1500, N, N, N],
  ['body', 'Eye and Nasal', 'Nasya with Dhumapana', '30 min', 1100, N, N, N],
  ['body', 'Swedana', 'Ishtika Sweda', '30 min', 1300, N, N, N],
  ['body', 'Swedana', 'Valuka Sweda (Sarvanga)', '45 min', 1500, N, N, N],
  ['body', 'Swedana', 'Valuka Sweda (Ardhanga)', '30 min', 1000, N, N, N],
  ['body', 'Navara Theppu', 'Navara Theppu', '45 min', 1000, N, N, N],
  ['body', 'Jaloukavacharana', 'Jaloukavacharana', '1 hr', 1000, N, N, N],
  ['body', 'Panchakarma', 'Matra Basti', '20 min', 1000, N, N, N],
  ['body', 'Panchakarma', 'Kashaya Basti', '45 min', 1500, N, N, N],
  ['body', 'Panchakarma', 'Virechana', '', 10500, N, N, N],
  ['body', 'Panchakarma', 'Vamana', '', 10500, N, N, N],
  ['skin', 'Facials', 'Navara Facial', '', 1200, N, N, N],
  ['skin', 'Facials', 'Kunkumadi Taila Facial', '', 1200, N, N, N],
  ['womens', "Women's Care", 'Yoni Pichu', '', 1000, N, N, N],
  ['womens', "Women's Care", 'Yoni Prakshalana', '', 1000, N, N, N],
  ['weight', 'Weight Reduction Package', 'Udwarthana followed by Virechana', '', 16500, N, N, N],
  ['weight', 'Weight Reduction Package', 'Udwarthana followed by Vamana', '', N, N, N, N, 'Price to be confirmed'],
];

export const starterPrices: PriceItem[] = rows.map(([category, group_name, service, duration, price, pkg3, pkg5, pkg7, note], i) => ({
  id: `starter-${i}`,
  category,
  group_name,
  service,
  duration,
  price,
  pkg3,
  pkg5,
  pkg7,
  note: note ?? '',
}));
