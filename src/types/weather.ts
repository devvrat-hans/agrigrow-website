/**
 * Weather API Types for weatherapi.com
 * Based on the weatherapi.com forecast API response structure
 * Documentation: https://www.weatherapi.com/docs/
 */

// ==========================================
// Location Types
// ==========================================

/**
 * Location information from weather API
 */
export interface WeatherLocation {
  /** Location name */
  name: string;
  /** Region/State */
  region: string;
  /** Country name */
  country: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Timezone ID */
  tz_id: string;
  /** Local epoch time */
  localtime_epoch: number;
  /** Local date and time string */
  localtime: string;
}

// ==========================================
// Condition Types
// ==========================================

/**
 * Weather condition information
 */
export interface WeatherCondition {
  /** Weather condition text */
  text: string;
  /** Weather condition icon URL */
  icon: string;
  /** Weather condition code */
  code: number;
}

// ==========================================
// Current Weather Types
// ==========================================

/**
 * Air quality data
 */
export interface AirQuality {
  /** Carbon Monoxide (μg/m3) */
  co: number;
  /** Nitrogen dioxide (μg/m3) */
  no2: number;
  /** Ozone (μg/m3) */
  o3: number;
  /** Sulphur dioxide (μg/m3) */
  so2: number;
  /** PM2.5 (μg/m3) */
  pm2_5: number;
  /** PM10 (μg/m3) */
  pm10: number;
  /** US EPA Index: 1-Good, 2-Moderate, 3-Unhealthy for sensitive, 4-Unhealthy, 5-Very Unhealthy, 6-Hazardous */
  'us-epa-index': number;
  /** UK Defra Index */
  'gb-defra-index': number;
}

/**
 * Current weather data
 */
export interface CurrentWeather {
  /** Last updated epoch time */
  last_updated_epoch: number;
  /** Last updated date time string */
  last_updated: string;
  /** Temperature in celsius */
  temp_c: number;
  /** Temperature in fahrenheit */
  temp_f: number;
  /** Whether it's day (1) or night (0) */
  is_day: number;
  /** Weather condition */
  condition: WeatherCondition;
  /** Wind speed in miles per hour */
  wind_mph: number;
  /** Wind speed in kilometers per hour */
  wind_kph: number;
  /** Wind degree */
  wind_degree: number;
  /** Wind direction */
  wind_dir: string;
  /** Pressure in millibars */
  pressure_mb: number;
  /** Pressure in inches */
  pressure_in: number;
  /** Precipitation in millimeters */
  precip_mm: number;
  /** Precipitation in inches */
  precip_in: number;
  /** Humidity percentage */
  humidity: number;
  /** Cloud cover percentage */
  cloud: number;
  /** Feels like temperature in celsius */
  feelslike_c: number;
  /** Feels like temperature in fahrenheit */
  feelslike_f: number;
  /** Wind chill in celsius */
  windchill_c: number;
  /** Wind chill in fahrenheit */
  windchill_f: number;
  /** Heat index in celsius */
  heatindex_c: number;
  /** Heat index in fahrenheit */
  heatindex_f: number;
  /** Dew point in celsius */
  dewpoint_c: number;
  /** Dew point in fahrenheit */
  dewpoint_f: number;
  /** Visibility in kilometers */
  vis_km: number;
  /** Visibility in miles */
  vis_miles: number;
  /** UV Index */
  uv: number;
  /** Wind gust in miles per hour */
  gust_mph: number;
  /** Wind gust in kilometers per hour */
  gust_kph: number;
  /** Air quality data (optional) */
  air_quality?: AirQuality;
}

// ==========================================
// Forecast Types
// ==========================================

/**
 * Astronomy data for a day
 */
export interface Astro {
  /** Sunrise time */
  sunrise: string;
  /** Sunset time */
  sunset: string;
  /** Moonrise time */
  moonrise: string;
  /** Moonset time */
  moonset: string;
  /** Moon phase */
  moon_phase: string;
  /** Moon illumination percentage */
  moon_illumination: number;
  /** Is moon up */
  is_moon_up: number;
  /** Is sun up */
  is_sun_up: number;
}

/**
 * Daily weather data for forecast
 */
export interface DayWeather {
  /** Maximum temperature in celsius */
  maxtemp_c: number;
  /** Maximum temperature in fahrenheit */
  maxtemp_f: number;
  /** Minimum temperature in celsius */
  mintemp_c: number;
  /** Minimum temperature in fahrenheit */
  mintemp_f: number;
  /** Average temperature in celsius */
  avgtemp_c: number;
  /** Average temperature in fahrenheit */
  avgtemp_f: number;
  /** Maximum wind speed in miles per hour */
  maxwind_mph: number;
  /** Maximum wind speed in kilometers per hour */
  maxwind_kph: number;
  /** Total precipitation in millimeters */
  totalprecip_mm: number;
  /** Total precipitation in inches */
  totalprecip_in: number;
  /** Total snow in centimeters */
  totalsnow_cm: number;
  /** Average visibility in kilometers */
  avgvis_km: number;
  /** Average visibility in miles */
  avgvis_miles: number;
  /** Average humidity */
  avghumidity: number;
  /** Will it rain (1 = yes, 0 = no) */
  daily_will_it_rain: number;
  /** Chance of rain percentage */
  daily_chance_of_rain: number;
  /** Will it snow (1 = yes, 0 = no) */
  daily_will_it_snow: number;
  /** Chance of snow percentage */
  daily_chance_of_snow: number;
  /** Weather condition */
  condition: WeatherCondition;
  /** UV Index */
  uv: number;
  /** Air quality data (optional) */
  air_quality?: AirQuality;
}

/**
 * Hourly forecast data
 */
