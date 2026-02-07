'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  IconMapPin, 
  IconCurrentLocation, 
  IconLoader2,
  IconAlertCircle 
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// TYPES

export interface LocationValue {
  state: string;
  district: string;
}

export interface LocationSelectorProps {
  /** Current selected value */
  value?: LocationValue;
  /** Callback when value changes */
  onChange: (value: LocationValue) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether to show the "Use current location" button */
  showGPSButton?: boolean;
}

// INDIAN STATES AND DISTRICTS DATA

interface StateData {
  name: string;
  districts: string[];
}

const INDIAN_STATES: StateData[] = [
  {
    name: 'Andhra Pradesh',
    districts: ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Kadapa', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari'],
  },
  {
    name: 'Assam',
    districts: ['Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Jorhat', 'Kamrup', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia'],
  },
  {
    name: 'Bihar',
    districts: ['Araria', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Katihar', 'Khagaria', 'Kishanganj', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
  },
  {
    name: 'Chhattisgarh',
    districts: ['Bastar', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Janjgir-Champa', 'Jashpur', 'Kanker', 'Kawardha', 'Korba', 'Koriya', 'Mahasamund', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Surguja'],
  },
  {
    name: 'Gujarat',
    districts: ['Ahmedabad', 'Amreli', 'Anand', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Dahod', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mehsana', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Vadodara', 'Valsad'],
  },
  {
    name: 'Haryana',
    districts: ['Ambala', 'Bhiwani', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Mewat', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
  },
  {
    name: 'Himachal Pradesh',
    districts: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
  },
  {
    name: 'Jharkhand',
    districts: ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
  },
  {
    name: 'Karnataka',
    districts: ['Bagalkot', 'Bangalore Rural', 'Bangalore Urban', 'Belgaum', 'Bellary', 'Bidar', 'Bijapur', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Gulbarga', 'Hassan', 'Haveri', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysore', 'Raichur', 'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Uttara Kannada', 'Yadgir'],
  },
  {
    name: 'Kerala',
    districts: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
  },
  {
    name: 'Madhya Pradesh',
    districts: ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
  },
  {
    name: 'Maharashtra',
    districts: ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  },
  {
    name: 'Odisha',
    districts: ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
  },
  {
    name: 'Punjab',
    districts: ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'],
  },
  {
    name: 'Rajasthan',
    districts: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Ganganagar', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
  },
  {
    name: 'Tamil Nadu',
    districts: ['Ariyalur', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Salem', 'Sivaganga', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
  },
  {
    name: 'Telangana',
    districts: ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal', 'Nagarkurnool', 'Nalgonda', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
  },
  {
    name: 'Uttar Pradesh',
    districts: ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
  },
  {
    name: 'Uttarakhand',
    districts: ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  },
  {
    name: 'West Bengal',
    districts: ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
  },
];

// STATE NAMES MAP FOR QUICK ACCESS
const STATE_NAMES = INDIAN_STATES.map((s) => s.name);

/**
 * LocationSelector Component
 * 
 * Two cascading dropdowns for selecting Indian state and district.
 * Includes GPS location detection with reverse geocoding.
 * 
 * @example
 * <LocationSelector 
 *   value={{ state: 'Maharashtra', district: 'Pune' }} 
 *   onChange={(location) => setLocation(location)} 
 * />
 */
export function LocationSelector({
  value,
  onChange,
  className,
  disabled = false,
  showGPSButton = true,
}: LocationSelectorProps) {
  // State
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState(value?.state || '');
  const [selectedDistrict, setSelectedDistrict] = useState(value?.district || '');

  // Sync with external value
  useEffect(() => {
    if (value?.state !== selectedState) {
      setSelectedState(value?.state || '');
    }
    if (value?.district !== selectedDistrict) {
      setSelectedDistrict(value?.district || '');
    }
  }, [value, selectedState, selectedDistrict]);

  // Get districts for selected state
  const availableDistricts = useMemo(() => {
    if (!selectedState) return [];
    const state = INDIAN_STATES.find((s) => s.name === selectedState);
    return state?.districts || [];
  }, [selectedState]);

  // Handle state change
  const handleStateChange = useCallback((newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict('');
    setLocationError(null);
    onChange({ state: newState, district: '' });
  }, [onChange]);

  // Handle district change
  const handleDistrictChange = useCallback((newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setLocationError(null);
    onChange({ state: selectedState, district: newDistrict });
  }, [selectedState, onChange]);

  // Get current location using GPS
  const handleGetCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get location details');
      }

      const data = await response.json();
      const address = data.address;

      // Extract state and district from response
      let state = address.state || '';
      const district = address.county || address.state_district || address.city || '';

      // Clean up state name to match our data
      state = state.replace(' State', '');

      // Find matching state in our data
      const matchedState = STATE_NAMES.find(
        (s) => s.toLowerCase() === state.toLowerCase() ||
        s.toLowerCase().includes(state.toLowerCase()) ||
        state.toLowerCase().includes(s.toLowerCase())
      );

      if (matchedState) {
        setSelectedState(matchedState);
        
        // Find matching district
        const stateData = INDIAN_STATES.find((s) => s.name === matchedState);
        const matchedDistrict = stateData?.districts.find(
          (d) => d.toLowerCase() === district.toLowerCase() ||
          d.toLowerCase().includes(district.toLowerCase()) ||
          district.toLowerCase().includes(d.toLowerCase())
        );

        if (matchedDistrict) {
          setSelectedDistrict(matchedDistrict);
          onChange({ state: matchedState, district: matchedDistrict });
        } else {
          setSelectedDistrict('');
          onChange({ state: matchedState, district: '' });
        }
      } else {
        setLocationError('Could not determine your location. Please select manually.');
      }
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable. Please select manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Failed to get location. Please select manually.');
        }
      } else {
        setLocationError('Failed to get location. Please select manually.');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  }, [onChange]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* GPS Button */}
      {showGPSButton && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isLoadingLocation}
        >
          {isLoadingLocation ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Detecting location...
            </>
          ) : (
            <>
              <IconCurrentLocation className="w-4 h-4 mr-2" />
              Use current location
            </>
          )}
        </Button>
      )}

      {/* Error Message */}
      {locationError && (
        <div
          className={cn(
            'flex items-start gap-2 p-2',
            'bg-amber-50 dark:bg-amber-950/30',
            'border border-amber-200 dark:border-amber-800',
            'rounded-lg text-xs text-amber-700 dark:text-amber-400'
          )}
          role="alert"
        >
          <IconAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{locationError}</span>
        </div>
      )}

      {/* State and District Selectors */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* State Selector */}
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-foreground">
            State
          </label>
          <Select
            value={selectedState}
            onValueChange={handleStateChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full min-h-[44px]">
              <div className="flex items-center gap-2">
                <IconMapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <SelectValue placeholder="Select state" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectGroup>
                <SelectLabel>Indian States</SelectLabel>
                {STATE_NAMES.map((state) => (
                  <SelectItem key={state} value={state} className="cursor-pointer">
                    {state}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* District Selector */}
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-foreground">
            District
          </label>
          <Select
            value={selectedDistrict}
            onValueChange={handleDistrictChange}
            disabled={disabled || !selectedState}
          >
            <SelectTrigger className="w-full min-h-[44px]">
              <div className="flex items-center gap-2">
                <IconMapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <SelectValue placeholder={selectedState ? 'Select district' : 'Select state first'} />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-[250px]">
              {availableDistricts.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Districts in {selectedState}</SelectLabel>
                  {availableDistricts.map((district) => (
                    <SelectItem key={district} value={district} className="cursor-pointer">
                      {district}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default LocationSelector;
