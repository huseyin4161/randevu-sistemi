// =============================================================
// SERVICE WORKER — dikkatli cache stratejisi
// -------------------------------------------------------------
// PDKS'te yaşanan "eski sürüm cache'te kaldı" sorununa karşı
// bilinçli tercihler:
//
// 1. UYGULAMA DOSYALARI (HTML/CSS/JS): NETWORK-FIRST.
//    İnternet varken HER ZAMAN sunucudaki güncel dosya kullanılır
//    ve cache tazelenir; cache yalnızca çevrimdışıyken devreye
//    girer. Böylece yayınlanan güncelleme anında herkese ulaşır,
//    "kullanıcıda eski sürüm kaldı" durumu oluşamaz.
//
// 2. FIREBASE SDK (www.gstatic.com): CACHE-FIRST.
//    URL'leri sürüm numaralı ve içerikleri hiç değişmez —
//    bir kez indirilen dosya güvenle cache'ten kullanılır.
//
// 3. FIRESTORE İSTEKLERİ: SW HİÇ KARIŞMAZ.
//    Veri istekleri olduğu gibi geçer; çevrimdışı veri desteğini
//    Firestore'un kendi kalıcı cache'i sağlar (js/db.js).
//
// 4. SÜRÜM: Her yayında SURUM artırılır; eski cache'ler
//    activate'te tamamen silinir, yeni SW beklemeden devralır.
// =============================================================

const SURUM = "v2";
const CACHE_ADI = `randevu-${SURUM}`;
const SDK_CACHE = "firebase-sdk";

// Çevrimdışı çalışması gereken uygulama kabuğu
const KABUK = [
  "./",
  "./index.html",
  "./css/stil.css",
  "./js/app.js",
  "./js/db.js",
  "./js/auth.js",
  "./js/firebase-config.js",
  "./manifest.json",
  "./ikon/ikon-192.png",
  "./ikon/ikon-512.png",
  "./ikon/ikon-180.png"
];

self.addEventListener("install", (olay) => {
  olay.waitUntil(
    caches.open(CACHE_ADI)
      .then((cache) => cache.addAll(KABUK))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(
        adlar
          .filter((ad) => ad !== CACHE_ADI && ad !== SDK_CACHE)
          .map((ad) => caches.delete(ad))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (olay) => {
  const istek = olay.request;
  if (istek.method !== "GET") return;

  const url = new URL(istek.url);

  // Kendi dosyalarımız: network-first, çevrimdışıysa cache
  if (url.origin === self.location.origin) {
    olay.respondWith(
      fetch(istek)
        .then((cevap) => {
          const kopya = cevap.clone();
          caches.open(CACHE_ADI).then((cache) => cache.put(istek, kopya));
          return cevap;
        })
        .catch(() =>
          caches.match(istek).then((eski) =>
            eski || (istek.mode === "navigate" ? caches.match("./index.html") : Response.error())
          )
        )
    );
    return;
  }

  // Firebase SDK: cache-first (sürümlü, değişmez dosyalar)
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    olay.respondWith(
      caches.match(istek).then((eski) =>
        eski || fetch(istek).then((cevap) => {
          const kopya = cevap.clone();
          caches.open(SDK_CACHE).then((cache) => cache.put(istek, kopya));
          return cevap;
        })
      )
    );
    return;
  }

  // Diğer her şey (Firestore dahil): SW karışmaz, olduğu gibi geçer
});
