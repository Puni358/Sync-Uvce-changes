// Marketplace API & Storage Client for Sync-UVCE

const STORAGE_KEY = 'sync_uvce_marketplace_items';

// SVG Data URIs for crisp, reliable offline image rendering
const MOCK_IMAGES = {
  mathsBook: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23eff6ff"/><path d="M140 70H260C271 70 280 79 280 90V210C280 221 271 230 260 230H140C129 230 120 221 120 210V90C120 79 129 70 140 70Z" fill="%232563eb"/><rect x="150" y="90" width="100" height="120" rx="4" fill="white" opacity="0.9"/><text x="200" y="145" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231d4ed8" text-anchor="middle">MATHS III</text><text x="200" y="165" font-family="sans-serif" font-size="10" fill="%23475569" text-anchor="middle">B.S. Grewal</text></svg>`,
  calculator: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23f1f5f9"/><rect x="130" y="50" width="140" height="200" rx="16" fill="%230f172a"/><rect x="145" y="70" width="110" height="40" rx="4" fill="%2394a3b8"/><rect x="145" y="125" width="22" height="16" rx="3" fill="%2338bdf8"/><rect x="174" y="125" width="22" height="16" rx="3" fill="%2338bdf8"/><rect x="203" y="125" width="22" height="16" rx="3" fill="%2338bdf8"/><rect x="233" y="125" width="22" height="16" rx="3" fill="%23f59e0b"/><rect x="145" y="150" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="174" y="150" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="203" y="150" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="233" y="150" width="22" height="16" rx="3" fill="%232563eb"/><rect x="145" y="175" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="174" y="175" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="203" y="175" width="22" height="16" rx="3" fill="%23e2e8f0"/><rect x="233" y="175" width="22" height="40" rx="3" fill="%232563eb"/><text x="200" y="95" font-family="monospace" font-size="16" font-weight="bold" fill="%230f172a" text-anchor="middle">CASIO FX-991</text></svg>`,
  labCoat: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23f8fafc"/><path d="M130 80L170 60H230L270 80L290 140H250V250H150V140H110L130 80Z" fill="white" stroke="%23cbd5e1" stroke-width="3"/><path d="M170 60V130L200 160L230 130V60" fill="%23eff6ff" stroke="%2394a3b8" stroke-width="2"/><rect x="165" y="170" width="25" height="30" rx="2" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="200" y="275" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2364748b" text-anchor="middle">UVCE LAB COAT</text></svg>`,
  drafter: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23fffbeb"/><rect x="80" y="60" width="240" height="180" rx="8" fill="%23d97706" opacity="0.8"/><rect x="90" y="70" width="220" height="160" rx="4" fill="%23fef3c7"/><path d="M120 100L250 190M250 190H140M250 190V100" stroke="%230f172a" stroke-width="4" stroke-linecap="round"/><circle cx="250" cy="190" r="10" fill="%232563eb"/><text x="200" y="260" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23b45309" text-anchor="middle">MINI DRAFTER KIT</text></svg>`,
  notes: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none"><rect width="400" height="300" fill="%23f0fdf4"/><rect x="130" y="50" width="140" height="190" rx="6" fill="white" stroke="%23bbf7d0" stroke-width="2"/><line x1="150" y1="80" x2="250" y2="80" stroke="%23166534" stroke-width="4" stroke-linecap="round"/><line x1="150" y1="110" x2="240" y2="110" stroke="%2386efac" stroke-width="3"/><line x1="150" y1="135" x2="230" y2="135" stroke="%2386efac" stroke-width="3"/><line x1="150" y1="160" x2="245" y2="160" stroke="%2386efac" stroke-width="3"/><text x="200" y="200" font-family="sans-serif" font-size="13" font-weight="bold" fill="%2315803d" text-anchor="middle">DSA Notes (4th Sem)</text></svg>`,
};

export const INITIAL_MARKETPLACE_ITEMS = [
  {
    id: 'item-1',
    title: 'Engineering Mathematics - III (B.S. Grewal)',
    price: 350,
    pricingType: 'Fixed Price', // 'Fixed Price' | 'Negotiable'
    description: 'Standard textbook for 3rd semester CSE/ECE/EEE. Excellent condition with no highlighted text.',
    category: 'books',
    image: MOCK_IMAGES.mathsBook,
    sellerName: 'Rahul M.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'item-2',
    title: 'Casio FX-991EX ClassWiz Calculator',
    price: 800,
    pricingType: 'Negotiable',
    description: 'Works perfectly. Includes original protective hard shell case. Ideal for engineering exams.',
    category: 'calculator',
    image: MOCK_IMAGES.calculator,
    sellerName: 'Ananya S.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'item-3',
    title: 'UVCE Official White Lab Coat (Size L)',
    price: 250,
    pricingType: 'Fixed Price',
    description: 'Cleaned and ironed. Used for one semester during Physics & Chemistry lab sessions.',
    category: 'equipment',
    image: MOCK_IMAGES.labCoat,
    sellerName: 'Karthik K.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'item-4',
    title: 'Omega Mini Drafter & Drawing Sheet Holder',
    price: 450,
    pricingType: 'Negotiable',
    description: 'Complete engineering graphics drafting set. Includes clamps, scale, and protective bag.',
    category: 'equipment',
    image: MOCK_IMAGES.drafter,
    sellerName: 'Priya N.',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'item-5',
    title: 'Data Structures & Algorithms Handwritten Notes',
    price: 150,
    pricingType: 'Fixed Price',
    description: 'Neat, topic-wise handwritten notes covering Trees, Graphs, Dynamic Programming & sorting algorithms.',
    category: 'notes',
    image: MOCK_IMAGES.notes,
    sellerName: 'Meghana R.',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
];

/**
 * Get all marketplace items (loads from localStorage or falls back to initial mock items)
 */
export function getMarketplaceItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading marketplace items from storage:', err);
  }
  // Default initial seed
  return INITIAL_MARKETPLACE_ITEMS;
}

/**
 * Save item list to localStorage
 */
export function saveMarketplaceItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving marketplace items to storage:', err);
  }
}
