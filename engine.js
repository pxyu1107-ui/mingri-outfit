// Heuristic recommendation model. Warmth values are relative product parameters, not clo.
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const DEFAULT_PROFILE = {
  city: { name: '南京', region: '江苏 · 中国', latitude: 32.0617, longitude: 118.7778, timezone: 'Asia/Shanghai' },
  departure: '08:00', returning: '22:00', transport: 'ebike', ridingMinutes: 15,
  walkingMinutes: 5, scene: 'library', indoorMode: 'seasonal', indoorTemperature: 20,
  sensitivity: 'normal', weights: [50, 30, 20],
};
export const CITIES = [
  DEFAULT_PROFILE.city,
  { name: '上海', region: '上海 · 中国', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { name: '北京', region: '北京 · 中国', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { name: '杭州', region: '浙江 · 中国', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' },
  { name: '广州', region: '广东 · 中国', latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai' },
  { name: '成都', region: '四川 · 中国', latitude: 30.5728, longitude: 104.0668, timezone: 'Asia/Shanghai' },
  { name: '哈尔滨', region: '黑龙江 · 中国', latitude: 45.8038, longitude: 126.535, timezone: 'Asia/Shanghai' },
  { name: '深圳', region: '广东 · 中国', latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' },
];
export const CATALOG = [
  { id: 'tee', name: '短袖', group: 'base', warmth: .22, wind: .05, color: 'cream', enabled: true, roles: ['base'], detail: '清爽内搭', icon: 'tee' },
  { id: 'long', name: '薄长袖', group: 'base', warmth: .50, wind: .10, color: 'sand', enabled: true, roles: ['base'], detail: '日常基础层', icon: 'long' },
  { id: 'thermal', name: '保暖内搭', group: 'base', warmth: .83, wind: .08, color: 'clay', enabled: true, roles: ['base'], detail: '偏冷时的贴身层', icon: 'long' },
  { id: 'fleece', name: '抓绒外套', group: 'warm', warmth: .72, wind: .20, color: 'sage', enabled: true, roles: ['mid', 'outer'], detail: '可室内单穿 · 可作中间层', icon: 'fleece', confirmed: true },
  { id: 'polar', name: '摇粒绒外套', group: 'outer', warmth: 1.05, wind: .20, color: 'oat', enabled: true, roles: ['outer'], acceptsMiddle: false, detail: '你的穿法：仅作最外层', icon: 'fleece', confirmed: true },
  { id: 'down-light', name: '薄款羽绒服', group: 'outer', warmth: 1.16, wind: .65, color: 'olive', enabled: true, roles: ['outer'], detail: '轻量保暖外层', icon: 'down', confirmed: true },
  { id: 'down-heavy', name: '厚款羽绒服', group: 'outer', warmth: 1.92, wind: .72, color: 'dark', enabled: true, roles: ['outer'], detail: '较强保暖外层', icon: 'down', confirmed: true },
  { id: 'shell', name: '防风薄外套', group: 'outer', warmth: .26, wind: .95, color: 'blue', enabled: false, roles: ['outer'], detail: '有这类衣服时可启用', icon: 'jacket' },
  { id: 'jacket', name: '日常夹克', group: 'outer', warmth: .73, wind: .65, color: 'clay', enabled: false, roles: ['outer'], detail: '春秋外层', icon: 'jacket' },
  { id: 'knit', name: '毛衣', group: 'warm', warmth: .82, wind: .18, color: 'cream', enabled: false, roles: ['mid'], detail: '供其他衣物配置选择', icon: 'long' },
  { id: 'shorts', name: '短裤', group: 'bottom', warmth: .10, color: 'sand', enabled: false, roles: ['bottom'], detail: '轻薄下装', icon: 'shorts' },
  { id: 'pants-thin', name: '薄长裤', group: 'bottom', warmth: .42, color: 'sand', enabled: true, roles: ['bottom'], detail: '透气轻薄', icon: 'pants' },
  { id: 'pants', name: '常规长裤', group: 'bottom', warmth: .80, color: 'charcoal', enabled: true, roles: ['bottom'], detail: '日常厚度', icon: 'pants' },
  { id: 'pants-warm', name: '厚长裤', group: 'bottom', warmth: 1.35, color: 'dark', enabled: true, roles: ['bottom'], detail: '偏冷时的下装', icon: 'pants' },
  { id: 'sneakers', name: '包脚运动鞋', group: 'shoes', warmth: .55, color: 'cream', enabled: true, roles: ['shoes'], detail: '日常步行', icon: 'shoes' },
  { id: 'boots', name: '保暖鞋', group: 'shoes', warmth: 1.15, color: 'clay', enabled: false, roles: ['shoes'], detail: '偏冷时可选', icon: 'shoes' },
];
export const displayName = item => item.alias?.trim() || item.name;
export function normalizeWeights(values) {
  const total = values.reduce((sum, n) => sum + n, 0);
  if (!total) return [50, 30, 20];
  const exact = values.map(n => n / total * 100), rounded = exact.map(Math.floor);
  const order = exact.map((n, i) => ({ i, fraction: n - rounded[i] })).sort((a, b) => b.fraction - a.fraction);
  for (let left = 100 - rounded.reduce((sum, n) => sum + n, 0), j = 0; left > 0; left--, j++) rounded[order[j % order.length].i]++;
  return rounded;
}
export function localDate(timezone = 'Asia/Shanghai', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
}
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function timeMinutes(time) { const [h, m] = time.split(':').map(Number); return h * 60 + m; }
export function shiftTime(date, time, minutes) {
  const total = timeMinutes(time) + Math.round(minutes);
  return { date: addDays(date, Math.floor(total / 1440)), time: `${String(Math.floor(((total % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((total % 60) + 60) % 60).padStart(2, '0')}` };
}
export function seasonFor(weather, date) {
  const noon = weatherAt(weather, date, '14:00').temperature;
  return noon >= 26 ? 'hot' : noon <= 13 ? 'cold' : 'mild';
}
export function weatherAt(weather, date, time) {
  const minutes = timeMinutes(time), hour = Math.floor(minutes / 60);
  const key = `${date}T${String(hour).padStart(2, '0')}:00`;
  const i = weather.hourly.time.indexOf(key);
  if (i < 0) throw new Error('预报未覆盖所选时段，请刷新天气或选择其他日期。');
  const fraction = (minutes % 60) / 60;
  const field = (name, fallback) => {
    const a = weather.hourly[name]?.[i];
    if (!Number.isFinite(a)) { if (fallback !== undefined) return fallback; throw new Error('天气数据不完整，请重新获取。'); }
    const b = weather.hourly[name]?.[i + 1];
    if (fraction && !Number.isFinite(b)) throw new Error('预报未覆盖跨小时行程，请刷新天气。');
    return a + ((b ?? a) - a) * fraction;
  };
  const temperature = field('temperature_2m');
  return { temperature, apparent: field('apparent_temperature', temperature), humidity: field('relative_humidity_2m', 60), wind: field('wind_speed_10m', 0), rain: field('precipitation_probability', 0), code: weather.hourly.weather_code?.[i] ?? 2, time, date };
}
export function dayWeather(weather, date) {
  const values = weather.hourly.time.map((t, i) => t.startsWith(date) ? weather.hourly.temperature_2m[i] : null).filter(Number.isFinite);
  if (values.length !== 24) throw new Error('所选日期的逐小时预报不完整，请刷新。');
  return { min: Math.min(...values), max: Math.max(...values), range: Math.max(...values) - Math.min(...values) };
}
export function indoorEstimate(profile, weather, date) {
  if (profile.indoorMode === 'manual') return { temperature: Number(profile.indoorTemperature), label: '你设置的室内温度', estimated: false };
  const modes = { ac: [22, '偏冷空调'], heating: [17, '供暖不足'], normal: [21, '普通室内'], warm: [24, '温暖室内'] };
  const key = profile.indoorMode === 'seasonal' ? ({ hot: 'ac', cold: 'heating', mild: 'normal' }[seasonFor(weather, date)]) : profile.indoorMode;
  const [temperature, label] = modes[key] || modes.normal;
  return { temperature, label, estimated: true };
}
export function buildScenarios(profile, weather, date) {
  const scenarios = [], indoor = indoorEstimate(profile, weather, date);
  const ride = profile.transport === 'ebike' ? Number(profile.ridingMinutes) : 0;
  const walk = Number(profile.walkingMinutes);
  const total = Math.max(1, ride + walk);
  for (const [scope, start, name] of [['morning', profile.departure, '早晨出门'], ['evening', profile.returning, '晚间返程']]) {
    const segments = profile.transport === 'ebike' ? [['电瓶车', ride, 'ride'], ['步行', walk, 'walk']] : [[profile.transport === 'car' ? '短时室外' : '步行', Math.max(1, walk), 'walk']];
    let elapsed = 0;
    for (const [mode, duration, kind] of segments) {
      if (!duration) continue;
      const point = shiftTime(date, start, elapsed + duration / 2);
      // Weather timestamps are local to the selected city, never the browser's timezone.
      const w = weatherAt(weather, point.date, point.time);
      scenarios.push({ ...w, id: `${scope}-${kind}`, scope, name: `${name} · ${mode}`, kind, duration, weight: .25 * (profile.transport === 'ebike' ? duration / total : 1), start });
      elapsed += duration;
    }
  }
  if (profile.scene === 'outdoors') {
    for (const time of ['11:00', '15:00']) scenarios.push({ ...weatherAt(weather, date, time), id: `day-${time}`, scope: 'indoor', name: '白天户外', kind: 'walk', duration: 90, weight: .25, start: time });
  } else {
    scenarios.push({ id: 'indoor', scope: 'indoor', name: ({ library: '图书馆', office: '办公室', classroom: '教室', home: '居家' }[profile.scene] || '室内'), kind: 'indoor', duration: Math.max(60, timeMinutes(profile.returning) - timeMinutes(profile.departure) - total), weight: .5, temperature: indoor.temperature, apparent: indoor.temperature, wind: 0, rain: 0, humidity: null, estimated: indoor.estimated, indoorLabel: indoor.label });
  }
  return { scenarios, indoor, season: seasonFor(weather, date) };
}
export function calibration(feedback, scope, season) {
  const rows = feedback.filter(f => f.scope === scope && f.season === season && f.actualConfirmed).slice(-12);
  if (!rows.length) return 0;
  return clamp(rows.reduce((sum, f) => sum - Number(f.value) * .12, 0) / rows.length, -.35, .35);
}
export function requiredWarmth(apparent, bias = 0) { return clamp((25 - apparent) / 9 + bias, .06, 4.4); }
export function validUpper(base, middle, outer) {
  if (!base?.roles.includes('base')) return false;
  if (middle && !middle.roles.includes('mid')) return false;
  if (outer && !outer.roles.includes('outer')) return false;
  const ids = [base, middle, outer].filter(Boolean).map(i => i.id);
  if (new Set(ids).size !== ids.length) return false;
  // Layering fleece under the user's bulky outer-only polar jacket is not confirmed.
  if (middle && outer?.acceptsMiddle === false) return false;
  return true;
}
function evaluateScene(items, scenario, profile, feedback, season, manualBias) {
  const personal = { cold: .23, normal: 0, hot: -.23 }[profile.sensitivity] || 0;
  const target = requiredWarmth(scenario.apparent, personal + calibration(feedback, scenario.scope, season) + manualBias);
  const options = [items];
  if (scenario.kind === 'indoor' || scenario.scope === 'indoor') {
    options.push(items.filter(i => i === items[0] || i.roles.includes('mid')));
    options.push([items[0]]);
  }
  let best;
  for (const worn of options) {
    const warmth = worn.reduce((sum, item) => sum + item.warmth, 0);
    const difference = warmth - target;
    let loss = Math.abs(difference) * (difference < 0 ? 1.14 : 1.05);
    if (scenario.kind !== 'indoor') {
      const windProtection = Math.max(...worn.map(i => i.wind || 0));
      // Apparent temperature already includes weather wind. This term evaluates
      // garment wind suitability; it does not subtract wind chill a second time.
      const exposure = scenario.kind === 'ride' ? .65 : clamp(scenario.wind / 8, 0, .8);
      loss += Math.max(0, 20 - scenario.apparent) / 25 * (1 - windProtection) * exposure * .45;
      loss *= clamp(scenario.duration / 20, .6, 1.2);
    } else {
      const bulky = worn.find(i => i.id === 'down-heavy');
      if (bulky) loss += .12;
    }
    const result = { ...scenario, target, warmth, difference, loss, worn: worn.map(i => i.id), comfort: difference < -.42 ? '可能偏冷' : difference > .5 ? '可能偏热' : '较合适' };
    if (!best || loss < best.loss) best = result;
  }
  return best;
}
export function recommend({ profile, wardrobe, weather, date, feedback = [], manualBias = 0 }) {
  const { scenarios, indoor, season } = buildScenarios(profile, weather, date);
  const active = wardrobe.filter(item => item.enabled);
  const bases = active.filter(i => i.roles.includes('base'));
  const mids = [null, ...active.filter(i => i.roles.includes('mid'))];
  const outers = [null, ...active.filter(i => i.roles.includes('outer'))];
  if (!bases.length) return { plans: [], error: '请在衣物设置中启用至少一种内搭。', scenarios, indoor, season };
  const weights = profile.weights || [50, 30, 20];
  const denominator = weights.reduce((a, b) => a + Number(b), 0) || 100;
  const plans = [];
  for (const base of bases) for (const mid of mids) for (const outer of outers) {
    if (!validUpper(base, mid, outer)) continue;
    // A standalone dual-role fleece has a single canonical plan: worn as outer.
    if (mid && !outer && mid.roles.includes('outer')) continue;
    const items = [base, mid, outer].filter(Boolean);
    const scenes = scenarios.map(s => evaluateScene(items, s, profile, feedback, season, manualBias));
    const sumWeight = scenes.reduce((sum, s) => sum + s.weight, 0);
    const averageLoss = scenes.reduce((sum, s) => sum + s.loss * s.weight, 0) / sumWeight;
    const worstLoss = Math.max(...scenes.map(s => s.loss));
    const indoorScene = scenes.find(s => s.kind === 'indoor');
    const changes = indoorScene ? items.length - indoorScene.worn.length : 0;
    const convenience = (items.length - 1) * .09 + changes * .045 + (outer?.id === 'down-heavy' ? .055 : 0);
    const loss = (weights[0] * averageLoss + weights[1] * worstLoss + weights[2] * convenience) / denominator;
    plans.push({ id: items.map(i => i.id).join('+'), items, base, middle: mid, outer, scenes, score: Math.round(clamp(100 - loss * 38, 0, 100)), loss, averageLoss, worstLoss, convenience });
  }
  plans.sort((a, b) => a.loss - b.loss || a.items.length - b.items.length);
  const minimum = Math.min(...scenarios.filter(s => s.kind !== 'indoor').map(s => s.apparent));
  const legTarget = clamp((26 - minimum) / 19 + (profile.sensitivity === 'cold' ? .15 : 0), .08, 2.1);
  const bottom = active.filter(i => i.roles.includes('bottom')).sort((a, b) => Math.abs(a.warmth - legTarget) - Math.abs(b.warmth - legTarget))[0];
  const shoeTarget = minimum < 5 ? 1 : .5;
  const shoes = active.filter(i => i.roles.includes('shoes')).sort((a, b) => Math.abs(a.warmth - shoeTarget) - Math.abs(b.warmth - shoeTarget))[0];
  const warnings = [];
  if (!bottom) warnings.push('还未启用下装类别，请在衣物设置中补充。');
  else if (legTarget - bottom.warmth > .45) warnings.push('现有下装可能偏薄，可评估保暖内搭裤；该类别尚未确认拥有。');
  if (!shoes) warnings.push('还未启用鞋类，请补充适合当天行程的鞋子。');
  else if (minimum < 1 && shoes.warmth < .8) warnings.push('低温通勤可评估较厚袜子或保暖鞋，当前仍按你启用的鞋类推荐。');
  if (plans[0]?.worstLoss > 1) warnings.push('现有衣物难以兼顾所有时段，请留意下方偏冷或偏热的场景。');
  return { plans, bottom, shoes, scenarios, indoor, season, warnings, day: dayWeather(weather, date) };
}
export function weatherLabel(code) {
  if (code === 0) return '晴';
  if ([1, 2].includes(code)) return '晴间多云';
  if (code === 3) return '阴';
  if ([45, 48].includes(code)) return '雾';
  if (code >= 71 && code <= 86) return '降雪';
  if (code >= 95) return '雷雨';
  if (code >= 51) return '降雨';
  return '多云';
}
export function makeDemoWeather(date, kind = 'autumn', timezone = 'Asia/Shanghai') {
  const shapes = { autumn: [11, 10, 10, 10, 10, 10, 11, 12, 13, 15, 18, 20, 22, 23, 23, 22, 20, 18, 16, 15, 14, 13, 12, 11], summer: [27, 27, 26, 26, 26, 27, 27, 28, 29, 30, 32, 33, 34, 34, 34, 33, 33, 32, 31, 30, 29, 29, 28, 28], winter: [0, 0, -1, -1, -1, 0, 0, 1, 2, 3, 4, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0], rain: [12, 12, 11, 11, 11, 11, 12, 13, 14, 15, 16, 17, 18, 18, 17, 17, 16, 15, 15, 14, 14, 13, 13, 12] };
  const shape = shapes[kind] || shapes.autumn;
  const hourly = { time: [], temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [], wind_speed_10m: [], precipitation_probability: [], weather_code: [] };
  for (let d = -1; d < 5; d++) for (let h = 0; h < 24; h++) {
    const t = shape[h];
    hourly.time.push(`${addDays(date, d)}T${String(h).padStart(2, '0')}:00`);
    hourly.temperature_2m.push(t); hourly.apparent_temperature.push(t + (kind === 'summer' ? 2 : kind === 'winter' ? -3 : -1));
    hourly.relative_humidity_2m.push(kind === 'rain' ? 88 : kind === 'summer' ? 74 : 60);
    hourly.wind_speed_10m.push(kind === 'winter' ? 5 : kind === 'rain' ? 4 : 2);
    hourly.precipitation_probability.push(kind === 'rain' ? 80 : 10);
    hourly.weather_code.push(kind === 'rain' ? 61 : kind === 'winter' ? 3 : 2);
  }
  return { hourly, timezone, source: 'demo', demoKind: kind, updatedAt: new Date().toISOString(), date };
}
