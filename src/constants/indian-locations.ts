/**
 * Indian Locations Constants
 * 
 * Contains all 28 Indian states and 8 union territories with their codes,
 * along with major districts for each state/UT.
 */

// ============================================
// Types
// ============================================

export interface IndianState {
  code: string;
  name: string;
  type: 'state' | 'union_territory';
}

// ============================================
// Indian States and Union Territories
// ============================================

export const INDIAN_STATES: IndianState[] = [
  // States (28)
  { code: 'AP', name: 'Andhra Pradesh', type: 'state' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'state' },
  { code: 'AS', name: 'Assam', type: 'state' },
  { code: 'BR', name: 'Bihar', type: 'state' },
  { code: 'CG', name: 'Chhattisgarh', type: 'state' },
  { code: 'GA', name: 'Goa', type: 'state' },
  { code: 'GJ', name: 'Gujarat', type: 'state' },
  { code: 'HR', name: 'Haryana', type: 'state' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'state' },
  { code: 'JH', name: 'Jharkhand', type: 'state' },
  { code: 'KA', name: 'Karnataka', type: 'state' },
  { code: 'KL', name: 'Kerala', type: 'state' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'state' },
  { code: 'MH', name: 'Maharashtra', type: 'state' },
  { code: 'MN', name: 'Manipur', type: 'state' },
  { code: 'ML', name: 'Meghalaya', type: 'state' },
  { code: 'MZ', name: 'Mizoram', type: 'state' },
  { code: 'NL', name: 'Nagaland', type: 'state' },
  { code: 'OD', name: 'Odisha', type: 'state' },
  { code: 'PB', name: 'Punjab', type: 'state' },
  { code: 'RJ', name: 'Rajasthan', type: 'state' },
  { code: 'SK', name: 'Sikkim', type: 'state' },
  { code: 'TN', name: 'Tamil Nadu', type: 'state' },
  { code: 'TS', name: 'Telangana', type: 'state' },
  { code: 'TR', name: 'Tripura', type: 'state' },
  { code: 'UK', name: 'Uttarakhand', type: 'state' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'state' },
  { code: 'WB', name: 'West Bengal', type: 'state' },
  
  // Union Territories (8)
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'union_territory' },
  { code: 'CH', name: 'Chandigarh', type: 'union_territory' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'union_territory' },
  { code: 'DL', name: 'Delhi', type: 'union_territory' },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'union_territory' },
  { code: 'LA', name: 'Ladakh', type: 'union_territory' },
  { code: 'LD', name: 'Lakshadweep', type: 'union_territory' },
  { code: 'PY', name: 'Puducherry', type: 'union_territory' },
];

// ============================================
// State Districts Mapping
// ============================================

