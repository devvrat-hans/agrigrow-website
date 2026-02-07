/**
 * Crop AI Constants
 * 
 * Comprehensive constants for Indian agriculture including
 * crops, states, districts, growth stages, diseases, and nutrients.
 */

// INDIAN CROPS GROUPED BY CATEGORY

export interface CropInfo {
  id: string;
  name: string;
  nameHi?: string; // Hindi name
  category: string;
}

export const CROP_CATEGORIES = [
  'Cereals',
  'Pulses',
  'Oilseeds',
  'Vegetables',
  'Fruits',
  'Spices',
  'Fibers',
  'Cash Crops',
  'Plantation Crops',
  'Medicinal Plants',
] as const;

export type CropCategory = (typeof CROP_CATEGORIES)[number];

export const INDIAN_CROPS: CropInfo[] = [
  // Cereals
  { id: 'rice', name: 'Rice', nameHi: 'चावल', category: 'Cereals' },
  { id: 'wheat', name: 'Wheat', nameHi: 'गेहूं', category: 'Cereals' },
  { id: 'maize', name: 'Maize', nameHi: 'मक्का', category: 'Cereals' },
  { id: 'bajra', name: 'Bajra (Pearl Millet)', nameHi: 'बाजरा', category: 'Cereals' },
  { id: 'jowar', name: 'Jowar (Sorghum)', nameHi: 'ज्वार', category: 'Cereals' },
  { id: 'ragi', name: 'Ragi (Finger Millet)', nameHi: 'रागी', category: 'Cereals' },
  { id: 'barley', name: 'Barley', nameHi: 'जौ', category: 'Cereals' },
  
  // Pulses
  { id: 'chickpea', name: 'Chickpea (Chana)', nameHi: 'चना', category: 'Pulses' },
  { id: 'pigeon_pea', name: 'Pigeon Pea (Arhar/Tur)', nameHi: 'अरहर', category: 'Pulses' },
  { id: 'lentil', name: 'Lentil (Masoor)', nameHi: 'मसूर', category: 'Pulses' },
  { id: 'green_gram', name: 'Green Gram (Moong)', nameHi: 'मूंग', category: 'Pulses' },
  { id: 'black_gram', name: 'Black Gram (Urad)', nameHi: 'उड़द', category: 'Pulses' },
  { id: 'kidney_bean', name: 'Kidney Bean (Rajma)', nameHi: 'राजमा', category: 'Pulses' },
  { id: 'peas', name: 'Peas (Matar)', nameHi: 'मटर', category: 'Pulses' },
  
  // Oilseeds
  { id: 'groundnut', name: 'Groundnut', nameHi: 'मूंगफली', category: 'Oilseeds' },
  { id: 'mustard', name: 'Mustard', nameHi: 'सरसों', category: 'Oilseeds' },
  { id: 'soybean', name: 'Soybean', nameHi: 'सोयाबीन', category: 'Oilseeds' },
  { id: 'sunflower', name: 'Sunflower', nameHi: 'सूरजमुखी', category: 'Oilseeds' },
  { id: 'sesame', name: 'Sesame (Til)', nameHi: 'तिल', category: 'Oilseeds' },
  { id: 'castor', name: 'Castor', nameHi: 'अरंडी', category: 'Oilseeds' },
  { id: 'linseed', name: 'Linseed', nameHi: 'अलसी', category: 'Oilseeds' },
  
  // Vegetables
  { id: 'tomato', name: 'Tomato', nameHi: 'टमाटर', category: 'Vegetables' },
  { id: 'potato', name: 'Potato', nameHi: 'आलू', category: 'Vegetables' },
  { id: 'onion', name: 'Onion', nameHi: 'प्याज', category: 'Vegetables' },
  { id: 'brinjal', name: 'Brinjal (Eggplant)', nameHi: 'बैंगन', category: 'Vegetables' },
  { id: 'cabbage', name: 'Cabbage', nameHi: 'पत्ता गोभी', category: 'Vegetables' },
  { id: 'cauliflower', name: 'Cauliflower', nameHi: 'फूल गोभी', category: 'Vegetables' },
  { id: 'okra', name: 'Okra (Bhindi)', nameHi: 'भिंडी', category: 'Vegetables' },
  { id: 'capsicum', name: 'Capsicum', nameHi: 'शिमला मिर्च', category: 'Vegetables' },
  { id: 'spinach', name: 'Spinach (Palak)', nameHi: 'पालक', category: 'Vegetables' },
  { id: 'bottle_gourd', name: 'Bottle Gourd (Lauki)', nameHi: 'लौकी', category: 'Vegetables' },
  { id: 'bitter_gourd', name: 'Bitter Gourd (Karela)', nameHi: 'करेला', category: 'Vegetables' },
  { id: 'cucumber', name: 'Cucumber (Kheera)', nameHi: 'खीरा', category: 'Vegetables' },
  { id: 'pumpkin', name: 'Pumpkin (Kaddu)', nameHi: 'कद्दू', category: 'Vegetables' },
  { id: 'radish', name: 'Radish (Mooli)', nameHi: 'मूली', category: 'Vegetables' },
  { id: 'carrot', name: 'Carrot (Gajar)', nameHi: 'गाजर', category: 'Vegetables' },
  
  // Fruits
  { id: 'mango', name: 'Mango', nameHi: 'आम', category: 'Fruits' },
  { id: 'banana', name: 'Banana', nameHi: 'केला', category: 'Fruits' },
  { id: 'papaya', name: 'Papaya', nameHi: 'पपीता', category: 'Fruits' },
  { id: 'guava', name: 'Guava', nameHi: 'अमरूद', category: 'Fruits' },
  { id: 'pomegranate', name: 'Pomegranate', nameHi: 'अनार', category: 'Fruits' },
  { id: 'grapes', name: 'Grapes', nameHi: 'अंगूर', category: 'Fruits' },
  { id: 'watermelon', name: 'Watermelon', nameHi: 'तरबूज', category: 'Fruits' },
  { id: 'orange', name: 'Orange', nameHi: 'संतरा', category: 'Fruits' },
  { id: 'apple', name: 'Apple', nameHi: 'सेब', category: 'Fruits' },
  { id: 'lemon', name: 'Lemon', nameHi: 'नींबू', category: 'Fruits' },
  
  // Spices
  { id: 'turmeric', name: 'Turmeric', nameHi: 'हल्दी', category: 'Spices' },
  { id: 'ginger', name: 'Ginger', nameHi: 'अदरक', category: 'Spices' },
  { id: 'garlic', name: 'Garlic', nameHi: 'लहसुन', category: 'Spices' },
  { id: 'chilli', name: 'Chilli', nameHi: 'मिर्च', category: 'Spices' },
  { id: 'coriander', name: 'Coriander', nameHi: 'धनिया', category: 'Spices' },
  { id: 'cumin', name: 'Cumin', nameHi: 'जीरा', category: 'Spices' },
  { id: 'fenugreek', name: 'Fenugreek (Methi)', nameHi: 'मेथी', category: 'Spices' },
  { id: 'cardamom', name: 'Cardamom', nameHi: 'इलायची', category: 'Spices' },
  { id: 'black_pepper', name: 'Black Pepper', nameHi: 'काली मिर्च', category: 'Spices' },
  
  // Fibers
  { id: 'cotton', name: 'Cotton', nameHi: 'कपास', category: 'Fibers' },
  { id: 'jute', name: 'Jute', nameHi: 'जूट', category: 'Fibers' },
  { id: 'hemp', name: 'Hemp', nameHi: 'भांग', category: 'Fibers' },
  
  // Cash Crops
  { id: 'sugarcane', name: 'Sugarcane', nameHi: 'गन्ना', category: 'Cash Crops' },
  { id: 'tobacco', name: 'Tobacco', nameHi: 'तंबाकू', category: 'Cash Crops' },
  
  // Plantation Crops
  { id: 'tea', name: 'Tea', nameHi: 'चाय', category: 'Plantation Crops' },
  { id: 'coffee', name: 'Coffee', nameHi: 'कॉफ़ी', category: 'Plantation Crops' },
  { id: 'coconut', name: 'Coconut', nameHi: 'नारियल', category: 'Plantation Crops' },
  { id: 'arecanut', name: 'Arecanut', nameHi: 'सुपारी', category: 'Plantation Crops' },
  { id: 'rubber', name: 'Rubber', nameHi: 'रबड़', category: 'Plantation Crops' },
  
  // Medicinal Plants
  { id: 'aloe_vera', name: 'Aloe Vera', nameHi: 'एलोवेरा', category: 'Medicinal Plants' },
  { id: 'tulsi', name: 'Tulsi (Holy Basil)', nameHi: 'तुलसी', category: 'Medicinal Plants' },
  { id: 'ashwagandha', name: 'Ashwagandha', nameHi: 'अश्वगंधा', category: 'Medicinal Plants' },
  { id: 'neem', name: 'Neem', nameHi: 'नीम', category: 'Medicinal Plants' },
];

