import { DEFAULT_PROFILE, CATALOG, CITIES, displayName, localDate, addDays, weatherAt, dayWeather, recommend, weatherLabel, makeDemoWeather, clamp, normalizeWeights } from './engine.js';
import { fetchForecast, searchCities } from './weather.js';
import { icon, garment, weatherArt } from './visuals.js';
import { locateOnce, coordinateLocation, forecastNeedsRefresh, forecastSelection } from './location.js';
import { APP_VERSION, trialReport } from './trial.js';

const STORAGE_KEY = 'mingri-outfit:v1';
const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = value => JSON.parse(JSON.stringify(value));
const round = number => Math.round(number);
const sceneNames = { library: '图书馆', office: '办公室', classroom: '教室', home: '居家', outdoors: '主要在户外' };
const transportNames = { ebike: '电瓶车＋步行', walk: '步行', transit: '公共交通＋步行', car: '开车＋短时步行' };
const scopeNames = { morning: '早晨通勤', indoor: '白天主要场景', evening: '晚间返程' };
let storageError = false;
function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { storageError = true; return {}; } }
const stored = load();
const profile = { ...clone(DEFAULT_PROFILE), ...(stored.profile || {}), city: { ...DEFAULT_PROFILE.city, ...(stored.profile?.city || {}) } };
for (const key of ['departure', 'returning']) if (!/^\d{2}:\d{2}$/.test(profile[key])) profile[key] = DEFAULT_PROFILE[key];
try { localDate(profile.city.timezone); } catch { profile.city = clone(DEFAULT_PROFILE.city); }
if (!Array.isArray(profile.weights) || profile.weights.length !== 3 || profile.weights.some(n => !Number.isFinite(n) || n < 0) || profile.weights.reduce((a,b) => a+b, 0) === 0) profile.weights = [50,30,20];
const defaultWardrobe = clone(CATALOG);
const wardrobe = Array.isArray(stored.wardrobe) ? defaultWardrobe.map(item => ({ ...item, ...stored.wardrobe.find(saved => saved.id === item.id) })).concat(stored.wardrobe.filter(i => String(i.id).startsWith('custom-') && typeof i.warmth === 'number' && Array.isArray(i.roles))) : defaultWardrobe;
const state = {
  profile, wardrobe, date: addDays(localDate(profile.city.timezone), 1),
  feedback: Array.isArray(stored.feedback) ? stored.feedback : [],
  savedPlans: Array.isArray(stored.savedPlans) ? stored.savedPlans : [],
  weather: null, loading: false, error: '', view: 'outfit', filter: 'all', manualBias: 0, planId: '', result: null, cityResults: [], request: 0,
};
const locationKey = () => `${state.profile.city.latitude},${state.profile.city.longitude}`;
if (stored.weatherCache?.source === 'live' && stored.weatherCache.locationKey === locationKey() && stored.weatherCache.hourly?.time?.includes(`${state.date}T22:00`)) state.weather = { ...stored.weatherCache, cached: true };
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: state.profile, wardrobe: state.wardrobe, feedback: state.feedback.slice(-120), savedPlans: state.savedPlans.slice(-60), weatherCache: state.weather?.source === 'live' ? state.weather : undefined }));
  } catch { storageError = true; toast('浏览器未能保存设置，本次仍可继续使用。'); }
}
let toastTimer;
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3400); }
function dateLabel(date) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
function relativeLabel(date) { const today = localDate(state.profile.city.timezone); return date === addDays(today, 1) ? '明日' : date === today ? '今日' : dateLabel(date).split('日')[0] + '日'; }
function sourceTime() { return state.weather?.updatedAt ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: state.profile.city.timezone, hour12: false }).format(new Date(state.weather.updatedAt)) : ''; }
function weatherIcon(code, hour = 12) { return code >= 51 ? 'rain' : code === 3 || [45,48].includes(code) ? 'cloud' : hour < 6 || hour > 18 ? 'moon' : 'sun'; }
const pill = (text, cls = '') => `<span class="pill ${cls}">${escapeHTML(text)}</span>`;
function header() {
  const links = [['outfit', 'hanger', '穿衣建议'], ['journey', 'calendar', '我的日程'], ['wardrobe', 'book', '我的衣物'], ['history', 'history', '穿着记录']];
  return `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#outfit" aria-label="明日衣序首页"><span class="brand-mark">${icon('hanger')}</span><span><span class="brand-name">明日衣序</span><span class="brand-subtitle">A LITTLE MORE COMFORT</span></span></a><p class="side-label">日 常 · 刚 刚 好</p><nav class="navigation" aria-label="主导航">${links.map(([id, glyph, label]) => `<a class="nav-link ${state.view === id ? 'active' : ''}" href="#${id}" ${state.view === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-note">${icon('leaf')}<p>把明天穿什么，<br>留在今晚决定。</p></div><div class="sidebar-footer"><span class="avatar">我</span><span>我的日常<small>偏好保存在此浏览器</small></span></div></aside><div class="main-wrap"><header class="topbar"><div class="mobile-brand"><span class="brand-mark">${icon('hanger')}</span>明日衣序</div><div class="breadcrumb">日常助手 <span>/</span> <strong>${links.find(l => l[0] === state.view)?.[2]}</strong></div><div class="top-tools"><button class="quiet-button trial-entry" data-action="trial-feedback">${icon('edit')}提意见</button><span class="top-date">${escapeHTML(dateLabel(localDate(state.profile.city.timezone)))}</span><button class="city-button" data-action="city" aria-label="切换城市，当前${escapeHTML(state.profile.city.name)}">${icon('pin')} <span class="city-button-label">${escapeHTML(state.profile.city.name)}</span> ${icon('down')}</button><span class="avatar">我</span></div></header><main id="main" tabindex="-1"></main></div></div>`;
}
function pageHeading(title, subtitle, eyebrow = 'YOUR EVERYDAY, WELL PREPARED', dateControl = false) {
  const today = localDate(state.profile.city.timezone);
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${dateControl ? `<label class="date-control">${icon('calendar')}<input type="date" id="selected-date" aria-label="建议日期" value="${state.date}" min="${today}" max="${addDays(today, 3)}"></label>` : ''}</div>`;
}
function footer() { return `<footer class="page-footer"><span>${icon('leaf')} 每一天，找到适合自己的温度。 · v${APP_VERSION}</span><button class="text-button" data-action="trial-feedback">${icon('edit')}提试用意见</button><span>个人数据保存在此浏览器 · 预报来自 <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></span></footer>`; }
function trialIntro() {
  if (state.profile.trialSetupDone) return '';
  return `<section class="trial-intro"><div><strong>第一次使用？先选你的位置。</strong><p>当前日程与衣物是初始模板，按自己的情况调整后，建议会更合适。</p></div><div class="trial-intro-actions"><button class="mini-button" data-action="city">选择位置</button><a class="mini-button" href="#journey">改日程</a><a class="mini-button" href="#wardrobe">选衣物</a><button class="text-button" data-action="setup-done">我已设置好</button></div></section>`;
}
function sourceBanner() {
  const messages = [];
  if (state.weather?.source === 'demo') messages.push(`<div class="source-banner"><span>${icon('info', 'small-icon')} 正在体验演示天气，以下数据不是实际预报。</span><button class="text-button" data-action="refresh">获取真实预报 ${icon('arrow')}</button></div>`);
  if (state.error) messages.push(`<div class="source-banner error"><span>${escapeHTML(state.error)}${state.weather?.source === 'live' ? ' 当前展示此前缓存的预报，请留意更新时间。' : ''}</span><button class="text-button" data-action="refresh">重试</button></div>`);
  if (storageError) messages.push('<div class="storage-alert">当前浏览器未能持久保存数据，关闭后可能需要重新设置。</div>');
  return messages.join('');
}
function emptyWeather() {
  return `<section class="panel empty-panel">${state.loading ? '<div class="loading-ring" aria-hidden="true"></div>' : icon('cloud')}<h2>${state.loading ? '正在查看你的明日天气' : '先了解天气，再决定穿什么'}</h2><p>${state.loading ? '获取所选城市的逐小时预报，重点关注你的出门与返程时段。' : '暂未获得有效预报。可以重新获取，或明确选择演示天气体验推荐流程。'}</p><div class="empty-actions"><button class="primary-button" data-action="refresh" ${state.loading ? 'disabled' : ''}>${icon('refresh')}重新获取</button><button class="quiet-button" data-action="demo">体验演示天气</button></div></section>`;
}
function calculate() {
  if (!state.weather) return null;
  try { const result = recommend({ profile: state.profile, wardrobe: state.wardrobe, weather: state.weather, date: state.date, feedback: state.feedback, manualBias: state.manualBias }); state.result = result; return result; }
  catch (error) { state.result = null; return { error: error.message, plans: [] }; }
}
function selectedPlan(result = state.result) { return result?.plans?.find(p => p.id === state.planId) || result?.plans?.[0]; }
function weatherPanel() {
  const w = state.weather, d = dayWeather(w, state.date);
  const morning = weatherAt(w, state.date, state.profile.departure), evening = weatherAt(w, state.date, state.profile.returning);
  const stamps = [...new Set([state.profile.departure, '11:00', '14:00', '18:00', state.profile.returning])].sort();
  return `<section class="panel weather-panel" aria-label="所选日期天气"><div class="weather-header"><div class="weather-location">${icon('pin')}${escapeHTML(state.profile.city.name)} <span class="muted">· ${relativeLabel(state.date)}</span></div>${pill(w.source === 'demo' ? '演示天气' : w.cached ? '缓存预报' : '逐小时预报', w.source === 'demo' ? 'amber' : '')}</div><div class="weather-main"><div><div class="temperature">${round(d.min)}<span>–</span>${round(d.max)}<span>°C</span></div><p class="weather-description">${weatherLabel(morning.code)} · 全天温差 ${round(d.range)}°C</p>${w.source === 'live' && Number.isFinite(w.current?.temperature_2m) ? `<p class="current-temperature">当前估计 ${round(w.current.temperature_2m)}°C · ${escapeHTML(w.current.time?.slice(11,16) || '')}</p>` : ''}</div>${weatherArt()}</div><div class="weather-stats"><span>${icon('drop')}出门湿度 ${round(morning.humidity)}%</span><span>${icon('wind')}风速 ${morning.wind.toFixed(1)} m/s</span><span>${icon('moon')}返程体感 ${round(evening.apparent)}°</span></div><div class="hourly-strip">${stamps.map(time => { const p = weatherAt(w,state.date,time); return `<div class="hour-block ${[state.profile.departure,state.profile.returning].includes(time) ? 'route-hour' : ''}"><span>${time}</span>${icon(weatherIcon(p.code, Number(time.slice(0,2))))}<strong>${round(p.temperature)}°</strong></div>`; }).join('')}</div><p class="location-caption">${escapeHTML(state.profile.city.region)} · ${['device','coordinates'].includes(state.profile.city.kind) ? '按近似位置查询天气网格' : '按城市中心坐标查询'}${state.profile.city.accuracyMeters > 5000 ? ' · 设备定位误差较大，可手动调整' : ''}</p><div class="weather-source"><span>${w.source === 'demo' ? '假设数据 · 仅用于体验' : `Open-Meteo · ${sourceTime()} 更新 · ${escapeHTML(w.timezone || state.profile.city.timezone)}`}</span><button class="text-button" data-action="refresh" ${state.loading ? 'disabled' : ''}>${state.loading ? '更新中…' : '刷新'} ${icon('refresh')}</button></div></section>`;
}
function outfitPanel(result, plan) {
  const pieces = [...plan.items.map((item,index) => ({ item, role: index === 0 ? '内搭' : item === plan.middle ? '中间层' : '外套' })), ...[result.bottom && { item: result.bottom, role: '下装' }, result.shoes && { item: result.shoes, role: '鞋' }].filter(Boolean)];
  const indoor = plan.scenes.find(s => s.kind === 'indoor');
  const mainText = indoor && indoor.worn.length < plan.items.length ? `通勤穿好外层，到${sceneNames[state.profile.scene]}后可脱下${plan.items.filter(i => !indoor.worn.includes(i.id)).map(displayName).join('、')}。` : plan.items.length === 1 ? '以轻便穿着为主，结合当天活动调整。' : '室内外穿着分别评估，优先兼顾舒适与穿脱便利。';
  const saved = state.savedPlans.find(p => p.date === state.date && p.locationKey === locationKey());
  return `<section class="panel outfit-panel"><div class="panel-title"><h2>${icon('hanger')}${relativeLabel(state.date)}拿这些，就出发</h2><span class="score-label">方案适配 <b>${plan.score}</b><span>/100</span></span></div><div class="outfit-kicker">${pill(state.manualBias > 0 ? '已调暖' : state.manualBias < 0 ? '已调清爽' : '为你的日程搭配')}<span>${pieces.length} 类衣物 · ${state.profile.sensitivity === 'normal' ? '普通冷暖偏好' : state.profile.sensitivity === 'cold' ? '偏怕冷' : '偏怕热'}</span></div><div class="outfit-canvas outfit-count-${pieces.length}">${pieces.map(({item,role}) => `<div class="garment-tile"><div class="garment-art">${garment(item)}</div><p class="garment-role">${role}</p><p class="garment-name">${escapeHTML(displayName(item))}</p>${item.alias ? `<p class="garment-alias">${escapeHTML(item.name)}</p>` : ''}</div>`).join('')}</div><div class="outfit-message">${icon('leaf')}<span>${escapeHTML(mainText)}</span></div><div class="outfit-actions"><div class="adjust-actions"><button class="mini-button" data-action="warmer">＋ 暖一点</button><button class="mini-button" data-action="cooler">－ 清爽些</button><button class="mini-button" data-action="alternative">${icon('refresh')}换一套</button>${state.manualBias ? '<button class="mini-button" data-action="reset-bias">还原</button>' : ''}</div><button class="primary-button" data-action="save-plan">${icon(saved?.planId === plan.id ? 'check' : 'heart')}${saved?.planId === plan.id ? '已记下这套' : '就穿这套'}</button></div></section>`;
}
function timelinePanel(result, plan) {
  const blocks = [];
  for (const [scope, glyph, time, title] of [['morning','sun',state.profile.departure,'早晨出门'],['indoor','book','白天','室内安排'],['evening','moon',state.profile.returning,'晚间返程']]) {
    const scenes = plan.scenes.filter(s => s.scope === scope); if (!scenes.length) continue;
    const s = scenes[0];
    let text, meta;
    if (scope === 'indoor') {
      const worn = plan.items.filter(i => s.worn.includes(i.id)), removed = plan.items.filter(i => !s.worn.includes(i.id));
      text = state.profile.scene === 'outdoors' ? `白天户外：${worn.map(displayName).join('＋')}。` : `${removed.length ? `脱下${removed.map(displayName).join('、')}，` : ''}保留${worn.map(displayName).join('＋')}。`;
      meta = s.kind === 'indoor' ? `${result.indoor.label} · ${result.indoor.estimated ? '估计' : '你设置'} ${round(result.indoor.temperature)}°C` : `户外体感 ${round(s.apparent)}°C`;
    } else { text = plan.items.length > 1 ? `穿好${plan.items.slice(1).map(displayName).join('＋')}，按${transportNames[state.profile.transport]}出行。` : `穿${displayName(plan.base)}，轻便出行。`; meta = `室外 ${round(s.temperature)}° · 体感 ${round(s.apparent)}° · ${weatherLabel(s.code)}`; }
    const worst = scenes.reduce((a,b) => a.loss > b.loss ? a : b);
    blocks.push(`<div class="timeline-row"><div class="timeline-symbol">${icon(glyph)}</div><div><div class="timeline-header"><strong>${scope === 'indoor' ? escapeHTML(sceneNames[state.profile.scene]) : title}</strong><time>${time}</time></div><p>${escapeHTML(text)}</p><div class="timeline-weather">${escapeHTML(meta)}</div>${worst.comfort !== '较合适' ? `<p class="comfort-warn">${worst.comfort}，可尝试调整方案。</p>` : ''}</div></div>`);
  }
  return `<section class="panel panel-padding timeline-panel"><div class="panel-title"><h2>${icon('clock')}一天，刚好衔接</h2></div><div class="timeline-list">${blocks.join('')}</div></section>`;
}
function journeyPanel(result) {
  return `<section class="panel panel-padding"><div class="panel-title"><h2>${icon('calendar')}你的日常安排</h2><a class="text-button" href="#journey">修改 ${icon('chevron')}</a></div><div class="journey-summary">${pill(transportNames[state.profile.transport])}${pill(sceneNames[state.profile.scene], 'gray')}</div><p class="journey-line"><strong>${state.profile.departure}</strong> 出门 <span class="muted">→</span> <strong>${state.profile.returning}</strong> 开始返程</p><p class="journey-line">${state.profile.transport === 'ebike' ? `单程电瓶车 ${state.profile.ridingMinutes} 分钟 · ` : ''}步行 ${state.profile.walkingMinutes} 分钟</p><p class="small muted" style="margin-top:9px">${result.indoor.estimated ? '室内为场景估计，可在日程中填写实际温度。' : '室内按你填写的温度评估。'}</p></section>`;
}
function reasonsPanel(result, plan) {
  const morning = plan.scenes.find(s => s.scope === 'morning'), evening = plan.scenes.find(s => s.scope === 'evening');
  const reasons = [
    `重点看你真正出门的时段：${state.profile.departure} 体感约 ${round(morning.apparent)}°C，${state.profile.returning} 约 ${round(evening.apparent)}°C。`,
    state.profile.scene === 'outdoors' ? '白天以户外活动评估，同时比较午间两个时段的适配情况。' : `${sceneNames[state.profile.scene]}按“${result.indoor.label}”评估，${result.indoor.estimated ? '温度为估计，' : ''}单独检查脱下外层后是否合适。`,
    plan.middle ? `${displayName(plan.middle)}可以保留在中间层；摇粒绒按你的设置只作最外层。` : '从你启用的衣物中选择，并检查穿法与组合兼容性。',
  ];
  const rain = Math.max(...result.scenarios.map(s => s.rain || 0));
  const accessories = [];
  if (rain >= 40) accessories.push(state.profile.transport === 'ebike' ? `通勤降水概率最高约 ${round(rain)}%，考虑适合骑行的雨具；步行段可备伞。` : `降水概率最高约 ${round(rain)}%，出门前考虑雨具。`);
  if (Math.min(morning.apparent, evening.apparent) < 5) accessories.push('可评估手套与围巾；它们是补充类别建议，尚未确认你是否拥有。');
  const [a,b,c] = state.profile.weights;
  return `<section class="panel panel-padding"><div class="panel-title"><h2>${icon('info')}为什么这样穿</h2><button class="text-button" data-action="copy-plan">${icon('copy')}复制清单</button></div><div class="reason-list">${reasons.map((r,i) => `<div class="reason-item"><span class="reason-number">0${i+1}</span><p>${escapeHTML(r)}</p></div>`).join('')}</div>${[...accessories,...result.warnings].map(w => `<div class="warning">${escapeHTML(w)}</div>`).join('')}<details class="details-model"><summary>查看推荐依据与权重</summary><p>适配分用于比较候选方案，不代表准确率。保暖等级和室内温度采用可校准的经验参数；体感温度已包含天气风、湿度等影响，系统不重复叠加。风速另用于检查外层的防风适用性。</p><div class="weight-bars">${[['整体舒适',a],['最不适时段',b],['穿脱与携带',c]].map(([name,w]) => `<div class="weight-bar"><span>${name} ${w}%</span><i style="width:${w}%"></i></div>`).join('')}</div><p>通勤与主要室内场景分别评估，短时通勤保留必要影响力。你的反馈只校准相应场景与相近冷暖条件。</p></details></section>`;
}
function adviceView() {
  const heading = pageHeading(`${relativeLabel(state.date)}，穿得刚刚好。`, '天气会变，出门前的选择可以简单一点。', 'A GOOD DAY STARTS THE NIGHT BEFORE', true) + trialIntro();
  if (!state.weather) return heading + sourceBanner() + emptyWeather() + footer();
  const result = calculate();
  if (!result?.plans.length) return heading + sourceBanner() + `<section class="panel empty-panel">${icon('hanger')}<h2>还需要一点信息</h2><p>${escapeHTML(result?.error || '请补充可用衣物。')}</p><div class="empty-actions"><a href="#wardrobe" class="primary-button">设置我的衣物</a><button class="quiet-button" data-action="refresh">刷新天气</button></div></section>` + footer();
  const plan = selectedPlan(result);
  return heading + sourceBanner() + `<div class="dashboard-grid"><div class="primary-column">${outfitPanel(result,plan)}${weatherPanel()}${reasonsPanel(result,plan)}</div><aside class="secondary-column">${timelinePanel(result,plan)}${journeyPanel(result)}<section class="panel note-card"><div class="eyebrow">A NOTE FOR TOMORROW</div><h3>舒适，也是一种准备。</h3><p>把衣服提前放好，给明天的自己留一点从容。</p><button class="text-button" data-action="demo" style="margin-top:12px">试试不同天气 ${icon('arrow')}</button></section><section class="panel panel-padding"><div class="panel-title"><h2>${icon('heart')}穿过以后，你说了算</h2></div><p class="small muted">今天哪里偏冷或偏热？记录实际穿着，让建议逐步贴近你的感受。</p><button class="quiet-button full-button" style="margin-top:15px" data-action="feedback">记录今天的感受 ${icon('arrow')}</button></section></aside></div>` + footer();
}
function options(values,current) { return values.map(([value,label]) => `<option value="${value}" ${String(current) === String(value) ? 'selected' : ''}>${escapeHTML(label)}</option>`).join(''); }
function journeyView() {
  const p = state.profile;
  return pageHeading('让建议，跟着你的日常走。','常用安排保存一次；临时有变化时，再修改。','YOUR ROUTINE, YOUR COMFORT') + `<div class="settings-layout"><form id="journey-form" class="panel"><section class="form-section"><h2>出门与返程</h2><p>关注你实际经历的天气，而不只看全天最高、最低温。</p><div class="form-grid"><label class="field">出门时间<input type="time" name="departure" value="${p.departure}" required></label><label class="field">开始返程的时间<input type="time" name="returning" value="${p.returning}" required><small>这里是出发返程时间，不是到家时间。</small></label><label class="field full">出行方式<select name="transport">${options(Object.entries(transportNames),p.transport)}</select></label><label class="field">单程电瓶车时长（分钟）<input type="number" name="ridingMinutes" min="0" max="180" step="1" value="${p.ridingMinutes}" required><small>选择其他出行方式时不计入。</small></label><label class="field">单程步行时长（分钟）<input type="number" name="walkingMinutes" min="0" max="180" step="1" value="${p.walkingMinutes}" required></label></div></section><section class="form-section"><h2>白天主要在哪里</h2><p>室内冷暖与室外天气分别评估。</p><div class="form-grid"><label class="field">主要场景<select name="scene">${options(Object.entries(sceneNames),p.scene)}</select></label><label class="field">室内环境<select name="indoorMode">${options([['seasonal','随冷暖切换：空调偏冷／供暖不足'],['ac','空调偏冷'],['heating','供暖不足'],['normal','普通室内'],['warm','温暖室内'],['manual','我知道实际温度']],p.indoorMode)}</select></label><label class="field">实际室内温度（°C）<input type="number" name="indoorTemperature" min="0" max="40" step="0.5" value="${p.indoorTemperature}" required><small>仅在“我知道实际温度”时使用。</small></label><label class="field">个人冷暖偏好<select name="sensitivity">${options([['cold','偏怕冷'],['normal','普通'],['hot','偏怕热']],p.sensitivity)}</select></label></div></section><section class="form-section"><h2>推荐侧重</h2><p>原型初值为 50／30／20，保存时自动换算为合计 100%。</p><div class="form-grid"><label class="field">整体舒适<input type="number" name="weightComfort" min="0" max="100" value="${p.weights[0]}" required></label><label class="field">最不适时段<input type="number" name="weightWorst" min="0" max="100" value="${p.weights[1]}" required></label><label class="field">穿脱与携带<input type="number" name="weightConvenience" min="0" max="100" value="${p.weights[2]}" required></label></div></section><div class="form-actions"><div><p class="form-help">日程、衣物与反馈保存在此浏览器。</p><p class="form-error" id="journey-error" role="alert"></p></div><button type="submit" class="primary-button">保存日常安排 ${icon('check')}</button></div></form><aside class="secondary-column"><section class="panel panel-padding"><div class="panel-title"><h2>${icon('pin')}当前城市</h2></div><h3 style="font-size:22px;margin-bottom:10px">${escapeHTML(p.city.name)}</h3><p class="small muted">${escapeHTML(p.city.region)}<br>时区：${escapeHTML(p.city.timezone)}</p><button class="quiet-button full-button" style="margin-top:20px" data-action="city">切换城市</button></section><section class="panel note-card"><div class="eyebrow">A LITTLE CONTEXT</div><h3>同一天，不止一种温度。</h3><p>电瓶车、步行和长时间室内停留，分别有不同的穿着需求。室内估计不是实测温度，你可以随时修正。</p></section></aside></div>` + footer();
}
function wardrobeView() {
  const groups = [['all','全部'],['base','内搭'],['warm','保暖层'],['outer','外套'],['bottom','下装'],['shoes','鞋']];
  const filtered = state.wardrobe.filter(i => state.filter === 'all' || i.group === state.filter);
  return pageHeading('从你的衣柜，找到答案。','先选已有类别，再为常穿的衣服起个名字。','A WARDROBE THAT KNOWS YOU') + `<div class="wardrobe-notice">抓绒外套：可单穿、可作中间层。摇粒绒外套：按你的穿法只作最外层。薄款和厚款羽绒服分别参与推荐。其余为可调整的通用类别，请取消没有的衣物。</div><div class="wardrobe-header"><div class="wardrobe-filters" role="group" aria-label="按衣物类型筛选">${groups.map(([id,name]) => `<button class="filter-button ${state.filter === id ? 'active' : ''}" data-action="filter" data-filter="${id}" aria-pressed="${state.filter === id}">${name}</button>`).join('')}</div><button class="quiet-button" data-action="add-item">${icon('plus')}添加衣物</button></div><div class="wardrobe-grid">${filtered.map(item => `<article class="wardrobe-card ${item.enabled ? '' : 'disabled'}"><div class="wardrobe-image">${garment(item)}${pill(item.confirmed ? '已知类别' : '可选类别', 'gray')}</div><div class="wardrobe-info"><h3>${escapeHTML(displayName(item))}</h3><p>${item.alias ? `${escapeHTML(item.name)} · ` : ''}${escapeHTML(item.detail)}</p><div class="wardrobe-card-footer"><label class="toggle-label"><input type="checkbox" data-item-toggle="${item.id}" ${item.enabled ? 'checked' : ''} aria-label="将${escapeHTML(displayName(item))}纳入推荐">纳入推荐</label><button class="text-button" data-action="edit-item" data-id="${item.id}" aria-label="编辑${escapeHTML(displayName(item))}">${icon('edit')}</button></div></div></article>`).join('')}</div>` + footer();
}
function historyView() {
  const plans = [...state.savedPlans].reverse(), feedback = [...state.feedback].reverse();
  return pageHeading('舒服与否，你的感受最重要。','保存准备穿的方案，也记录真正穿过之后的感受。','A LITTLE MORE YOU, EVERY DAY') + `<div class="wardrobe-header"><span class="small muted">${plans.length} 套已保存计划 · ${feedback.length} 条实际反馈</span><button class="primary-button" data-action="feedback">${icon('plus')}记录穿着感受</button></div><div class="settings-layout"><section class="history-list">${plans.length ? plans.map(p => `<article class="panel history-card"><div class="history-top"><span>${escapeHTML(p.date)} · ${escapeHTML(p.city)}</span>${pill(p.source === 'demo' ? '演示计划' : '穿衣计划', p.source === 'demo' ? 'amber' : '')}</div><h3>${p.items.map(i => escapeHTML(i.name)).join(' ＋ ')}</h3><p>计划已保存；实际穿着请在反馈时确认。</p></article>`).join('') : `<div class="panel empty-panel">${icon('hanger')}<h2>把明天的准备记下来</h2><p>在推荐页点击“就穿这套”，这里就会留下你的穿衣计划。</p><a href="#outfit" class="primary-button">去看看推荐 ${icon('arrow')}</a></div>`}</section><aside class="history-list">${feedback.length ? feedback.map(f => `<article class="panel history-card"><div class="history-top"><span>${escapeHTML(f.date)}</span>${pill(['冷','偏冷','舒适','偏热','热'][Number(f.value)+2])}</div><h3>${scopeNames[f.scope]}</h3><p>${escapeHTML(f.actualText || f.actualItems?.join('＋') || '')}</p><p class="small muted" style="margin-top:9px">已用于相应场景的偏好校准</p></article>`).join('') : `<section class="panel note-card"><div class="eyebrow">YOUR FEEDBACK MATTERS</div><h3>图书馆冷，还是返程冷？</h3><p>反馈会区分时段与相近冷暖条件，避免一次室内偏冷就把全天衣服都加厚。</p></section>`}</aside></div>` + footer();
}
function render({ preserveForm = false } = {}) {
  if (preserveForm && state.view === 'journey' && $('#journey-form')) return;
  $('#app').innerHTML = header();
  $('#main').innerHTML = ({outfit:adviceView,journey:journeyView,wardrobe:wardrobeView,history:historyView}[state.view] || adviceView)();
}
let controller;
async function refreshWeather() {
  controller?.abort(); controller = new AbortController();
  const request = ++state.request, city = clone(state.profile.city);
  state.loading = true; state.error = ''; render({ preserveForm: true });
  try {
    const weather = await fetchForecast(city, AbortSignal.any([controller.signal, AbortSignal.timeout(24000)]));
    if (request !== state.request) return;
    const selection = forecastSelection(state.profile.city, state.date, weather.timezone);
    state.profile.city = selection.city; state.date = selection.date;
    state.weather = weather; state.planId = ''; persist();
  } catch (error) {
    if (request !== state.request) return;
    state.error = error.name === 'TimeoutError' || error.name === 'AbortError' ? '获取天气超时，请稍后重试。' : '暂时无法连接天气服务。';
    if (state.weather?.source === 'live') state.weather.cached = true;
  } finally { if (request === state.request) { state.loading = false; render({ preserveForm: true }); } }
}
function modal(title, content) {
  const node = $('#modal');
  node.innerHTML = `<div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭弹窗">${icon('close')}</button></div><div class="modal-content">${content}</div>`;
  if (!node.open) node.showModal();
}
function cityModal() {
  modal('选择你所在的位置', `<p class="modal-description">搜索城市使用城市中心坐标；设备定位或经纬度选点可查询小地方附近的天气网格。</p><section class="location-choice"><button class="primary-button full-button" data-action="locate">${icon('pin')}使用当前位置</button><p>点击后请求一次定位，近似坐标保留两位小数并发送给 Open-Meteo 查询天气；不持续追踪。</p><p class="form-error" id="location-status" role="status" aria-live="polite"></p></section><form id="city-search" class="search-row"><input class="search-input" name="query" aria-label="搜索城市" placeholder="搜索城市、区县，例如苏州、东京…" minlength="2" required><button class="primary-button" type="submit">搜索</button></form><div id="city-results"></div><p class="small muted" style="margin:16px 0 10px">常用城市</p><div class="city-grid">${CITIES.map((c,i) => `<button class="city-option" data-action="preset-city" data-index="${i}">${c.name}</button>`).join('')}</div><details class="coordinate-details"><summary>找不到地点？手动填写经纬度</summary><form id="coordinate-form" class="modal-form"><label class="field">位置名称（可选）<input name="placeName" maxlength="30" placeholder="例如：我的小镇"></label><div class="form-grid"><label class="field">纬度<input name="latitude" type="number" min="-90" max="90" step="any" required placeholder="例如 32.06"></label><label class="field">经度<input name="longitude" type="number" min="-180" max="180" step="any" required placeholder="例如 118.78"></label></div><p class="form-help">使用 WGS84 经纬度。位置会取近似值发送给天气服务，时区由预报接口识别。定位受限时，也可直接搜索附近城市。</p><p class="form-error" id="coordinate-error" role="alert"></p><button class="primary-button full-button" type="submit">使用这个位置</button></form></details>`);
}
let locationRequest = 0;
$('#modal').addEventListener('close', () => { locationRequest++; });
async function useDeviceLocation() {
  const token = ++locationRequest, button = $('#modal [data-action="locate"]'), status = $('#location-status');
  button.disabled = true; status.textContent = '等待定位授权与位置结果…';
  try {
    const city = await locateOnce();
    if (token !== locationRequest || !$('#modal').open) return;
    chooseCity(city);
    toast(city.accuracyMeters > 5000 ? '设备定位误差较大，可手动选择更合适的位置。' : '已使用近似位置，正在同步附近网格的天气。');
  } catch (error) {
    if (token === locationRequest && $('#modal').open) { status.textContent = error.message; button.disabled = false; }
  }
}
function chooseCity(city) {
  state.profile.city = clone(city); state.date = addDays(localDate(city.timezone),1); state.weather = null; state.error = ''; state.planId = ''; state.manualBias = 0;
  $('#modal').close(); persist(); render(); refreshWeather();
}
function demoModal() {
  modal('用假设天气，试试推荐', `<p class="modal-description">以下是模拟情境，不代表所选城市的实际天气。选择后，页面会持续标明“演示天气”。</p><div class="demo-grid">${[['autumn','春秋 · 早晚温差大','早晚偏凉，午间温和'],['summer','夏季 · 室外热，空调冷','透气穿着与室内长袖层'],['winter','冬季 · 低温伴随风','抓绒与薄、厚羽绒分别评估'],['rain','阴雨 · 潮湿有风','关注通勤外层与雨具']].map(([id,name,desc]) => `<button class="demo-option" data-action="use-demo" data-kind="${id}"><span>${name}<small>${desc}</small></span>${icon('arrow')}</button>`).join('')}</div>`);
}
function editItemModal(id) {
  const item = state.wardrobe.find(i => i.id === id); if (!item) return;
  const canEditRole = ['warm','outer'].includes(item.group);
  modal('让类别，对应你那一件', `<p class="modal-description">${escapeHTML(item.name)}。保暖与防风均为相对估计，可结合实际感受调整。</p><form id="edit-item-form" class="modal-form" data-id="${item.id}"><label class="field">你给它起的名字<input name="alias" maxlength="30" value="${escapeHTML(item.alias || '')}" placeholder="例如：灰绿色拉链抓绒"></label><div class="form-grid"><label class="field">相对保暖等级<input type="number" name="warmth" min="0.05" max="3" step="0.01" value="${item.warmth.toFixed(2)}" required><small>经验参数，用于衣物之间比较。</small></label>${canEditRole ? `<label class="field">防风能力<select name="wind">${options([[.2,'较弱／暂不确定'],[.65,'一般'],[.95,'较强']],Math.abs(item.wind-.95)<.1?.95:Math.abs(item.wind-.65)<.15?.65:.2)}</select></label>` : ''}</div>${canEditRole ? `<label class="checkbox-row"><input type="checkbox" name="canMid" ${item.roles.includes('mid') ? 'checked' : ''}>这件衣服能舒服地穿在其他外套里面。<br>摇粒绒按你目前的穿法保持不勾选。</label>` : ''}<label class="checkbox-row"><input type="checkbox" name="enabled" ${item.enabled ? 'checked' : ''}>我有这类衣物，而且当前可以穿。</label><button class="primary-button full-button" type="submit">保存衣物设置 ${icon('check')}</button></form>`);
}
function addItemModal() {
  modal('添加一件常用衣物', `<p class="modal-description">选择最接近的类别，再填写你容易认出的名字；保存后可以继续调整。</p><form id="add-item-form" class="modal-form"><label class="field">衣物类别<select name="template">${CATALOG.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select></label><label class="field">衣物名称<input name="alias" maxlength="30" placeholder="例如：米色短款羽绒服" required></label><button class="primary-button full-button" type="submit">添加到我的衣物 ${icon('plus')}</button></form>`);
}
function feedbackModal() {
  const today = localDate(state.profile.city.timezone);
  modal('今天穿着，感觉怎么样？', `<p class="modal-description">先确认实际穿着，再告诉我哪个场景不舒服。每个日期、城市、场景只保留一条反馈，重复提交会更新。</p><form id="feedback-form" class="modal-form"><div class="form-grid"><label class="field">实际穿着日期<input type="date" name="date" min="${addDays(today,-30)}" max="${today}" value="${today}" required></label><label class="field">发生在哪个场景<select name="scope">${options(Object.entries(scopeNames),'indoor')}</select></label></div><label class="field">当时的天气类型<select name="season">${options([['cold','偏冷天气'],['mild','温和天气'],['hot','炎热天气']],state.result?.season || 'mild')}</select></label><fieldset style="border:0;padding:0;margin:0"><legend class="small muted" style="margin-bottom:9px">你的冷暖感受</legend><div class="radio-group">${[[-2,'冷'],[-1,'偏冷'],[0,'舒适'],[1,'偏热'],[2,'热']].map(([v,l]) => `<label class="radio-option"><input type="radio" name="value" value="${v}" ${v===0?'checked':''}>${l}</label>`).join('')}</div></fieldset><label class="checkbox-row"><input type="checkbox" name="followed">我当天确实按已保存的方案穿着。<br>需要该日期、城市有已保存的方案。</label><label class="field">实际穿了什么<textarea name="actualText" maxlength="200" placeholder="没有保存方案，或换过衣服时，请填写实际穿着。"></textarea></label><p class="form-error" id="feedback-error" role="alert"></p><button type="submit" class="primary-button full-button">保存实际感受 ${icon('heart')}</button></form>`);
}
let generatedReport = '';
function trialFeedbackModal() {
  modal('把试用意见，留给下一版', `<p class="modal-description">这里收集产品问题与改进建议。生成意见单后，复制或下载，再发给邀请你试用的人；不会自动上传。</p><form id="trial-form" class="modal-form"><label class="field">意见类型<select name="category">${options([['天气或定位','天气或定位'],['穿衣建议','穿衣建议'],['页面与操作','页面与操作'],['其他','其他']],'天气或定位')}</select></label><label class="field">遇到了什么问题，或有什么建议？<textarea name="content" minlength="3" maxlength="2000" required placeholder="例如：定位失败，但搜索城市可以使用。"></textarea></label><label class="field">你希望怎样改进？（可选）<textarea name="expected" maxlength="1000" placeholder="也可以补充你期望得到的穿衣建议。"></textarea></label><label class="checkbox-row"><input name="includeContext" type="checkbox" checked>附上当前地点名称、天气来源状态和版本。<br>不含坐标、衣橱、日程与个人冷暖记录。</label><p class="form-error" id="trial-error" role="alert"></p><button class="primary-button full-button" type="submit">生成可分享的意见单 ${icon('arrow')}</button></form>`);
}
function reportPreview() {
  modal('意见单已生成', `<p class="modal-description">请检查文字后复制或下载，发给邀请你试用的人。意见单尚未发送给站主。</p><label class="field">试用意见单<textarea id="report-preview" rows="11" readonly>${escapeHTML(generatedReport)}</textarea></label><div class="report-actions"><button class="primary-button" data-action="copy-report">${icon('copy')}复制意见单</button><button class="quiet-button" data-action="download-report">下载文本文件</button></div>`);
}
async function copyReport() {
  try { await navigator.clipboard.writeText(generatedReport); toast('意见单已复制，可发送给邀请你试用的人。'); }
  catch { $('#report-preview')?.focus(); $('#report-preview')?.select(); toast('请长按或手动复制选中的意见单。'); }
}
function downloadReport() {
  const url = URL.createObjectURL(new Blob(['\uFEFF', generatedReport], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `明日衣序-试用意见-${localDate(state.profile.city.timezone)}.txt`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已生成文本文件，可发送给邀请你试用的人。');
}
function savePlan() {
  const result = calculate(), plan = selectedPlan(result); if (!plan) return;
  const record = { date: state.date, locationKey: locationKey(), city: state.profile.city.name, planId: plan.id, source: state.weather.source, season: result.season, items: [...plan.items,result.bottom,result.shoes].filter(Boolean).map(i => ({id:i.id,name:displayName(i)})), savedAt: new Date().toISOString() };
  state.savedPlans = state.savedPlans.filter(p => !(p.date === record.date && p.locationKey === record.locationKey)); state.savedPlans.push(record); persist(); render(); toast('这套已记下。实际穿过后，可以再记录感受。');
}
async function copyPlan() {
  const result = calculate(), plan = selectedPlan(result); if (!plan) return;
  const text = `${state.date} ${state.profile.city.name}${state.weather.source==='demo'?'（演示天气）':''}\n准备：${[...plan.items,result.bottom,result.shoes].filter(Boolean).map(displayName).join('、')}\n出门 ${state.profile.departure} · 开始返程 ${state.profile.returning}\n由「明日衣序」整理`;
  try { await navigator.clipboard.writeText(text); toast('拿衣清单已复制。'); } catch { modal('你的拿衣清单', `<p class="modal-description">可以选中下方文字手动复制。</p><label class="field">清单<textarea readonly rows="6">${escapeHTML(text)}</textarea></label>`); }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'city') cityModal();
  else if (action === 'locate') useDeviceLocation();
  else if (action === 'trial-feedback') trialFeedbackModal();
  else if (action === 'copy-report') copyReport();
  else if (action === 'download-report') downloadReport();
  else if (action === 'setup-done') { state.profile.trialSetupDone=true; persist(); render(); toast('设置完成，可以开始按自己的日常使用。'); }
  else if (action === 'close-modal') $('#modal').close();
  else if (action === 'refresh') refreshWeather();
  else if (action === 'demo') demoModal();
  else if (action === 'use-demo') {
    controller?.abort(); state.request++; state.loading=false; state.error=''; state.weather=makeDemoWeather(state.date,button.dataset.kind,state.profile.city.timezone); state.planId=''; state.manualBias=0; $('#modal').close(); render();
  } else if (action === 'preset-city') chooseCity(CITIES[Number(button.dataset.index)]);
  else if (action === 'search-city') chooseCity(state.cityResults[Number(button.dataset.index)]);
  else if (action === 'warmer' || action === 'cooler') { state.manualBias=clamp(state.manualBias+(action==='warmer'?.18:-.18),-.72,.72); state.planId=''; render(); toast(action==='warmer'?'已提高保暖侧重。':'已调向更清爽的组合。'); }
  else if (action === 'reset-bias') { state.manualBias=0; state.planId=''; render(); }
  else if (action === 'alternative') { const result=calculate(); if(!result?.plans.length)return; const index=result.plans.findIndex(p=>p.id===selectedPlan(result).id); state.planId=result.plans[(index+1)%Math.min(result.plans.length,8)].id; render(); toast('已换成另一套可用组合，留意各时段提示。'); }
  else if (action === 'save-plan') savePlan();
  else if (action === 'copy-plan') copyPlan();
  else if (action === 'filter') {state.filter=button.dataset.filter;render();}
  else if (action === 'edit-item') editItemModal(button.dataset.id);
  else if (action === 'add-item') addItemModal();
  else if (action === 'feedback') feedbackModal();
});
document.addEventListener('change', event => {
  if (event.target.id === 'selected-date') {
    const next = event.target.value, today=localDate(state.profile.city.timezone);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || next<today || next>addDays(today,3)) {toast('请选择今天至未来三天内的日期。');render();return;}
    state.date=next;state.planId='';state.manualBias=0;
    if(state.weather?.source==='demo')state.weather=makeDemoWeather(next,state.weather.demoKind,state.profile.city.timezone);
    render();
  }
  if(event.target.dataset.itemToggle){const item=state.wardrobe.find(i=>i.id===event.target.dataset.itemToggle);if(item){item.enabled=event.target.checked;state.planId='';persist();render();}}
});
document.addEventListener('submit', async event => {
  const form=event.target; event.preventDefault(); const data=new FormData(form);
  if(form.id==='coordinate-form'){
    try { chooseCity(coordinateLocation(data.get('latitude'), data.get('longitude'), {name:String(data.get('placeName')||'')})); }
    catch(error) { $('#coordinate-error').textContent=error.message; }
  }else if(form.id==='trial-form'){
    try {
      generatedReport=trialReport({category:data.get('category'),content:data.get('content'),expected:data.get('expected'),context:data.has('includeContext')?{placeName:state.profile.city.name,source:state.weather?.source||'none',cached:!!state.weather?.cached,weatherUpdatedAt:state.weather?.updatedAt}:null});
      reportPreview();
    }catch(error){$('#trial-error').textContent=error.message;}
  }else if(form.id==='city-search'){
    const button=form.querySelector('button');button.disabled=true;button.textContent='搜索中…';
    try{state.cityResults=await searchCities(String(data.get('query')));$('#city-results').innerHTML=state.cityResults.length?`<div class="search-results">${state.cityResults.map((c,i)=>`<button class="search-result" data-action="search-city" data-index="${i}"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.region)} · ${escapeHTML(c.timezone)}</small></button>`).join('')}</div>`:'<p class="small muted">没有找到匹配城市，可以试试拼音、英文名或加上省份。</p>';}
    catch{$('#city-results').innerHTML='<p class="form-error">城市搜索暂时不可用，请稍后重试。常用城市可关闭后重新选择。</p>';}
    finally{button.disabled=false;button.textContent='搜索';}
  }else if(form.id==='journey-form'){
    if(String(data.get('returning'))<=String(data.get('departure'))){$('#journey-error').textContent='第一版请将返程设在同一天、晚于出门；单段通勤跨午夜可以处理。';return;}
    const ws=['weightComfort','weightWorst','weightConvenience'].map(k=>Number(data.get(k)));const total=ws.reduce((a,b)=>a+b,0);
    if(total<=0){$('#journey-error').textContent='至少一个评分权重需要大于 0。';return;}
    const weights=normalizeWeights(ws);
    const nextProfile={...state.profile};
    for(const key of ['departure','returning','transport','scene','indoorMode','sensitivity'])nextProfile[key]=String(data.get(key));
    for(const key of ['ridingMinutes','walkingMinutes','indoorTemperature'])nextProfile[key]=Number(data.get(key));
    if(nextProfile.transport==='ebike'&&nextProfile.ridingMinutes+nextProfile.walkingMinutes===0){$('#journey-error').textContent='请至少填写一段非零通勤时长。';return;}
    nextProfile.weights=weights;state.profile=nextProfile;state.manualBias=0;state.planId='';persist();toast('日常安排已保存，推荐会按新安排更新。');location.hash='outfit';if(state.view==='outfit')render();
  }else if(form.id==='edit-item-form'){
    const item=state.wardrobe.find(i=>i.id===form.dataset.id);if(!item)return;
    item.alias=String(data.get('alias')).trim();item.enabled=data.has('enabled');item.warmth=Number(data.get('warmth'));
    if(['warm','outer'].includes(item.group)){item.wind=Number(data.get('wind'));item.roles=item.roles.filter(r=>r!=='mid');if(data.has('canMid'))item.roles.push('mid');item.detail=item.roles.includes('mid')?'可作中间层 · 按你的设置搭配':'仅作最外层';}
    state.planId='';persist();$('#modal').close();render();toast('衣物设置已保存。');
  }else if(form.id==='add-item-form'){
    const template=CATALOG.find(i=>i.id===data.get('template'));if(!template)return;
    state.wardrobe.push({...clone(template),id:`custom-${crypto.randomUUID()}`,alias:String(data.get('alias')).trim(),enabled:true,confirmed:false});persist();$('#modal').close();render();toast('衣物已加入，可以继续编辑厚薄与穿法。');
  }else if(form.id==='feedback-form'){
    const date=String(data.get('date'));const saved=state.savedPlans.find(p=>p.date===date&&p.locationKey===locationKey());const actualText=String(data.get('actualText')).trim();
    if(date>localDate(state.profile.city.timezone)){$('#feedback-error').textContent='请记录已经实际穿过的日期。';return;}
    if(data.has('followed')&&!saved){$('#feedback-error').textContent='这个日期、城市没有保存方案，请填写实际穿着并取消勾选。';return;}
    if(!data.has('followed')&&!actualText){$('#feedback-error').textContent='请填写实际穿着，或确认当天确实按保存方案穿了。';return;}
    const row={date,scope:String(data.get('scope')),season:String(data.get('season')),value:Number(data.get('value')),actualText,actualConfirmed:true,actualItems:data.has('followed')?saved.items.map(i=>i.name):[],locationKey:locationKey(),createdAt:new Date().toISOString()};
    state.feedback=state.feedback.filter(f=>!(f.date===date&&f.scope===row.scope&&f.locationKey===row.locationKey));state.feedback.push(row);persist();$('#modal').close();state.planId='';render();toast('感受已记录，只校准相应场景与相近冷暖条件。');
  }
});
function navigate(){const next=location.hash.slice(1);if(next==='main'){$('#main')?.focus();return;}state.view=['outfit','journey','wardrobe','history'].includes(next)?next:'outfit';render();window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',navigate);
function refreshVisibleForecast() {
  if (document.visibilityState === 'visible' && !state.loading && !state.error && forecastNeedsRefresh(state.weather)) refreshWeather();
}
document.addEventListener('visibilitychange',refreshVisibleForecast);
setInterval(refreshVisibleForecast,60000);
navigate();
refreshWeather();
