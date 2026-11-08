import { CITIES } from './engine.js';
async function fetchJSON(url, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timeout = AbortSignal.timeout(10000);
      const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, cache: 'no-cache' });
      if (!response.ok) {
        const error = new Error(`天气服务暂时不可用（${response.status}）`); error.status = response.status; throw error;
      }
      return await response.json();
    } catch (error) {
      const retryable = error instanceof TypeError || error.name === 'TimeoutError' || error.status === 429 || error.status >= 500;
      if (attempt || signal?.aborted || !retryable) throw error;
      await new Promise(resolve => setTimeout(resolve, 350));
      if (signal?.aborted) throw signal.reason || new DOMException('已取消', 'AbortError');
    }
  }
}
export async function fetchForecast(city, signal) {
  const params = new URLSearchParams({ latitude: city.latitude, longitude: city.longitude, timezone: 'auto', forecast_days: '5', wind_speed_unit: 'ms', current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m', hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability,weather_code' });
  const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params}`, signal);
  if (data.error || !data.hourly?.time?.length || !data.hourly.temperature_2m?.some(Number.isFinite)) throw new Error('天气服务未返回有效的逐小时预报。');
  return { ...data, source: 'live', updatedAt: new Date().toISOString(), locationKey: `${city.latitude},${city.longitude}` };
}
export async function searchCities(query, signal) {
  const local = CITIES.filter(c => c.name.includes(query.trim()));
  const params = new URLSearchParams({ name: query.trim(), count: 8, language: 'zh', format: 'json' });
  try {
    const data = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal);
    const remote = (data.results || []).map(r => ({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(' · '), latitude: r.latitude, longitude: r.longitude, timezone: r.timezone || 'Asia/Shanghai' }));
    return [...local, ...remote.filter(r => !local.some(l => Math.abs(l.latitude - r.latitude) < .05 && Math.abs(l.longitude - r.longitude) < .05))];
  } catch (error) { if (local.length) return local; throw error; }
}
