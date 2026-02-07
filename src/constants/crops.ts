/**
 * Indian Crops Constants
 * 
 * Contains 50+ common Indian crops used in farming with their details.
 * Includes categories: vegetable, fruit, grain, pulse, oilseed, spice, fiber
 */

// ============================================
// Types
// ============================================

export type CropCategory = 
  | 'vegetable'
  | 'fruit'
  | 'grain'
  | 'pulse'
  | 'oilseed'
  | 'spice'
  | 'fiber'
  | 'cash_crop'
  | 'fodder';

export interface Crop {
  id: string;
  name: string;
  nameHindi: string;
  category: CropCategory;
}

// ============================================
// Complete Crop List (50+ crops)
// ============================================

export const CROP_LIST: Crop[] = [
  // Grains (15)
  { id: 'rice', name: 'Rice', nameHindi: 'चावल', category: 'grain' },
  { id: 'wheat', name: 'Wheat', nameHindi: 'गेहूं', category: 'grain' },
  { id: 'maize', name: 'Maize (Corn)', nameHindi: 'मक्का', category: 'grain' },
  { id: 'bajra', name: 'Pearl Millet (Bajra)', nameHindi: 'बाजरा', category: 'grain' },
  { id: 'jowar', name: 'Sorghum (Jowar)', nameHindi: 'ज्वार', category: 'grain' },
  { id: 'ragi', name: 'Finger Millet (Ragi)', nameHindi: 'रागी', category: 'grain' },
  { id: 'barley', name: 'Barley', nameHindi: 'जौ', category: 'grain' },
  { id: 'oats', name: 'Oats', nameHindi: 'जई', category: 'grain' },
  { id: 'kodo', name: 'Kodo Millet', nameHindi: 'कोदो', category: 'grain' },
  { id: 'foxtail_millet', name: 'Foxtail Millet', nameHindi: 'काकुन', category: 'grain' },
  { id: 'little_millet', name: 'Little Millet', nameHindi: 'कुटकी', category: 'grain' },
  { id: 'barnyard_millet', name: 'Barnyard Millet', nameHindi: 'सांवा', category: 'grain' },
  { id: 'proso_millet', name: 'Proso Millet', nameHindi: 'चीना', category: 'grain' },
  { id: 'amaranth', name: 'Amaranth', nameHindi: 'राजगिरा', category: 'grain' },
  { id: 'buckwheat', name: 'Buckwheat', nameHindi: 'कुट्टू', category: 'grain' },

  // Pulses (10)
  { id: 'chickpea', name: 'Chickpea (Chana)', nameHindi: 'चना', category: 'pulse' },
  { id: 'pigeonpea', name: 'Pigeon Pea (Arhar/Toor)', nameHindi: 'अरहर', category: 'pulse' },
  { id: 'lentil', name: 'Lentil (Masoor)', nameHindi: 'मसूर', category: 'pulse' },
  { id: 'mungbean', name: 'Mung Bean (Moong)', nameHindi: 'मूंग', category: 'pulse' },
  { id: 'uradbean', name: 'Black Gram (Urad)', nameHindi: 'उड़द', category: 'pulse' },
  { id: 'kidney_bean', name: 'Kidney Bean (Rajma)', nameHindi: 'राजमा', category: 'pulse' },
  { id: 'cowpea', name: 'Cowpea (Lobia)', nameHindi: 'लोबिया', category: 'pulse' },
  { id: 'mothbean', name: 'Moth Bean', nameHindi: 'मोठ', category: 'pulse' },
  { id: 'horsegram', name: 'Horse Gram (Kulthi)', nameHindi: 'कुलथी', category: 'pulse' },
  { id: 'fieldpea', name: 'Field Pea (Matar)', nameHindi: 'मटर', category: 'pulse' },

  // Oilseeds (8)
  { id: 'groundnut', name: 'Groundnut (Peanut)', nameHindi: 'मूंगफली', category: 'oilseed' },
  { id: 'soybean', name: 'Soybean', nameHindi: 'सोयाबीन', category: 'oilseed' },
  { id: 'mustard', name: 'Mustard', nameHindi: 'सरसों', category: 'oilseed' },
  { id: 'sunflower', name: 'Sunflower', nameHindi: 'सूरजमुखी', category: 'oilseed' },
  { id: 'sesame', name: 'Sesame (Til)', nameHindi: 'तिल', category: 'oilseed' },
  { id: 'safflower', name: 'Safflower', nameHindi: 'कुसुम', category: 'oilseed' },
  { id: 'linseed', name: 'Linseed (Flax)', nameHindi: 'अलसी', category: 'oilseed' },
  { id: 'castor', name: 'Castor', nameHindi: 'अरंडी', category: 'oilseed' },

  // Vegetables (15)
  { id: 'tomato', name: 'Tomato', nameHindi: 'टमाटर', category: 'vegetable' },
  { id: 'potato', name: 'Potato', nameHindi: 'आलू', category: 'vegetable' },
  { id: 'onion', name: 'Onion', nameHindi: 'प्याज', category: 'vegetable' },
  { id: 'brinjal', name: 'Brinjal (Eggplant)', nameHindi: 'बैंगन', category: 'vegetable' },
  { id: 'cabbage', name: 'Cabbage', nameHindi: 'पत्तागोभी', category: 'vegetable' },
  { id: 'cauliflower', name: 'Cauliflower', nameHindi: 'फूलगोभी', category: 'vegetable' },
  { id: 'okra', name: 'Okra (Bhindi)', nameHindi: 'भिंडी', category: 'vegetable' },
  { id: 'spinach', name: 'Spinach', nameHindi: 'पालक', category: 'vegetable' },
  { id: 'bitter_gourd', name: 'Bitter Gourd', nameHindi: 'करेला', category: 'vegetable' },
  { id: 'bottle_gourd', name: 'Bottle Gourd', nameHindi: 'लौकी', category: 'vegetable' },
  { id: 'cucumber', name: 'Cucumber', nameHindi: 'खीरा', category: 'vegetable' },
  { id: 'carrot', name: 'Carrot', nameHindi: 'गाजर', category: 'vegetable' },
  { id: 'radish', name: 'Radish', nameHindi: 'मूली', category: 'vegetable' },
  { id: 'pumpkin', name: 'Pumpkin', nameHindi: 'कद्दू', category: 'vegetable' },
  { id: 'chili', name: 'Chili Pepper', nameHindi: 'मिर्च', category: 'vegetable' },

  // Fruits (10)
  { id: 'mango', name: 'Mango', nameHindi: 'आम', category: 'fruit' },
  { id: 'banana', name: 'Banana', nameHindi: 'केला', category: 'fruit' },
  { id: 'papaya', name: 'Papaya', nameHindi: 'पपीता', category: 'fruit' },
  { id: 'guava', name: 'Guava', nameHindi: 'अमरूद', category: 'fruit' },
  { id: 'grape', name: 'Grape', nameHindi: 'अंगूर', category: 'fruit' },
  { id: 'pomegranate', name: 'Pomegranate', nameHindi: 'अनार', category: 'fruit' },
  { id: 'watermelon', name: 'Watermelon', nameHindi: 'तरबूज', category: 'fruit' },
  { id: 'orange', name: 'Orange', nameHindi: 'संतरा', category: 'fruit' },
  { id: 'lemon', name: 'Lemon', nameHindi: 'नींबू', category: 'fruit' },
  { id: 'coconut', name: 'Coconut', nameHindi: 'नारियल', category: 'fruit' },

  // Spices (8)
  { id: 'turmeric', name: 'Turmeric', nameHindi: 'हल्दी', category: 'spice' },
  { id: 'ginger', name: 'Ginger', nameHindi: 'अदरक', category: 'spice' },
  { id: 'garlic', name: 'Garlic', nameHindi: 'लहसुन', category: 'spice' },
  { id: 'coriander', name: 'Coriander', nameHindi: 'धनिया', category: 'spice' },
  { id: 'cumin', name: 'Cumin', nameHindi: 'जीरा', category: 'spice' },
  { id: 'fenugreek', name: 'Fenugreek (Methi)', nameHindi: 'मेथी', category: 'spice' },
  { id: 'black_pepper', name: 'Black Pepper', nameHindi: 'काली मिर्च', category: 'spice' },
  { id: 'cardamom', name: 'Cardamom', nameHindi: 'इलायची', category: 'spice' },

  // Fiber Crops (3)
  { id: 'cotton', name: 'Cotton', nameHindi: 'कपास', category: 'fiber' },
  { id: 'jute', name: 'Jute', nameHindi: 'जूट', category: 'fiber' },
  { id: 'hemp', name: 'Hemp', nameHindi: 'भांग', category: 'fiber' },

  // Cash Crops (5)
  { id: 'sugarcane', name: 'Sugarcane', nameHindi: 'गन्ना', category: 'cash_crop' },
  { id: 'tea', name: 'Tea', nameHindi: 'चाय', category: 'cash_crop' },
  { id: 'coffee', name: 'Coffee', nameHindi: 'कॉफी', category: 'cash_crop' },
  { id: 'tobacco', name: 'Tobacco', nameHindi: 'तंबाकू', category: 'cash_crop' },
  { id: 'rubber', name: 'Rubber', nameHindi: 'रबड़', category: 'cash_crop' },

  // Fodder Crops (4)
  { id: 'berseem', name: 'Berseem (Egyptian Clover)', nameHindi: 'बरसीम', category: 'fodder' },
  { id: 'lucerne', name: 'Lucerne (Alfalfa)', nameHindi: 'रिजका', category: 'fodder' },
  { id: 'napier_grass', name: 'Napier Grass', nameHindi: 'नेपियर घास', category: 'fodder' },
  { id: 'oat_fodder', name: 'Oat Fodder', nameHindi: 'जई चारा', category: 'fodder' },
];