/**
 * Get crops by category
 */
export function getCropsByCategory(category: CropCategory): CropInfo[] {
  return INDIAN_CROPS.filter((crop) => crop.category === category);
}

/**
 * Get grouped crops by category
 */
export function getGroupedCrops(): Record<CropCategory, CropInfo[]> {
  return CROP_CATEGORIES.reduce((acc, category) => {
    acc[category] = getCropsByCategory(category);
    return acc;
  }, {} as Record<CropCategory, CropInfo[]>);
}

// INDIAN STATES

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

// DISTRICTS BY STATE (Top 10 major districts per state for brevity)

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna',
    'Kurnool', 'Nellore', 'Prakasam', 'Visakhapatnam', 'West Godavari',
    'Srikakulam', 'Vizianagaram', 'Kadapa',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Tawang', 'West Kameng', 'East Kameng', 'Papum Pare',
    'Lower Subansiri', 'Upper Subansiri', 'Changlang', 'Tirap', 'Lohit',
  ],
  'Assam': [
    'Guwahati', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Silchar',
    'Tezpur', 'Tinsukia', 'Bongaigaon', 'Barpeta', 'Goalpara',
    'Kamrup', 'Karimganj', 'Sivasagar',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga',
    'Purnia', 'Nalanda', 'Vaishali', 'Begusarai', 'Samastipur',
    'Munger', 'Saran', 'Rohtas',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon',
    'Raigarh', 'Jagdalpur', 'Ambikapur', 'Kanker', 'Mahasamund',
  ],
  'Goa': [
    'North Goa', 'South Goa', 'Panaji', 'Margao', 'Vasco da Gama',
    'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Canacona',
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar',
    'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana',
    'Kutch', 'Bharuch', 'Navsari', 'Kheda',
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar',
    'Karnal', 'Rohtak', 'Sonipat', 'Yamunanagar', 'Sirsa',
    'Bhiwani', 'Jhajjar', 'Rewari',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Kangra', 'Mandi', 'Kullu', 'Solan',
    'Sirmaur', 'Hamirpur', 'Una', 'Bilaspur', 'Chamba',
    'Kinnaur', 'Lahaul and Spiti',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh',
    'Deoghar', 'Giridih', 'Dumka', 'Ramgarh', 'Chaibasa',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli-Dharwad', 'Belagavi',
    'Ballari', 'Shivamogga', 'Tumkuru', 'Davangere', 'Udupi',
    'Hassan', 'Kalaburagi', 'Vijayapura', 'Mandya',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam',
    'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Malappuram',
    'Wayanad', 'Idukki', 'Ernakulam', 'Pathanamthitta',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain',
    'Sagar', 'Satna', 'Rewa', 'Ratlam', 'Chhindwara',
    'Dewas', 'Khargone', 'Hoshangabad', 'Betul',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad',
    'Solapur', 'Kolhapur', 'Thane', 'Sangli', 'Satara',
    'Jalgaon', 'Ahmednagar', 'Amravati', 'Nanded', 'Latur',
  ],
  'Manipur': [
    'Imphal East', 'Imphal West', 'Thoubal', 'Bishnupur', 'Churachandpur',
    'Senapati', 'Tamenglong', 'Ukhrul', 'Chandel', 'Jiribam',
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Nongpoh',
    'Williamnagar', 'Baghmara', 'Mairang', 'Resubelpara', 'Ampati',
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib',
    'Lawngtlai', 'Mamit', 'Saiha', 'Khawzawl', 'Saitual',
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha',
    'Zunheboto', 'Mon', 'Phek', 'Longleng', 'Peren',
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Berhampur', 'Rourkela', 'Sambalpur',
    'Puri', 'Balasore', 'Baripada', 'Bhadrak', 'Kendrapara',
    'Angul', 'Jharsuguda', 'Koraput',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
    'Mohali', 'Pathankot', 'Hoshiarpur', 'Moga', 'Sangrur',
    'Ferozepur', 'Gurdaspur', 'Kapurthala',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner',
    'Ajmer', 'Alwar', 'Bhilwara', 'Sikar', 'Bharatpur',
    'Nagaur', 'Chittorgarh', 'Pali', 'Sri Ganganagar',
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Pakyong',
    'Soreng', 'Rangpo', 'Jorethang', 'Singtam', 'Ravangla',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Erode', 'Vellore', 'Thanjavur', 'Dindigul',
    'Tiruppur', 'Kanchipuram', 'Cuddalore', 'Karur',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
    'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Medak', 'Rangareddy',
    'Sangareddy', 'Siddipet', 'Suryapet',
  ],
  'Tripura': [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Ambassa',
    'Belonia', 'Khowai', 'Teliamura', 'Sabroom', 'Santirbazar',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi',
    'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad',
    'Gorakhpur', 'Noida', 'Jhansi', 'Mathura', 'Saharanpur',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani',
    'Roorkee', 'Rudrapur', 'Kashipur', 'Kotdwar', 'Pithoragarh',
    'Almora', 'Chamoli', 'Uttarkashi',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur',
    'Bardhaman', 'Malda', 'Kharagpur', 'Haldia', 'Krishnanagar',
    'Baharampur', 'Jalpaiguri', 'Cooch Behar', 'Bankura',
  ],
  // Union Territories
  'Andaman and Nicobar Islands': [
    'Port Blair', 'Car Nicobar', 'Diglipur', 'Mayabunder', 'Rangat',
    'Havelock', 'Neil Island', 'Campbell Bay', 'Hutbay', 'Wandoor',
  ],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': [
    'Silvassa', 'Daman', 'Diu', 'Naroli', 'Vapi',
  ],
  'Delhi': [
    'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
    'Central Delhi', 'North East Delhi', 'North West Delhi', 'South East Delhi',
    'South West Delhi', 'Shahdara',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Pulwama',
    'Udhampur', 'Kathua', 'Kupwara', 'Budgam', 'Rajouri',
    'Doda', 'Poonch', 'Shopian',
  ],
  'Ladakh': [
    'Leh', 'Kargil', 'Nubra', 'Zanskar', 'Drass',
  ],
  'Lakshadweep': [
    'Kavaratti', 'Agatti', 'Minicoy', 'Andrott', 'Amini',
    'Kiltan', 'Kadmat', 'Kalpeni', 'Chetlat', 'Bitra',
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Ozhukarai',
  ],
};

