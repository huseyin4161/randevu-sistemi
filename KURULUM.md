# Firebase Kurulum Rehberi

Bu adımlar Firebase Console'da (tarayıcıda) yapılır, yaklaşık 10 dakika sürer.
Her müşteri (salon) için bu adımlar tekrarlanır — kod aynı kalır, sadece
`js/firebase-config.js` değişir.

## 1. Firebase projesi oluştur

1. https://console.firebase.google.com adresine git (Google hesabınla giriş yap)
2. **"Proje ekle"** (Add project) tıkla
3. Proje adı: `randevu-<salon-adi>` (örn. `randevu-demo`) — ilk kurulum için demo yeterli
4. Google Analytics sorusuna **"Hayır"** de (gerekmiyor) → **Oluştur**

## 2. Web uygulaması ekle

1. Proje açılınca ana sayfadaki **`</>`** (Web) simgesine tıkla
2. Uygulama takma adı: `randevu-web`
3. **"Firebase Hosting"** kutusunu İŞARETLEME (GitHub Pages kullanacağız)
4. **"Uygulamayı kaydet"** de — sana `firebaseConfig = { apiKey: "...", ... }` diye bir kod bloğu gösterecek
5. O bloktaki değerleri **`js/firebase-config.js`** dosyasına kopyala
   (dosyada `BURAYA_...` yazan yerlere). Değerleri bana yapıştırırsan ben de doldururum.

## 3. Firestore veritabanını aç

1. Sol menü: **Build → Firestore Database → Veritabanı oluştur**
2. Konum: **europe-west1 (Belçika)** seç (Türkiye'ye en yakın, sonradan değiştirilemez)
3. Mod sorusunda: **"Test modunda başlat"** seç
   - Test modu 30 gün herkese açık kalır — geliştirme için yeterli
   - Uygulamaya giriş ekranı ekleyince kuralları sıkılaştıracağız
     (hazır kural dosyası: `firestore.rules` — şimdilik dokunma)
4. **Oluştur** de. Koleksiyonları elle açmana gerek yok — uygulama ilk kayıtta kendisi oluşturur.

## 4. Bağlantıyı test et

Terminalde proje klasöründe şunu çalıştır (ES modülleri `file://` ile çalışmaz,
küçük bir yerel sunucu gerekir):

```bash
cd /Users/huseyin/Desktop/claude/randevu-sistemi
python3 -m http.server 8080
```

Sonra tarayıcıda **http://localhost:8080/test-baglanti.html** aç ve
**"Testi Başlat"** butonuna bas. Dört yeşil ✅ görürsen kurulum tamamdır.

## 5. (Daha sonra) Giriş sistemi ve kural sıkılaştırma

Uygulama arayüzü hazır olunca:
- **Build → Authentication → E-posta/Şifre** yöntemini açacağız
- Salon için bir kullanıcı (e-posta + şifre) tanımlayacağız
- `firestore.rules` içeriğini **Firestore → Rules** sekmesine yapıştıracağız

Bu adımları zamanı gelince birlikte yaparız — şimdilik 1-4 yeterli.

---

## Sorun çıkarsa

| Belirti | Muhtemel sebep |
|---|---|
| "api-key-not-valid" hatası | `firebase-config.js` değerleri eksik/yanlış kopyalanmış |
| "Missing or insufficient permissions" | Firestore test modunda açılmamış, ya da 30 günlük test süresi dolmuş |
| Sayfa bomboş, konsolda CORS/module hatası | Dosya çift tıklamayla (`file://`) açılmış — 4. adımdaki yerel sunucuyla aç |