// ============================================
// Category-wise Crop Arrays
// ============================================

export const VEGETABLE_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'vegetable'
);

export const FRUIT_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'fruit'
);

export const GRAIN_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'grain'
);

export const PULSE_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'pulse'
);

export const OILSEED_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'oilseed'
);

export const SPICE_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'spice'
);

export const FIBER_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'fiber'
);

export const CASH_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'cash_crop'
);

export const FODDER_CROPS: Crop[] = CROP_LIST.filter(
  crop => crop.category === 'fodder'
);

// ============================================
// Helper Functions
// ============================================

/**
 * Get crop by ID
 */
export function getCropById(id: string): Crop | undefined {
  return CROP_LIST.find(crop => crop.id === id);
}

/**
 * Get crop by name (case-insensitive)
 */
export function getCropByName(name: string): Crop | undefined {
  const lowerName = name.toLowerCase();
  return CROP_LIST.find(
    crop => 
      crop.name.toLowerCase() === lowerName ||
      crop.nameHindi === name
  );
}

/**
 * Get crops by category
 */
export function getCropsByCategory(category: CropCategory): Crop[] {
  return CROP_LIST.filter(crop => crop.category === category);
}

/**
 * Search crops by name (partial match, supports English and Hindi)
 */
export function searchCrops(query: string): Crop[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return CROP_LIST;

  return CROP_LIST.filter(
    crop =>
      crop.name.toLowerCase().includes(lowerQuery) ||
      crop.nameHindi.includes(query) ||
      crop.id.includes(lowerQuery)
  );
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: CropCategory): string {
  const categoryNames: Record<CropCategory, string> = {
    vegetable: 'Vegetables',
    fruit: 'Fruits',
    grain: 'Grains & Cereals',
    pulse: 'Pulses & Legumes',
    oilseed: 'Oilseeds',
    spice: 'Spices',
    fiber: 'Fiber Crops',
    cash_crop: 'Cash Crops',
    fodder: 'Fodder Crops',
  };
  return categoryNames[category];
}