// CROP GROWTH STAGES

export interface CropGrowthStageInfo {
  id: string;
  name: string;
  description: string;
  daysRange?: string;
}

export const CROP_GROWTH_STAGES: CropGrowthStageInfo[] = [
  {
    id: 'germination',
    name: 'Germination',
    description: 'Seed absorbs water and begins to sprout',
    daysRange: '0-7 days',
  },
  {
    id: 'seedling',
    name: 'Seedling',
    description: 'Young plant emerges with first leaves',
    daysRange: '7-21 days',
  },
  {
    id: 'vegetative',
    name: 'Vegetative Growth',
    description: 'Plant develops stems, leaves, and roots',
    daysRange: '21-60 days',
  },
  {
    id: 'flowering',
    name: 'Flowering',
    description: 'Plant produces flowers for reproduction',
    daysRange: '60-90 days',
  },
  {
    id: 'fruit_development',
    name: 'Fruit Development',
    description: 'Fruits or grains form and develop',
    daysRange: '90-120 days',
  },
  {
    id: 'maturation',
    name: 'Maturation',
    description: 'Crop reaches full size and begins to ripen',
    daysRange: '120-150 days',
  },
  {
    id: 'harvest',
    name: 'Harvest Ready',
    description: 'Crop is ready for harvesting',
    daysRange: '150+ days',
  },
  {
    id: 'post_harvest',
    name: 'Post-Harvest',
    description: 'After harvest processing and storage',
  },
];

