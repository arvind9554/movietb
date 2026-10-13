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

// Video (VAST) ad tag - download.html par timer ke upar auto-play (muted) video ad.
// Apne ad network ke panel se "VAST tag URL" yahan paste karo (https://... wali).
// Khali ho to video ad nahi chalega, sirf banner ads dikhenge.
export const VAST_TAG_URL = 'https://fluffy-machine.com/PQr6nR';