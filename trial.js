export const APP_VERSION = '1.1.0';
export function trialReport({ category, content, expected = '', context = null, createdAt = new Date().toISOString() }) {
  const description = String(content || '').trim();
  if (description.length < 3) throw new Error('请至少用三个字描述问题或建议。');
  const lines = ['明日衣序 · 试用意见', `版本：${APP_VERSION}`, `生成时间：${createdAt}`, `类型：${String(category || '其他')}`, '', '遇到的问题或建议：', description];
  if (String(expected).trim()) lines.push('', '希望怎样改进：', String(expected).trim());
  if (context) {
    lines.push('', '附加信息：', `地点名称：${context.placeName || '未填写'}`, `天气来源：${({live:'在线预报',demo:'演示天气',none:'未加载'})[context.source] || '未加载'}${context.cached ? '（缓存）' : ''}`, `天气更新时间：${context.weatherUpdatedAt || '未加载'}`);
  }
  lines.push('', '此意见单由试用者主动生成，不含精确坐标、衣橱、日程或冷暖记录。请复制或下载后发给邀请你试用的人。');
  return lines.join('\n');
}