// COMMON DISEASES

export interface Disease {
  id: string;
  name: string;
  affectedCrops: string[];
  symptoms: string[];
  causes: string;
  severity: 'low' | 'medium' | 'high';
}

export const COMMON_DISEASES: Disease[] = [
  {
    id: 'bacterial_leaf_blight',
    name: 'Bacterial Leaf Blight',
    affectedCrops: ['rice', 'wheat'],
    symptoms: ['Yellow to white lesions on leaves', 'Wilting of seedlings', 'Milky bacterial ooze'],
    causes: 'Xanthomonas oryzae bacteria',
    severity: 'high',
  },
  {
    id: 'blast',
    name: 'Rice Blast',
    affectedCrops: ['rice'],
    symptoms: ['Diamond-shaped lesions', 'Gray centers with brown borders', 'Neck rot'],
    causes: 'Magnaporthe grisea fungus',
    severity: 'high',
  },
  {
    id: 'rust',
    name: 'Rust Disease',
    affectedCrops: ['wheat', 'barley', 'maize'],
    symptoms: ['Orange-brown pustules on leaves', 'Yellowing', 'Premature drying'],
    causes: 'Puccinia species fungi',
    severity: 'high',
  },
  {
    id: 'powdery_mildew',
    name: 'Powdery Mildew',
    affectedCrops: ['wheat', 'peas', 'cucumber', 'grapes'],
    symptoms: ['White powdery spots on leaves', 'Yellowing', 'Stunted growth'],
    causes: 'Various fungi species',
    severity: 'medium',
  },
  {
    id: 'downy_mildew',
    name: 'Downy Mildew',
    affectedCrops: ['maize', 'bajra', 'grapes', 'onion'],
    symptoms: ['Yellow patches on upper leaf', 'Gray-white fungal growth underneath', 'Leaf curling'],
    causes: 'Oomycete pathogens',
    severity: 'high',
  },
  {
    id: 'late_blight',
    name: 'Late Blight',
    affectedCrops: ['potato', 'tomato'],
    symptoms: ['Water-soaked spots on leaves', 'Brown-black lesions', 'White mold on undersides'],
    causes: 'Phytophthora infestans',
    severity: 'high',
  },
  {
    id: 'early_blight',
    name: 'Early Blight',
    affectedCrops: ['potato', 'tomato'],
    symptoms: ['Concentric rings on leaves', 'Target-like spots', 'Lower leaf yellowing'],
    causes: 'Alternaria solani fungus',
    severity: 'medium',
  },
  {
    id: 'wilt',
    name: 'Fusarium Wilt',
    affectedCrops: ['cotton', 'tomato', 'banana', 'pigeon_pea'],
    symptoms: ['Yellowing of leaves', 'Wilting despite moisture', 'Vascular browning'],
    causes: 'Fusarium oxysporum fungus',
    severity: 'high',
  },
  {
    id: 'anthracnose',
    name: 'Anthracnose',
    affectedCrops: ['mango', 'chilli', 'papaya', 'onion'],
    symptoms: ['Dark sunken lesions on fruits', 'Pink spore masses', 'Leaf spots'],
    causes: 'Colletotrichum species',
    severity: 'medium',
  },
  {
    id: 'root_rot',
    name: 'Root Rot',
    affectedCrops: ['soybean', 'chickpea', 'groundnut'],
    symptoms: ['Wilting', 'Yellowing', 'Brown rotting roots'],
    causes: 'Various soil-borne fungi',
    severity: 'high',
  },
  {
    id: 'leaf_spot',
    name: 'Leaf Spot',
    affectedCrops: ['groundnut', 'mustard', 'cotton'],
    symptoms: ['Circular brown spots', 'Yellow halos around spots', 'Premature defoliation'],
    causes: 'Cercospora and other fungi',
    severity: 'medium',
  },
  {
    id: 'bacterial_wilt',
    name: 'Bacterial Wilt',
    affectedCrops: ['tomato', 'brinjal', 'potato', 'ginger'],
    symptoms: ['Sudden wilting', 'Browning of vascular tissue', 'Bacterial ooze in water'],
    causes: 'Ralstonia solanacearum',
    severity: 'high',
  },
  {
    id: 'mosaic_virus',
    name: 'Mosaic Virus',
    affectedCrops: ['tobacco', 'tomato', 'capsicum', 'cucumber'],
    symptoms: ['Mottled light/dark green pattern', 'Leaf curling', 'Stunted growth'],
    causes: 'Various viruses (TMV, CMV)',
    severity: 'high',
  },
  {
    id: 'leaf_curl',
    name: 'Leaf Curl',
    affectedCrops: ['cotton', 'tomato', 'chilli', 'papaya'],
    symptoms: ['Upward or downward curling', 'Thickened veins', 'Stunted growth'],
    causes: 'Geminiviruses (whitefly transmitted)',
    severity: 'high',
  },
  {
    id: 'smut',
    name: 'Smut Disease',
    affectedCrops: ['maize', 'sugarcane', 'wheat'],
    symptoms: ['Black powdery masses', 'Galls on affected parts', 'Distorted growth'],
    causes: 'Ustilago species fungi',
    severity: 'medium',
  },
];