export const STATE_DISTRICTS: Record<string, string[]> = {
  // Andhra Pradesh
  AP: [
    'Anantapur',
    'Chittoor',
    'East Godavari',
    'Guntur',
    'Krishna',
    'Kurnool',
    'Nellore',
    'Prakasam',
    'Srikakulam',
    'Visakhapatnam',
    'Vizianagaram',
    'West Godavari',
    'YSR Kadapa',
    'Annamayya',
    'Bapatla',
  ],

  // Arunachal Pradesh
  AR: [
    'Anjaw',
    'Changlang',
    'Dibang Valley',
    'East Kameng',
    'East Siang',
    'Itanagar Capital Complex',
    'Kamle',
    'Kra Daadi',
    'Kurung Kumey',
    'Lohit',
    'Longding',
    'Lower Dibang Valley',
    'Lower Siang',
    'Lower Subansiri',
    'Namsai',
  ],

  // Assam
  AS: [
    'Baksa',
    'Barpeta',
    'Biswanath',
    'Bongaigaon',
    'Cachar',
    'Darrang',
    'Dhemaji',
    'Dhubri',
    'Dibrugarh',
    'Goalpara',
    'Golaghat',
    'Jorhat',
    'Kamrup',
    'Kamrup Metropolitan',
    'Nagaon',
  ],

  // Bihar
  BR: [
    'Araria',
    'Arwal',
    'Aurangabad',
    'Banka',
    'Begusarai',
    'Bhagalpur',
    'Bhojpur',
    'Buxar',
    'Darbhanga',
    'Gaya',
    'Gopalganj',
    'Jamui',
    'Muzaffarpur',
    'Nalanda',
    'Patna',
  ],

  // Chhattisgarh
  CG: [
    'Balod',
    'Baloda Bazar',
    'Balrampur',
    'Bastar',
    'Bemetara',
    'Bijapur',
    'Bilaspur',
    'Dantewada',
    'Dhamtari',
    'Durg',
    'Gariaband',
    'Janjgir-Champa',
    'Kanker',
    'Korba',
    'Raipur',
  ],

  // Goa
  GA: [
    'North Goa',
    'South Goa',
  ],

  // Gujarat
  GJ: [
    'Ahmedabad',
    'Amreli',
    'Anand',
    'Aravalli',
    'Banaskantha',
    'Bharuch',
    'Bhavnagar',
    'Botad',
    'Dahod',
    'Dang',
    'Gandhinagar',
    'Jamnagar',
    'Junagadh',
    'Kutch',
    'Mehsana',
    'Morbi',
    'Narmada',
    'Navsari',
    'Panchmahal',
    'Patan',
    'Porbandar',
    'Rajkot',
    'Sabarkantha',
    'Surat',
    'Vadodara',
  ],

  // Haryana
  HR: [
    'Ambala',
    'Bhiwani',
    'Faridabad',
    'Fatehabad',
    'Gurugram',
    'Hisar',
    'Jhajjar',
    'Jind',
    'Kaithal',
    'Karnal',
    'Kurukshetra',
    'Panipat',
    'Rewari',
    'Rohtak',
    'Sonipat',
  ],

  // Himachal Pradesh
  HP: [
    'Bilaspur',
    'Chamba',
    'Hamirpur',
    'Kangra',
    'Kinnaur',
    'Kullu',
    'Lahaul and Spiti',
    'Mandi',
    'Shimla',
    'Sirmaur',
    'Solan',
    'Una',
  ],

  // Jharkhand
  JH: [
    'Bokaro',
    'Chatra',
    'Deoghar',
    'Dhanbad',
    'Dumka',
    'East Singhbhum',
    'Garhwa',
    'Giridih',
    'Godda',
    'Gumla',
    'Hazaribagh',
    'Jamtara',
    'Khunti',
    'Koderma',
    'Ranchi',
  ],

  // Karnataka
  KA: [
    'Bagalkot',
    'Bangalore Rural',
    'Bangalore Urban',
    'Belgaum',
    'Bellary',
    'Bidar',
    'Chamarajanagar',
    'Chikkaballapur',
    'Chikkamagaluru',
    'Chitradurga',
    'Dakshina Kannada',
    'Davanagere',
    'Dharwad',
    'Gadag',
    'Hassan',
    'Haveri',
    'Kalaburagi',
    'Kodagu',
    'Kolar',
    'Koppal',
    'Mandya',
    'Mysore',
    'Raichur',
    'Ramanagara',
    'Shimoga',
    'Tumkur',
    'Udupi',
    'Uttara Kannada',
    'Vijayapura',
    'Yadgir',
  ],

  // Kerala
  KL: [
    'Alappuzha',
    'Ernakulam',
    'Idukki',
    'Kannur',
    'Kasaragod',
    'Kollam',
    'Kottayam',
    'Kozhikode',
    'Malappuram',
    'Palakkad',
    'Pathanamthitta',
    'Thiruvananthapuram',
    'Thrissur',
    'Wayanad',
  ],

  // Madhya Pradesh
  MP: [
    'Agar Malwa',
    'Alirajpur',
    'Anuppur',
    'Ashoknagar',
    'Balaghat',
    'Barwani',
    'Betul',
    'Bhind',
    'Bhopal',
    'Burhanpur',
    'Chhindwara',
    'Dewas',
    'Gwalior',
    'Indore',
    'Jabalpur',
  ],

  // Maharashtra
  MH: [
    'Ahmednagar',
    'Akola',
    'Amravati',
    'Aurangabad',
    'Beed',
    'Bhandara',
    'Buldhana',
    'Chandrapur',
    'Dhule',
    'Gadchiroli',
    'Gondia',
    'Hingoli',
    'Jalgaon',
    'Jalna',
    'Kolhapur',
    'Latur',
    'Mumbai City',
    'Mumbai Suburban',
    'Nagpur',
    'Nanded',
    'Nashik',
    'Osmanabad',
    'Palghar',
    'Parbhani',
    'Pune',
    'Raigad',
    'Ratnagiri',
    'Sangli',
    'Satara',
    'Sindhudurg',
    'Solapur',
    'Thane',
    'Wardha',
    'Washim',
    'Yavatmal',
  ],

  // Manipur
  MN: [
    'Bishnupur',
    'Chandel',
    'Churachandpur',
    'Imphal East',
    'Imphal West',
    'Jiribam',
    'Kakching',
    'Kamjong',
    'Kangpokpi',
    'Noney',
    'Pherzawl',
    'Senapati',
    'Tamenglong',
    'Tengnoupal',
    'Thoubal',
    'Ukhrul',
  ],

  // Meghalaya
  ML: [
    'East Garo Hills',
    'East Jaintia Hills',
    'East Khasi Hills',
    'North Garo Hills',
    'Ri Bhoi',
    'South Garo Hills',
    'South West Garo Hills',
    'South West Khasi Hills',
    'West Garo Hills',
    'West Jaintia Hills',
    'West Khasi Hills',
  ],

  // Mizoram
  MZ: [
    'Aizawl',
    'Champhai',
    'Hnahthial',
    'Khawzawl',
    'Kolasib',
    'Lawngtlai',
    'Lunglei',
    'Mamit',
    'Saiha',
    'Saitual',
    'Serchhip',
  ],

  // Nagaland
  NL: [
    'Chumoukedima',
    'Dimapur',
    'Kiphire',
    'Kohima',
    'Longleng',
    'Mokokchung',
    'Mon',
    'Noklak',
    'Peren',
    'Phek',
    'Tuensang',
    'Wokha',
    'Zunheboto',
  ],

  // Odisha
  OD: [
    'Angul',
    'Balangir',
    'Balasore',
    'Bargarh',
    'Bhadrak',
    'Boudh',
    'Cuttack',
    'Deogarh',
    'Dhenkanal',
    'Gajapati',
    'Ganjam',
    'Jagatsinghpur',
    'Jajpur',
    'Jharsuguda',
    'Kalahandi',
    'Kandhamal',
    'Kendrapara',
    'Kendujhar',
    'Khordha',
    'Koraput',
    'Malkangiri',
    'Mayurbhanj',
    'Nabarangpur',
    'Nayagarh',
    'Nuapada',
    'Puri',
    'Rayagada',
    'Sambalpur',
    'Subarnapur',
    'Sundargarh',
  ],

  // Punjab
  PB: [
    'Amritsar',
    'Barnala',
    'Bathinda',
    'Faridkot',
    'Fatehgarh Sahib',
    'Fazilka',
    'Ferozepur',
    'Gurdaspur',
    'Hoshiarpur',
    'Jalandhar',
    'Kapurthala',
    'Ludhiana',
    'Mansa',
    'Moga',
    'Mohali',
    'Muktsar',
    'Pathankot',
    'Patiala',
    'Rupnagar',
    'Sangrur',
    'Shahid Bhagat Singh Nagar',
    'Tarn Taran',
  ],

  // Rajasthan
  RJ: [
    'Ajmer',
    'Alwar',
    'Banswara',
    'Baran',
    'Barmer',
    'Bharatpur',
    'Bhilwara',
    'Bikaner',
    'Bundi',
    'Chittorgarh',
    'Churu',
    'Dausa',
    'Dholpur',
    'Dungarpur',
    'Hanumangarh',
    'Jaipur',
    'Jaisalmer',
    'Jalore',
    'Jhalawar',
    'Jhunjhunu',
    'Jodhpur',
    'Karauli',
    'Kota',
    'Nagaur',
    'Pali',
    'Pratapgarh',
    'Rajsamand',
    'Sawai Madhopur',
    'Sikar',
    'Sirohi',
    'Sri Ganganagar',
    'Tonk',
    'Udaipur',
  ],

  // Sikkim
  SK: [
    'East Sikkim',
    'North Sikkim',
    'South Sikkim',
    'West Sikkim',
    'Pakyong',
    'Soreng',
  ],

  // Tamil Nadu
  TN: [
    'Ariyalur',
    'Chengalpattu',
    'Chennai',
    'Coimbatore',
    'Cuddalore',
    'Dharmapuri',
    'Dindigul',
    'Erode',
    'Kallakurichi',
    'Kanchipuram',
    'Kanyakumari',
    'Karur',
    'Krishnagiri',
    'Madurai',
    'Mayiladuthurai',
    'Nagapattinam',
    'Namakkal',
    'Nilgiris',
    'Perambalur',
    'Pudukkottai',
    'Ramanathapuram',
    'Ranipet',
    'Salem',
    'Sivaganga',
    'Tenkasi',
    'Thanjavur',
    'Theni',
    'Thoothukudi',
    'Tiruchirappalli',
    'Tirunelveli',
    'Tirupathur',
    'Tiruppur',
    'Tiruvallur',
    'Tiruvannamalai',
    'Tiruvarur',
    'Vellore',
    'Viluppuram',
    'Virudhunagar',
  ],

  // Telangana
  TS: [
    'Adilabad',
    'Bhadradri Kothagudem',
    'Hyderabad',
    'Jagtial',
    'Jangaon',
    'Jayashankar Bhupalpally',
    'Jogulamba Gadwal',
    'Kamareddy',
    'Karimnagar',
    'Khammam',
    'Kumuram Bheem Asifabad',
    'Mahabubabad',
    'Mahbubnagar',
    'Mancherial',
    'Medak',
    'Medchal-Malkajgiri',
    'Mulugu',
    'Nagarkurnool',
    'Nalgonda',
    'Narayanpet',
    'Nirmal',
    'Nizamabad',
    'Peddapalli',
    'Rajanna Sircilla',
    'Rangareddy',
    'Sangareddy',
    'Siddipet',
    'Suryapet',
    'Vikarabad',
    'Wanaparthy',
    'Warangal Rural',
    'Warangal Urban',
    'Yadadri Bhuvanagiri',
  ],

  // Tripura
  TR: [
    'Dhalai',
    'Gomati',
    'Khowai',
    'North Tripura',
    'Sepahijala',
    'South Tripura',
    'Unakoti',
    'West Tripura',
  ],

  // Uttarakhand
  UK: [
    'Almora',
    'Bageshwar',
    'Chamoli',
    'Champawat',
    'Dehradun',
    'Haridwar',
    'Nainital',
    'Pauri Garhwal',
    'Pithoragarh',
    'Rudraprayag',
    'Tehri Garhwal',
    'Udham Singh Nagar',
    'Uttarkashi',
  ],

  // Uttar Pradesh
  UP: [
    'Agra',
    'Aligarh',
    'Allahabad',
    'Ambedkar Nagar',
    'Amethi',
    'Amroha',
    'Auraiya',
    'Azamgarh',
    'Baghpat',
    'Bahraich',
    'Ballia',
    'Balrampur',
    'Banda',
    'Barabanki',
    'Bareilly',
    'Basti',
    'Bhadohi',
    'Bijnor',
    'Budaun',
    'Bulandshahr',
    'Chandauli',
    'Chitrakoot',
    'Deoria',
    'Etah',
    'Etawah',
    'Faizabad',
    'Farrukhabad',
    'Fatehpur',
    'Firozabad',
    'Gautam Buddha Nagar',
    'Ghaziabad',
    'Ghazipur',
    'Gonda',
    'Gorakhpur',
    'Hamirpur',
    'Hapur',
    'Hardoi',
    'Hathras',
    'Jalaun',
    'Jaunpur',
    'Jhansi',
    'Kannauj',
    'Kanpur Dehat',
    'Kanpur Nagar',
    'Kasganj',
    'Kaushambi',
    'Kushinagar',
    'Lakhimpur Kheri',
    'Lalitpur',
    'Lucknow',
    'Maharajganj',
    'Mahoba',
    'Mainpuri',
    'Mathura',
    'Mau',
    'Meerut',
    'Mirzapur',
    'Moradabad',
    'Muzaffarnagar',
    'Pilibhit',
    'Pratapgarh',
    'Rae Bareli',
    'Rampur',
    'Saharanpur',
    'Sambhal',
    'Sant Kabir Nagar',
    'Shahjahanpur',
    'Shamli',
    'Shravasti',
    'Siddharthnagar',
    'Sitapur',
    'Sonbhadra',
    'Sultanpur',
    'Unnao',
    'Varanasi',
  ],

  // West Bengal
  WB: [
    'Alipurduar',
    'Bankura',
    'Birbhum',
    'Cooch Behar',
    'Dakshin Dinajpur',
    'Darjeeling',
    'Hooghly',
    'Howrah',
    'Jalpaiguri',
    'Jhargram',
    'Kalimpong',
    'Kolkata',
    'Malda',
    'Murshidabad',
    'Nadia',
    'North 24 Parganas',
    'Paschim Bardhaman',
    'Paschim Medinipur',
    'Purba Bardhaman',
    'Purba Medinipur',
    'Purulia',
    'South 24 Parganas',
    'Uttar Dinajpur',
  ],

  // Union Territories
  
  // Andaman and Nicobar Islands
  AN: [
    'Nicobar',
    'North and Middle Andaman',
    'South Andaman',
  ],

  // Chandigarh
  CH: [
    'Chandigarh',
  ],

  // Dadra and Nagar Haveli and Daman and Diu
  DN: [
    'Dadra and Nagar Haveli',
    'Daman',
    'Diu',
  ],

  // Delhi
  DL: [
    'Central Delhi',
    'East Delhi',
    'New Delhi',
    'North Delhi',
    'North East Delhi',
    'North West Delhi',
    'Shahdara',
    'South Delhi',
    'South East Delhi',
    'South West Delhi',
    'West Delhi',
  ],

  // Jammu and Kashmir
  JK: [
    'Anantnag',
    'Bandipora',
    'Baramulla',
    'Budgam',
    'Doda',
    'Ganderbal',
    'Jammu',
    'Kathua',
    'Kishtwar',
    'Kulgam',
    'Kupwara',
    'Poonch',
    'Pulwama',
    'Rajouri',
    'Ramban',
    'Reasi',
    'Samba',
    'Shopian',
    'Srinagar',
    'Udhampur',
  ],

  // Ladakh
  LA: [
    'Kargil',
    'Leh',
  ],

  // Lakshadweep
  LD: [
    'Lakshadweep',
  ],

  // Puducherry
  PY: [
    'Karaikal',
    'Mahe',
    'Puducherry',
    'Yanam',
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get state by code
 */
export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find(state => state.code === code);
}

/**
 * Get state by name
 */
export function getStateByName(name: string): IndianState | undefined {
  return INDIAN_STATES.find(
    state => state.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get districts for a state
 */
export function getDistrictsForState(stateCode: string): string[] {
  return STATE_DISTRICTS[stateCode] || [];
}

/**
 * Get all states (excluding union territories)
 */
export function getStatesOnly(): IndianState[] {
  return INDIAN_STATES.filter(state => state.type === 'state');
}

/**
 * Get all union territories
 */
export function getUnionTerritoriesOnly(): IndianState[] {
  return INDIAN_STATES.filter(state => state.type === 'union_territory');
}

/**
 * Search states by name (partial match)
 */
export function searchStates(query: string): IndianState[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return INDIAN_STATES;
  
  return INDIAN_STATES.filter(
    state => state.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search districts within a state (partial match)
 */
export function searchDistricts(stateCode: string, query: string): string[] {
  const districts = STATE_DISTRICTS[stateCode] || [];
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) return districts;
  
  return districts.filter(
    district => district.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Validate if a district belongs to a state
 */
export function isValidDistrictForState(
  stateCode: string,
  district: string
): boolean {
  const districts = STATE_DISTRICTS[stateCode] || [];
  return districts.some(
    d => d.toLowerCase() === district.toLowerCase()
  );
}

// ============================================
// Dropdown Option Formatters
// ============================================

/**
 * Get states as dropdown options
 */
export function getStateDropdownOptions(): Array<{ label: string; value: string }> {
  return INDIAN_STATES.map(state => ({
    label: state.name,
    value: state.code,
  }));
}

/**
 * Get districts as dropdown options for a state
 */
export function getDistrictDropdownOptions(
  stateCode: string
): Array<{ label: string; value: string }> {
  const districts = STATE_DISTRICTS[stateCode] || [];
  return districts.map(district => ({
    label: district,
    value: district,
  }));
}
