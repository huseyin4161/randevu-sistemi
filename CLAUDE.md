# CLAUDE.md — Güzellik Salonu / Berber Randevu Sistemi

Bu dosya, Claude Code'un bu proje klasöründe her çalıştığında otomatik olarak okuyacağı proje talimatıdır. Amaç: her oturumda bağlamı yeniden anlatmaya gerek kalmadan tutarlı, doğru yönde geliştirme yapmak.

---

## PROJE TANIMI

Güzellik salonları ve berberler için merkezi randevu yönetim sistemi. DijiAKSU (Hüseyin Aksu) tarafından geliştiriliyor, ilk müşteriye satılacak bir ürün. PDKS (personel takip sistemi) ile aynı teknik yaklaşım ve iş akışı izleniyor.

## HEDEF KULLANICI

- **Birincil kullanıcı:** Salon/berber sekreteri veya işletme sahibi — randevuları görür, ekler, düzenler
- **İkincil kullanıcı (ileride):** Salon müşterisi — online randevu sayfası eklenince kendi telefonundan randevu alacak

## PAKET YAPISI (satış modeli)

### Temel Paket — ŞU AN GELİŞTİRİLEN KAPSAM
- Randevu oluşturma/düzenleme/iptal
- Takvim görünümü (günlük/haftalık)
- Müşteri yönetimi (kayıt, geçmiş randevu, iletişim bilgisi)
- Bulut tabanlı veri saklama (Firebase)
- Kurulum: 4.000 ₺ | Yıllık bakım: 3.000 ₺

### Gelişmiş Paket — İLERİDE EKLENECEK (şimdi kodlanmayacak, ama mimari buna uygun kurulmalı)
- SMS bildirimi (Netgsm entegrasyonu — Twilio KULLANILMAYACAK, Türk servisi tercih edilecek)
- WhatsApp bildirimi
- Online randevu sayfası (müşteriye açık, herkese açık URL)
- Ayrı sunucu kurulumu (DigitalOcean)
- Kurulum: 15.000-20.000 ₺ | Yıllık bakım: 4.000-5.000 ₺

**ÖNEMLİ:** Temel Paket'in veri modeli, Gelişmiş Paket özellikleri kolayca eklenebilecek şekilde tasarlanmalı (örn. randevu kaydında "bildirim gönderildi mi" alanı baştan olsun, boş kalabilir ama yapı hazır olsun).

## TEKNİK ALTYAPI

- **Frontend:** PWA (PDKS ile aynı yaklaşım)
- **Backend/Veritabanı:** Firebase (Firestore)
- **Hosting:** GitHub Pages (PDKS'teki gibi) — Gelişmiş Paket'e geçilirse DigitalOcean'a taşınabilir
- **Geliştirme ortamı:** Cursor + Claude Code

## VERİ MODELİ (taslak — geliştirme sırasında netleşecek)

- **Randevular:** müşteri adı, telefon, hizmet türü, tarih/saat, çalışan (varsa), durum (onaylı/beklemede/iptal), not, bildirim durumu (ileride kullanılacak, şimdilik boş)
- **Müşteriler:** ad, telefon, geçmiş randevu listesi, notlar
- **Hizmetler:** hizmet adı, süre, fiyat (opsiyonel)
- **Çalışanlar (varsa):** ad, çalışma saatleri

## BİLİNEN KISITLAR / KURALLAR

- SMS/WhatsApp entegrasyonu bu aşamada YAPILMAYACAK — sadece veri yapısı buna hazır olsun
- Online randevu sayfası bu aşamada YAPILMAYACAK
- Sunucu kurulumu gerekmiyor — Firebase + GitHub Pages yeterli (PDKS'teki gibi)
- Basit ve hızlı teslim önceliklidir — aşırı mühendislikten kaçınılmalı

## GELİŞTİRME TARZI

- Adım adım ilerlenir, her aşamada onay beklenir (büyük toplu değişiklik yapılmaz)
- PDKS'te yaşanan Service Worker cache sorunları göz önünde bulundurulmalı — PWA cache stratejisi baştan dikkatli kurulmalı
- Kod, ileride başka bir müşteriye de satılabilecek şekilde genel/tekrar kullanılabilir yazılmalı (tek bir salona özel sabit değerler gömülmemeli)

## SONRAKİ ADIMLAR

1. Firebase projesi kurulumu
2. Temel veri modeli (Firestore koleksiyonları)
3. Takvim + randevu ekleme ekranı
4. Müşteri yönetimi ekranı
5. Test ve PDKS benzeri PWA kurulumu (splash screen, offline destek vb.)
