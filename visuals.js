const paths = {
  hanger: '<path d="M10 7a2 2 0 1 1 3 1.7V11l8 5c1 .7.6 2-1 2H4c-1.6 0-2-1.3-1-2l9-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 10a4 4 0 0 1-1 8Z"/>',
  rain: '<path d="M7 15a4 4 0 1 1 1-7.9A6 6 0 0 1 20 9a3 3 0 0 1-1 6M8 18l-1 3m6-3-1 3m6-3-1 3"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3"/>',
  drop: '<path d="M12 3C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-12Z"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m3 0h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  book: '<path d="M12 6C8 3 3 4 3 4v15s5-1 9 2c4-3 9-2 9-2V4s-5-1-9 2Zm0 0v15"/>',
  scooter: '<circle cx="6" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M6 18h9l3-12h-4m-6 7 2-6h4"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m8 12 2-4 4 1 2 4h4M11 10l-1 7-4 4m5-6 4 2v5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6ZM13 6l5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',
  leaf: '<path d="M20 3C5 2 2 10 6 16c6 7 16 1 14-13ZM5 20 16 9"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.hanger}</svg>`;
const palette = { cream: ['#e9e2d2','#c9c1af'], sand: ['#c8b698','#aa9471'], clay: ['#ae8470','#8c6755'], sage: ['#8e9b80','#6d7d60'], oat: ['#d8cdb8','#b7a98e'], olive: ['#839078','#64735a'], dark: ['#4d5653','#303e38'], charcoal: ['#65716f','#475452'], blue: ['#91a6b0','#6d8893'] };
export function garment(item) {
  const [fill, stroke] = palette[item.color] || palette.sage;
  let shape = '';
  const jacketBody = '<path d="M46 29 62 22h16l16 7 23 80-20 7-9-47v67H38V69l-9 47-20-7 23-80Z"/>';
  if (item.icon === 'pants' || item.icon === 'shorts') {
    shape = item.icon === 'shorts' ? '<path d="M32 29h64l5 66H69l-5-38-5 38H27Z"/><path d="M33 38h62M64 30v27M43 39v15m42-15v15" fill="none"/>' : '<path d="M35 18h58l7 123H71L64 67l-7 74H28Z"/><path d="M35 29h58M64 19v48M43 30v16m42-16v16M29 132h29m12 0h29" fill="none"/>';
  } else if (item.icon === 'shoes') {
    shape = '<path d="m22 78 10-25 24 9 12 20 35 13c16 7 14 23-3 25H25c-16 0-17-16-3-42Z"/><path d="M17 108h94M45 73l20 2m-14 7 22 1m-13 8 22 1M30 62l-3 29" fill="none"/><path d="M38 64c5 16 12 26 24 31" fill="none"/>';
  } else if (item.icon === 'tee') {
    shape = '<path d="m44 28 10-6c4 13 24 13 28 0l10 6 23 24-17 21-10-9v72H39V64l-10 9-17-21 23-24Z"/><path d="M48 25c3 20 28 20 36 0M40 127h47" fill="none"/>';
  } else if (item.icon === 'long') {
    shape = '<path d="m44 28 10-6c4 13 20 13 24 0l10 6 23 74-20 6-8-40v68H39V68l-8 40-20-6 23-74Z"/><path d="M48 25c3 20 25 20 34 0M40 127h42M14 94l20 6m54 0 20-6" fill="none"/>';
  } else {
    shape = jacketBody + '<path d="M63 24v111M68 24v111M46 29l16 18 16-25M78 22l-10 25M43 94l14-6m16 0 11 6M39 126h49" fill="none"/>';
    if (item.icon === 'down') shape += '<path d="M39 58h49M39 75h49M39 92h49M39 110h49M26 45l15 7m-21 8 17 8m51-16 15-7m-12 23 17-8" fill="none" opacity=".65"/>';
    if (item.icon === 'fleece') shape += [[45,60],[80,64],[49,82],[76,101],[50,115],[81,119],[28,52],[96,53],[46,46],[78,78],[53,104]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${stroke}" stroke="none" opacity=".25"/>`).join('');
  }
  return `<svg class="garment-svg" viewBox="0 0 128 158" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}
export const weatherArt = () => `<svg class="weather-art" viewBox="0 0 200 150" aria-hidden="true"><g stroke="#baae70" stroke-width="2" stroke-linecap="round"><path d="M115 17V7m0 98v-9M70 56H59m112 0h-12M83 24l-7-7m77 77-7-7m-63 0-7 7m77-77-7 7"/></g><circle cx="115" cy="56" r="29" fill="#dbc983"/><path d="M46 117c-33 0-34-36-7-43 2-33 49-38 63-7 26-10 47 6 42 25 27 4 24 35-2 35H46Z" fill="#f8f9f3" stroke="#e0e4d5" stroke-width="1.5"/><path d="M37 136h100" stroke="#d5dbcb" stroke-width="1.5" stroke-linecap="round"/></svg>`;