export interface ForecastHour {
  /** Time epoch */
  time_epoch: number;
  /** Time string */
  time: string;
  /** Temperature in celsius */
  temp_c: number;
  /** Temperature in fahrenheit */
  temp_f: number;
  /** Whether it's day (1) or night (0) */
  is_day: number;
  /** Weather condition */
  condition: WeatherCondition;
  /** Wind speed in miles per hour */
  wind_mph: number;
  /** Wind speed in kilometers per hour */
  wind_kph: number;
  /** Wind degree */
  wind_degree: number;
  /** Wind direction */
  wind_dir: string;
  /** Pressure in millibars */
  pressure_mb: number;
  /** Pressure in inches */
  pressure_in: number;
  /** Precipitation in millimeters */
  precip_mm: number;
  /** Precipitation in inches */
  precip_in: number;
  /** Snow in centimeters */
  snow_cm: number;
  /** Humidity percentage */
  humidity: number;
  /** Cloud cover percentage */
  cloud: number;
  /** Feels like temperature in celsius */
  feelslike_c: number;
  /** Feels like temperature in fahrenheit */
  feelslike_f: number;
  /** Wind chill in celsius */
  windchill_c: number;
  /** Wind chill in fahrenheit */
  windchill_f: number;
  /** Heat index in celsius */
  heatindex_c: number;
  /** Heat index in fahrenheit */
  heatindex_f: number;
  /** Dew point in celsius */
  dewpoint_c: number;
  /** Dew point in fahrenheit */
  dewpoint_f: number;
  /** Will it rain (1 = yes, 0 = no) */
  will_it_rain: number;
  /** Chance of rain percentage */
  chance_of_rain: number;
  /** Will it snow (1 = yes, 0 = no) */
  will_it_snow: number;
  /** Chance of snow percentage */
  chance_of_snow: number;
  /** Visibility in kilometers */
  vis_km: number;
  /** Visibility in miles */
  vis_miles: number;
  /** Wind gust in miles per hour */
  gust_mph: number;
  /** Wind gust in kilometers per hour */
  gust_kph: number;
  /** UV Index */
  uv: number;
}

/**
 * Forecast day data
 */
export interface ForecastDay {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Date epoch */
  date_epoch: number;
  /** Day weather data */
  day: DayWeather;
  /** Astronomy data */
  astro: Astro;
  /** Hourly forecast data */
  hour: ForecastHour[];
}

/**
 * Forecast data container
 */
export interface Forecast {
  /** Array of forecast days */
  forecastday: ForecastDay[];
}

// ==========================================
// Alert Types
// ==========================================

/**
 * Weather alert information
 */
export interface WeatherAlert {
  /** Alert headline */
  headline: string;
  /** Message type */
  msgtype: string;
  /** Severity level */
  severity: string;
  /** Urgency level */
  urgency: string;
  /** Areas affected */
  areas: string;
  /** Alert category */
  category: string;
  /** Certainty level */
  certainty: string;
  /** Event name */
  event: string;
  /** Additional note */
  note: string;
  /** Effective date/time */
  effective: string;
  /** Expires date/time */
  expires: string;
  /** Alert description */
  desc: string;
  /** Instruction */
  instruction: string;
}

/**
 * Alerts container
 */
export interface Alerts {
  /** Array of weather alerts */
  alert: WeatherAlert[];
}

// ==========================================
// Main API Response Types
// ==========================================

/**
 * Full weather API response from weatherapi.com forecast endpoint
 */
export interface WeatherApiResponse {
  /** Location information */
  location: WeatherLocation;
  /** Current weather data */
  current: CurrentWeather;
  /** Forecast data (optional, depends on API call) */
  forecast?: Forecast;
  /** Weather alerts (optional, depends on API call) */
  alerts?: Alerts;
}

/**
 * Error response from weather API
 */
export interface WeatherApiError {
  error: {
    /** Error code */
    code: number;
    /** Error message */
    message: string;
  };
}

// ==========================================
// Simplified Types for UI Components
// ==========================================

/**
 * Simplified weather data for UI components
 */
export interface SimpleWeatherData {
  location: {
    name: string;
    region: string;
    country: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    wind_kph: number;
    feelslike_c: number;
    uv: number;
    is_day: boolean;
  };
  forecast: Array<{
    date: string;
    day: {
      maxtemp_c: number;
      mintemp_c: number;
      condition: {
        text: string;
        icon: string;
      };
      daily_chance_of_rain: number;
    };
  }>;
}

/**
 * Transform WeatherApiResponse to SimpleWeatherData for UI
 */
export function toSimpleWeatherData(response: WeatherApiResponse): SimpleWeatherData {
  return {
    location: {
      name: response.location.name,
      region: response.location.region,
      country: response.location.country,
    },
    current: {
      temp_c: response.current.temp_c,
      condition: {
        text: response.current.condition.text,
        icon: response.current.condition.icon,
      },
      humidity: response.current.humidity,
      wind_kph: response.current.wind_kph,
      feelslike_c: response.current.feelslike_c,
      uv: response.current.uv,
      is_day: response.current.is_day === 1,
    },
    forecast: (response.forecast?.forecastday || []).map((day) => ({
      date: day.date,
      day: {
        maxtemp_c: day.day.maxtemp_c,
        mintemp_c: day.day.mintemp_c,
        condition: {
          text: day.day.condition.text,
          icon: day.day.condition.icon,
        },
        daily_chance_of_rain: day.day.daily_chance_of_rain,
      },
    })),
  };
}

/**
 * Get farming suggestions based on weather conditions
 */
export type WeatherFarmingSuggestionType = 
  | 'irrigation'
  | 'harvesting'
  | 'spraying'
  | 'planting'
  | 'protection'
  | 'general';

export interface WeatherFarmingSuggestion {
  type: WeatherFarmingSuggestionType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}