// NUTRIENTS

export interface Nutrient {
  id: string;
  name: string;
  symbol: string;
  type: 'macro' | 'secondary' | 'micro';
  deficiencySymptoms: string[];
  sources: string[];
}

export const NUTRIENTS: Nutrient[] = [
  // Macronutrients
  {
    id: 'nitrogen',
    name: 'Nitrogen',
    symbol: 'N',
    type: 'macro',
    deficiencySymptoms: ['Yellowing of older leaves', 'Stunted growth', 'Pale green color'],
    sources: ['Urea', 'Ammonium sulfate', 'DAP', 'Organic manure', 'Green manure'],
  },
  {
    id: 'phosphorus',
    name: 'Phosphorus',
    symbol: 'P',
    type: 'macro',
    deficiencySymptoms: ['Purple/reddish coloration', 'Delayed maturity', 'Poor root development'],
    sources: ['SSP', 'DAP', 'Rock phosphate', 'Bone meal'],
  },
  {
    id: 'potassium',
    name: 'Potassium',
    symbol: 'K',
    type: 'macro',
    deficiencySymptoms: ['Leaf edge browning', 'Weak stems', 'Poor fruit quality'],
    sources: ['MOP', 'SOP', 'Wood ash', 'Banana peels'],
  },
  
  // Secondary nutrients
  {
    id: 'calcium',
    name: 'Calcium',
    symbol: 'Ca',
    type: 'secondary',
    deficiencySymptoms: ['Blossom end rot', 'Distorted new leaves', 'Tip burn'],
    sources: ['Lime', 'Gypsum', 'Calcium nitrate', 'Eggshells'],
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    symbol: 'Mg',
    type: 'secondary',
    deficiencySymptoms: ['Interveinal chlorosis on older leaves', 'Leaf curling', 'Premature drop'],
    sources: ['Epsom salt', 'Dolomite lime', 'Magnesium sulfate'],
  },
  {
    id: 'sulfur',
    name: 'Sulfur',
    symbol: 'S',
    type: 'secondary',
    deficiencySymptoms: ['Uniform yellowing of young leaves', 'Stunted growth', 'Delayed maturity'],
    sources: ['Gypsum', 'Ammonium sulfate', 'Elemental sulfur'],
  },
  
  // Micronutrients
  {
    id: 'iron',
    name: 'Iron',
    symbol: 'Fe',
    type: 'micro',
    deficiencySymptoms: ['Interveinal chlorosis on young leaves', 'White or yellow new leaves'],
    sources: ['Ferrous sulfate', 'Iron chelates', 'Iron EDTA'],
  },
  {
    id: 'zinc',
    name: 'Zinc',
    symbol: 'Zn',
    type: 'micro',
    deficiencySymptoms: ['Stunted growth', 'Small leaves', 'White bands on leaves', 'Delayed maturity'],
    sources: ['Zinc sulfate', 'Zinc oxide', 'Zinc chelates'],
  },
  {
    id: 'manganese',
    name: 'Manganese',
    symbol: 'Mn',
    type: 'micro',
    deficiencySymptoms: ['Interveinal chlorosis', 'Gray speck in oats', 'Marsh spot in peas'],
    sources: ['Manganese sulfate', 'Manganese chelates'],
  },
  {
    id: 'copper',
    name: 'Copper',
    symbol: 'Cu',
    type: 'micro',
    deficiencySymptoms: ['Wilting of leaf tips', 'Light green/yellow color', 'Stunted growth'],
    sources: ['Copper sulfate', 'Copper chelates', 'Copper oxide'],
  },
  {
    id: 'boron',
    name: 'Boron',
    symbol: 'B',
    type: 'micro',
    deficiencySymptoms: ['Hollow stem', 'Cracked fruits', 'Poor fruit set', 'Brown heart'],
    sources: ['Borax', 'Boric acid', 'Solubor'],
  },
  {
    id: 'molybdenum',
    name: 'Molybdenum',
    symbol: 'Mo',
    type: 'micro',
    deficiencySymptoms: ['Whiptail in cauliflower', 'Marginal scorch', 'Cupped leaves'],
    sources: ['Sodium molybdate', 'Ammonium molybdate'],
  },
];

