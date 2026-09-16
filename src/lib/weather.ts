export interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
  rainChance: number;
}

export interface WeatherSnapshot {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  timezone: string;
  days: WeatherDay[];
}

export function describeWeatherCode(code: number) {
  if (code === 0) return 'Céu limpo';
  if ([1, 2].includes(code)) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if ([45, 48].includes(code)) return 'Neblina';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Garoa';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Chuva';
  if ([71, 73, 75, 77].includes(code)) return 'Neve';
  if ([80, 81, 82].includes(code)) return 'Pancadas de chuva';
  if ([85, 86].includes(code)) return 'Pancadas de neve';
  if ([95, 96, 99].includes(code)) return 'Trovoadas';
  return 'Condição variável';
}

export async function fetchWeatherForecast(lat: number, lng: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    timezone: 'auto',
    forecast_days: '4',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Não foi possível carregar a previsão do tempo.');

  const data = await response.json();
  const current = data?.current || {};
  const daily = data?.daily || {};

  const times: string[] = Array.isArray(daily.time) ? daily.time : [];

  return {
    temperature: Number(current.temperature_2m ?? 0),
    apparentTemperature: Number(current.apparent_temperature ?? 0),
    precipitation: Number(current.precipitation ?? 0),
    windSpeed: Number(current.wind_speed_10m ?? 0),
    weatherCode: Number(current.weather_code ?? -1),
    timezone: String(data?.timezone || ''),
    days: times.map((date, index) => ({
      date,
      code: Number(daily.weather_code?.[index] ?? -1),
      max: Number(daily.temperature_2m_max?.[index] ?? 0),
      min: Number(daily.temperature_2m_min?.[index] ?? 0),
      rainChance: Number(daily.precipitation_probability_max?.[index] ?? 0),
    })),
  };
}
