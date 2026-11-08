import { localDate, addDays } from './engine.js';
// Browser geolocation is requested only after an explicit button press.
// Weather queries use rounded WGS84 coordinates, not device-precision coordinates.
export function validateCoordinates(latitude, longitude) {
  const missing = value => value === null || value === undefined || (typeof value === 'string' && !value.trim());
  if (missing(latitude) || missing(longitude)) throw new Error('请完整填写纬度与经度。');
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('纬度应在 -90 到 90 之间。');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('经度应在 -180 到 180 之间。');
  return { latitude: Math.round(lat * 100) / 100, longitude: Math.round(lon * 100) / 100 };
}
export function coordinateLocation(latitude, longitude, { name = '', kind = 'coordinates', accuracy = null, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
  const point = validateCoordinates(latitude, longitude);
  return { ...point, name: String(name).trim().slice(0, 30) || (kind === 'device' ? '当前位置附近' : '指定位置'), region: kind === 'device' ? '设备定位 · 近似坐标' : '经纬度选点 · 近似坐标', timezone: timezone || 'Asia/Shanghai', kind, accuracyMeters: Number.isFinite(accuracy) ? Math.max(0, Math.round(accuracy)) : null };
}
export function geolocationError(error) {
  if (error?.code === 1) return '定位未获授权。你可以继续搜索城市或手动填写位置。';
  if (error?.code === 3) return '定位超时。可以到信号较好的地方重试，或手动选择位置。';
  return '当前环境暂时无法定位。请尝试系统浏览器，或手动选择位置。';
}
export function locateOnce({ geolocation = globalThis.navigator?.geolocation, secure = globalThis.isSecureContext } = {}) {
  if (!secure) return Promise.reject(new Error('当前页面不支持安全定位，请使用 HTTPS 页面，或手动选择位置。'));
  if (!geolocation?.getCurrentPosition) return Promise.reject(new Error('当前浏览器不支持定位，请搜索城市或手动填写位置。'));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(position => {
      try { resolve(coordinateLocation(position.coords.latitude, position.coords.longitude, { kind: 'device', accuracy: position.coords.accuracy })); }
      catch (error) { reject(error); }
    }, error => reject(new Error(geolocationError(error))), { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
}
export const FORECAST_REFRESH_MS = 30 * 60 * 1000;
export function forecastNeedsRefresh(weather, now = Date.now()) {
  return weather?.source === 'live' && (!Number.isFinite(Date.parse(weather.updatedAt)) || now - Date.parse(weather.updatedAt) >= FORECAST_REFRESH_MS);
}
export function forecastSelection(city, date, timezone, now = new Date()) {
  const previousTomorrow = addDays(localDate(city.timezone, now), 1);
  let targetZone = city.timezone;
  try { localDate(timezone, now); targetZone = timezone || city.timezone; } catch { /* Keep the last valid timezone. */ }
  const today = localDate(targetZone, now);
  return { city: { ...city, timezone: targetZone }, date: (date === previousTomorrow && targetZone !== city.timezone) || date < today || date > addDays(today, 3) ? addDays(today, 1) : date };
}