/**
 * Get nutrients by type
 */
export function getNutrientsByType(type: Nutrient['type']): Nutrient[] {
  return NUTRIENTS.filter((nutrient) => nutrient.type === type);
}

// HELPER FUNCTIONS

/**
 * Find crop by ID
 */
export function findCropById(id: string): CropInfo | undefined {
  return INDIAN_CROPS.find((crop) => crop.id === id);
}

/**
 * Find disease by ID
 */
export function findDiseaseById(id: string): Disease | undefined {
  return COMMON_DISEASES.find((disease) => disease.id === id);
}

/**
 * Find nutrient by ID or symbol
 */
export function findNutrient(idOrSymbol: string): Nutrient | undefined {
  return NUTRIENTS.find(
    (n) => n.id === idOrSymbol.toLowerCase() || n.symbol === idOrSymbol.toUpperCase()
  );
}

/**
 * Get diseases affecting a crop
 */
export function getDiseasesForCrop(cropId: string): Disease[] {
  return COMMON_DISEASES.filter((disease) => disease.affectedCrops.includes(cropId));
}

/**
 * Search crops by name
 */
export function searchCrops(query: string): CropInfo[] {
  const lowerQuery = query.toLowerCase();
  return INDIAN_CROPS.filter(
    (crop) =>
      crop.name.toLowerCase().includes(lowerQuery) ||
      crop.nameHi?.includes(query) ||
      crop.id.includes(lowerQuery)
  );
}

// ============================================
// GROWTH STAGES
// ============================================

export interface GrowthStage {
  id: string;
  name: string;
  nameHi: string;
  description: string;
}

export const GROWTH_STAGES: GrowthStage[] = [
  {
    id: 'seedling',
    name: 'Seedling',
    nameHi: 'अंकुर',
    description: 'Initial stage after germination with first leaves emerging',
  },
  {
    id: 'vegetative',
    name: 'Vegetative',
    nameHi: 'वानस्पतिक',
    description: 'Rapid growth stage with leaf and stem development',
  },
  {
    id: 'flowering',
    name: 'Flowering',
    nameHi: 'फूल आना',
    description: 'Reproductive stage when flowers develop',
  },
  {
    id: 'fruiting',
    name: 'Fruiting / Maturity',
    nameHi: 'फलन / परिपक्वता',
    description: 'Final stage with fruit development and crop maturity',
  },
];

export type GrowthStageId = 'seedling' | 'vegetative' | 'flowering' | 'fruiting';

// ============================================
// AFFECTED PLANT PARTS
// ============================================

export interface AffectedPlantPart {
  id: string;
  name: string;
  nameHi: string;
  description: string;
}

export const AFFECTED_PLANT_PARTS: AffectedPlantPart[] = [
  {
    id: 'leaf',
    name: 'Leaf',
    nameHi: 'पत्ती',
    description: 'Leaves showing symptoms like spots, yellowing, or wilting',
  },
  {
    id: 'stem',
    name: 'Stem',
    nameHi: 'तना',
    description: 'Stem showing symptoms like lesions, rotting, or discoloration',
  },
  {
    id: 'fruit',
    name: 'Fruit',
    nameHi: 'फल',
    description: 'Fruits showing symptoms like spots, rot, or deformation',
  },
  {
    id: 'whole_plant',
    name: 'Whole Plant',
    nameHi: 'पूरा पौधा',
    description: 'Overall plant showing symptoms affecting multiple parts',
  },
];

export type AffectedPlantPartId = 'leaf' | 'stem' | 'fruit' | 'whole_plant';

// ============================================
// SOIL TYPES
// ============================================

export interface SoilType {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  suitableCrops: string[];
}

