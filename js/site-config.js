// =====================================================
// MovieTB - site settings (sirf yahin badalna hai)
// =====================================================

// Aapka Cloudflare Worker link, jo Telegram channel/group par le jaata hai.
// Kisi movie me alag link nahi diya ho to ye default use hota hai.
export const TELEGRAM_JOIN_URL = 'https://dry-credit-08ff.arvindkp9336.workers.dev';

// true  = movie page par button dabane par pehle download.html (12 sec timer + ads),
//         phir "Join Telegram" button.
// false = movie page ka button seedha Telegram link kholega (timer page skip).
export const USE_TIMER_PAGE = true;