/**
 * Get category display name in Hindi
 */
export function getCategoryDisplayNameHindi(category: CropCategory): string {
  const categoryNames: Record<CropCategory, string> = {
    vegetable: 'सब्जियां',
    fruit: 'फल',
    grain: 'अनाज',
    pulse: 'दालें',
    oilseed: 'तिलहन',
    spice: 'मसाले',
    fiber: 'रेशा फसलें',
    cash_crop: 'नकदी फसलें',
    fodder: 'चारा फसलें',
  };
  return categoryNames[category];
}

// ============================================
// Dropdown Option Formatters
// ============================================

/**
 * Get crops as dropdown options
 */
export function getCropDropdownOptions(): Array<{ label: string; value: string }> {
  return CROP_LIST.map(crop => ({
    label: `${crop.name} (${crop.nameHindi})`,
    value: crop.id,
  }));
}

/**
 * Get crops as dropdown options by category
 */
export function getCropDropdownOptionsByCategory(
  category: CropCategory
): Array<{ label: string; value: string }> {
  return getCropsByCategory(category).map(crop => ({
    label: `${crop.name} (${crop.nameHindi})`,
    value: crop.id,
  }));
}

/**
 * Get category dropdown options
 */
export function getCategoryDropdownOptions(): Array<{ label: string; value: CropCategory }> {
  const categories: CropCategory[] = [
    'grain',
    'pulse',
    'oilseed',
    'vegetable',
    'fruit',
    'spice',
    'fiber',
    'cash_crop',
    'fodder',
  ];

  return categories.map(category => ({
    label: getCategoryDisplayName(category),
    value: category,
  }));
}

/**
 * Get grouped crop dropdown options (grouped by category)
 */
export function getGroupedCropDropdownOptions(): Array<{
  category: string;
  options: Array<{ label: string; value: string }>;
}> {
  const categories: CropCategory[] = [
    'grain',
    'pulse',
    'oilseed',
    'vegetable',
    'fruit',
    'spice',
    'fiber',
    'cash_crop',
    'fodder',
  ];

  return categories.map(category => ({
    category: getCategoryDisplayName(category),
    options: getCropsByCategory(category).map(crop => ({
      label: `${crop.name} (${crop.nameHindi})`,
      value: crop.id,
    })),
  }));
}