export const SOIL_TYPES: SoilType[] = [
  {
    id: 'black',
    name: 'Black Soil',
    nameHi: 'काली मिट्टी',
    description: 'Rich in calcium, potassium, magnesium. Retains moisture well.',
    suitableCrops: ['cotton', 'sugarcane', 'wheat', 'jowar', 'linseed'],
  },
  {
    id: 'red',
    name: 'Red Soil',
    nameHi: 'लाल मिट्टी',
    description: 'Rich in iron, porous and friable. Low in nitrogen and phosphorus.',
    suitableCrops: ['groundnut', 'millets', 'pulses', 'tobacco', 'potato'],
  },
  {
    id: 'sandy',
    name: 'Sandy Soil',
    nameHi: 'रेतीली मिट्टी',
    description: 'Well-drained, low water retention. Good for root vegetables.',
    suitableCrops: ['carrot', 'radish', 'groundnut', 'watermelon', 'bajra'],
  },
  {
    id: 'loamy',
    name: 'Loamy Soil',
    nameHi: 'दोमट मिट्टी',
    description: 'Best for agriculture. Good drainage and moisture retention.',
    suitableCrops: ['wheat', 'rice', 'vegetables', 'sugarcane', 'cotton'],
  },
  {
    id: 'alluvial',
    name: 'Alluvial Soil',
    nameHi: 'जलोढ़ मिट्टी',
    description: 'Most fertile soil, deposited by rivers. Rich in potash and lime.',
    suitableCrops: ['rice', 'wheat', 'sugarcane', 'maize', 'pulses'],
  },
];

export type SoilTypeId = 'black' | 'red' | 'sandy' | 'loamy' | 'alluvial';

// ============================================
// SEASONS
// ============================================

export interface Season {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  months: string;
  typicalCrops: string[];
}

export const SEASONS: Season[] = [
  {
    id: 'kharif',
    name: 'Kharif',
    nameHi: 'खरीफ',
    description: 'Monsoon cropping season, sown with onset of monsoon rains',
    months: 'June - October',
    typicalCrops: ['rice', 'maize', 'cotton', 'groundnut', 'soybean', 'bajra'],
  },
  {
    id: 'rabi',
    name: 'Rabi',
    nameHi: 'रबी',
    description: 'Winter cropping season, grown in cool and dry weather',
    months: 'October - March',
    typicalCrops: ['wheat', 'chickpea', 'mustard', 'barley', 'peas', 'lentil'],
  },
  {
    id: 'zaid',
    name: 'Zaid',
    nameHi: 'जायद',
    description: 'Summer cropping season, short duration crops between Rabi and Kharif',
    months: 'March - June',
    typicalCrops: ['watermelon', 'muskmelon', 'cucumber', 'vegetables', 'moong'],
  },
];

export type SeasonId = 'kharif' | 'rabi' | 'zaid';

// ============================================
// IRRIGATION AVAILABILITY
// ============================================

export interface IrrigationAvailability {
  id: string;
  name: string;
  nameHi: string;
  description: string;
}

export const IRRIGATION_AVAILABILITY: IrrigationAvailability[] = [
  {
    id: 'assured',
    name: 'Assured',
    nameHi: 'निश्चित',
    description: 'Reliable water source available year-round (canal, tubewell, etc.)',
  },
  {
    id: 'partial',
    name: 'Partial',
    nameHi: 'आंशिक',
    description: 'Water available for some critical growth stages only',
  },
  {
    id: 'rainfed',
    name: 'Rainfed',
    nameHi: 'वर्षा आधारित',
    description: 'Depends entirely on rainfall, no irrigation facility',
  },
];

export type IrrigationAvailabilityId = 'assured' | 'partial' | 'rainfed';

// ============================================
// IRRIGATION METHODS
// ============================================

export interface IrrigationMethod {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  waterEfficiency: string;
}

export const IRRIGATION_METHODS: IrrigationMethod[] = [
  {
    id: 'drip',
    name: 'Drip Irrigation',
    nameHi: 'ड्रिप सिंचाई',
    description: 'Water delivered directly to plant roots through tubes',
    waterEfficiency: '90-95%',
  },
  {
    id: 'flood',
    name: 'Flood Irrigation',
    nameHi: 'बाढ़ सिंचाई',
    description: 'Traditional method where water flows over the entire field',
    waterEfficiency: '40-50%',
  },
  {
    id: 'sprinkler',
    name: 'Sprinkler Irrigation',
    nameHi: 'फव्वारा सिंचाई',
    description: 'Water sprayed over crops like artificial rainfall',
    waterEfficiency: '70-80%',
  },
];

export type IrrigationMethodId = 'drip' | 'flood' | 'sprinkler';

// ============================================
// MONTHS (English and Hindi)
// ============================================

export interface Month {
  id: number;
  name: string;
  nameHi: string;
  shortName: string;
}

export const MONTHS: Month[] = [
  { id: 1, name: 'January', nameHi: 'जनवरी', shortName: 'Jan' },
  { id: 2, name: 'February', nameHi: 'फ़रवरी', shortName: 'Feb' },
  { id: 3, name: 'March', nameHi: 'मार्च', shortName: 'Mar' },
  { id: 4, name: 'April', nameHi: 'अप्रैल', shortName: 'Apr' },
  { id: 5, name: 'May', nameHi: 'मई', shortName: 'May' },
  { id: 6, name: 'June', nameHi: 'जून', shortName: 'Jun' },
  { id: 7, name: 'July', nameHi: 'जुलाई', shortName: 'Jul' },
  { id: 8, name: 'August', nameHi: 'अगस्त', shortName: 'Aug' },
  { id: 9, name: 'September', nameHi: 'सितंबर', shortName: 'Sep' },
  { id: 10, name: 'October', nameHi: 'अक्टूबर', shortName: 'Oct' },
  { id: 11, name: 'November', nameHi: 'नवंबर', shortName: 'Nov' },
  { id: 12, name: 'December', nameHi: 'दिसंबर', shortName: 'Dec' },
];

// ============================================
// LAND UNITS
// ============================================

export interface LandUnit {
  id: string;
  name: string;
  nameHi: string;
  conversionToHectares: number;
}

export const LAND_UNITS: LandUnit[] = [
  { id: 'acres', name: 'Acres', nameHi: 'एकड़', conversionToHectares: 0.4047 },
  { id: 'hectares', name: 'Hectares', nameHi: 'हेक्टेयर', conversionToHectares: 1 },
];

export type LandUnitId = 'acres' | 'hectares';

// ============================================
// HELPER FUNCTIONS FOR NEW CONSTANTS
// ============================================

/**
 * Get growth stage by ID
 */
export function getGrowthStageById(id: GrowthStageId): GrowthStage | undefined {
  return GROWTH_STAGES.find(stage => stage.id === id);
}

/**
 * Get affected plant part by ID
 */
export function getAffectedPlantPartById(id: AffectedPlantPartId): AffectedPlantPart | undefined {
  return AFFECTED_PLANT_PARTS.find(part => part.id === id);
}

/**
 * Get soil type by ID
 */
export function getSoilTypeById(id: SoilTypeId): SoilType | undefined {
  return SOIL_TYPES.find(soil => soil.id === id);
}

/**
 * Get season by ID
 */
export function getSeasonById(id: SeasonId): Season | undefined {
  return SEASONS.find(season => season.id === id);
}

/**
 * Get irrigation availability by ID
 */
export function getIrrigationAvailabilityById(id: IrrigationAvailabilityId): IrrigationAvailability | undefined {
  return IRRIGATION_AVAILABILITY.find(item => item.id === id);
}

/**
 * Get irrigation method by ID
 */
export function getIrrigationMethodById(id: IrrigationMethodId): IrrigationMethod | undefined {
  return IRRIGATION_METHODS.find(method => method.id === id);
}

/**
 * Get month by ID
 */
export function getMonthById(id: number): Month | undefined {
  return MONTHS.find(month => month.id === id);
}

// ============================================
// DROPDOWN OPTIONS FORMATTERS
// ============================================

/**
 * Get growth stages as dropdown options
 */
export function getGrowthStageDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return GROWTH_STAGES.map(stage => ({
    label: stage.name,
    value: stage.id,
    description: stage.description,
  }));
}

/**
 * Get affected plant parts as dropdown options
 */
export function getAffectedPlantPartDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return AFFECTED_PLANT_PARTS.map(part => ({
    label: part.name,
    value: part.id,
    description: part.description,
  }));
}

/**
 * Get soil types as dropdown options
 */
export function getSoilTypeDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return SOIL_TYPES.map(soil => ({
    label: soil.name,
    value: soil.id,
    description: soil.description,
  }));
}

/**
 * Get seasons as dropdown options
 */
export function getSeasonDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return SEASONS.map(season => ({
    label: `${season.name} (${season.months})`,
    value: season.id,
    description: season.description,
  }));
}

/**
 * Get irrigation availability as dropdown options
 */
export function getIrrigationAvailabilityDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return IRRIGATION_AVAILABILITY.map(item => ({
    label: item.name,
    value: item.id,
    description: item.description,
  }));
}

/**
 * Get irrigation methods as dropdown options
 */
export function getIrrigationMethodDropdownOptions(): Array<{ label: string; value: string; description: string }> {
  return IRRIGATION_METHODS.map(method => ({
    label: method.name,
    value: method.id,
    description: `${method.description} (Efficiency: ${method.waterEfficiency})`,
  }));
}

/**
 * Get months as dropdown options
 */
export function getMonthDropdownOptions(): Array<{ label: string; value: string }> {
  return MONTHS.map(month => ({
    label: `${month.name} (${month.nameHi})`,
    value: month.id.toString(),
  }));
}

/**
 * Get land units as dropdown options
 */
export function getLandUnitDropdownOptions(): Array<{ label: string; value: string }> {
  return LAND_UNITS.map(unit => ({
    label: `${unit.name} (${unit.nameHi})`,
    value: unit.id,
  }));
}
