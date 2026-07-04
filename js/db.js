// =============================================================
// VERİ KATMANI (Firestore)
// -------------------------------------------------------------
// Tüm Firestore okuma/yazma işlemleri bu dosyadan geçer.
// Ekranlar (takvim, müşteri listesi vb.) doğrudan Firestore'a
// dokunmaz; buradaki fonksiyonları çağırır. Böylece ileride
// Gelişmiş Paket'e (SMS, online randevu) geçerken tek yer değişir.
// =============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  initializeFirestore, persistentLocalCache, collection, doc,
  addDoc, setDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);

// Kalıcı yerel cache: çevrimdışıyken daha önce görülen veriler
// okunabilir, yapılan değişiklikler bağlantı gelince otomatik
// gönderilir (PWA offline desteğinin veri ayağı).
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });

// ---- Koleksiyon adları (tek yerden yönetilir) ----
const COL = {
  randevular: "randevular",
  musteriler: "musteriler",
  hizmetler: "hizmetler",
  calisanlar: "calisanlar",
  ayarlar: "ayarlar"
};

// =============================================================
// RANDEVULAR
// -------------------------------------------------------------
// Belge yapısı:
// {
//   musteriId:   string | null   (kayıtlı müşteriyse bağlantı)
//   musteriAdi:  string          (her zaman dolu — hızlı listeleme için)
//   telefon:     string
//   hizmetId:    string | null
//   hizmetAdi:   string
//   calisanId:   string | null   (çalışan seçilmediyse null)
//   tarih:       string          "YYYY-MM-DD" (takvim sorguları için)
//   saat:        string          "HH:mm"
//   sureDk:      number          (hizmet süresi, çakışma kontrolü için)
//   durum:       "onayli" | "beklemede" | "iptal"
//   not:         string
//   bildirim: {                  // GELİŞMİŞ PAKET için hazır alan —
//     smsGonderildi: false,      // Temel Paket'te hep false/null kalır
//     whatsappGonderildi: false,
//     gonderimTarihi: null
//   },
//   kaynak:      "salon"         // ileride "online" da olabilir
//   olusturma:   serverTimestamp
// }
// =============================================================

export async function randevuEkle(veri) {
  return addDoc(collection(db, COL.randevular), {
    musteriId: veri.musteriId ?? null,
    musteriAdi: veri.musteriAdi,
    telefon: veri.telefon ?? "",
    hizmetId: veri.hizmetId ?? null,
    hizmetAdi: veri.hizmetAdi ?? "",
    calisanId: veri.calisanId ?? null,
    tarih: veri.tarih,
    saat: veri.saat,
    sureDk: veri.sureDk ?? 30,
    durum: veri.durum ?? "onayli",
    not: veri.not ?? "",
    bildirim: { smsGonderildi: false, whatsappGonderildi: false, gonderimTarihi: null },
    kaynak: "salon",
    olusturma: serverTimestamp()
  });
}

export async function randevuGuncelle(id, degisiklikler) {
  return updateDoc(doc(db, COL.randevular, id), degisiklikler);
}

// İptal: kayıt silinmez, durumu "iptal" yapılır (geçmiş kaybolmasın)
export async function randevuIptal(id) {
  return updateDoc(doc(db, COL.randevular, id), { durum: "iptal" });
}

// NOT: Sıralama bilerek tarayıcıda yapılıyor (Firestore'da
// filtre + farklı alanda orderBy "composite index" ister; her
// müşteri kurulumunda index açmamak için sorgular sade tutuldu.
// Bir salonun randevu hacmi için istemci tarafı sıralama yeterli.)
const saatSirala = (liste) =>
  liste.sort((a, b) => a.tarih.localeCompare(b.tarih) || a.saat.localeCompare(b.saat));

// Bir günün randevuları (günlük takvim görünümü)
export async function gununRandevulari(tarih) {
  const q = query(collection(db, COL.randevular), where("tarih", "==", tarih));
  const snap = await getDocs(q);
  return saatSirala(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// Tarih aralığının randevuları (haftalık takvim görünümü)
export async function aralikRandevulari(baslangic, bitis) {
  const q = query(
    collection(db, COL.randevular),
    where("tarih", ">=", baslangic),
    where("tarih", "<=", bitis)
  );
  const snap = await getDocs(q);
  return saatSirala(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// Bir müşterinin geçmiş randevuları (müşteri kartı ekranı) — yeniden eskiye
export async function musterininRandevulari(musteriId) {
  const q = query(collection(db, COL.randevular), where("musteriId", "==", musteriId));
  const snap = await getDocs(q);
  return saatSirala(snap.docs.map(d => ({ id: d.id, ...d.data() }))).reverse();
}

// =============================================================
// MÜŞTERİLER
// Belge yapısı: { ad, telefon, notlar, olusturma }
// (Geçmiş randevular ayrı tutulmaz; randevular koleksiyonundan
//  musteriId ile sorgulanır — veri tekrarı olmaz.)
// =============================================================

export async function musteriEkle(veri) {
  return addDoc(collection(db, COL.musteriler), {
    ad: veri.ad,
    telefon: veri.telefon ?? "",
    notlar: veri.notlar ?? "",
    olusturma: serverTimestamp()
  });
}

export async function musteriGuncelle(id, degisiklikler) {
  return updateDoc(doc(db, COL.musteriler, id), degisiklikler);
}

export async function musteriListesi() {
  const q = query(collection(db, COL.musteriler), orderBy("ad"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function musteriGetir(id) {
  const snap = await getDoc(doc(db, COL.musteriler, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// =============================================================
// HİZMETLER
// Belge yapısı: { ad, sureDk, fiyat (opsiyonel, null olabilir), aktif }
// =============================================================

export async function hizmetEkle(veri) {
  return addDoc(collection(db, COL.hizmetler), {
    ad: veri.ad,
    sureDk: veri.sureDk ?? 30,
    fiyat: veri.fiyat ?? null,
    aktif: true
  });
}

export async function hizmetGuncelle(id, degisiklikler) {
  return updateDoc(doc(db, COL.hizmetler, id), degisiklikler);
}

export async function hizmetListesi() {
  const q = query(collection(db, COL.hizmetler), where("aktif", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

// =============================================================
// ÇALIŞANLAR (opsiyonel — tek kişilik berberde boş kalabilir)
// Belge yapısı: { ad, calismaSaatleri: { baslangic: "09:00", bitis: "19:00" }, aktif }
// =============================================================

export async function calisanEkle(veri) {
  return addDoc(collection(db, COL.calisanlar), {
    ad: veri.ad,
    calismaSaatleri: veri.calismaSaatleri ?? { baslangic: "09:00", bitis: "19:00" },
    aktif: true
  });
}

export async function calisanGuncelle(id, degisiklikler) {
  return updateDoc(doc(db, COL.calisanlar, id), degisiklikler);
}

export async function calisanListesi() {
  const q = query(collection(db, COL.calisanlar), where("aktif", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

// =============================================================
// AYARLAR (salon adı, çalışma saatleri vb. — koda gömülmez,
// her müşteri için Firestore'dan okunur)
// Tek belge: ayarlar/salon
// { salonAdi, calismaSaatleri: { baslangic, bitis }, randevuAraligiDk }
// =============================================================

export async function ayarlariGetir() {
  const snap = await getDoc(doc(db, COL.ayarlar, "salon"));
  return snap.exists() ? snap.data() : null;
}

export async function ayarlariKaydet(ayarlar) {
  return setDoc(doc(db, COL.ayarlar, "salon"), ayarlar, { merge: true });
}

// =============================================================
// KURULUM / YETKİLİ KULLANICILAR
// -------------------------------------------------------------
// "Sadece ilk hesap" kaydolma kısıtlaması burada uygulanır:
// ayarlar/kurulum belgesi yoksa sistem henüz kurulmamış demektir,
// kayıt formu gösterilir. İlk kayıt tamamlanınca bu belge yazılır
// ve kayıt formu bir daha görünmez (bkz. firestore.rules).
// =============================================================

export async function kurulumTamamlandiMi() {
  const snap = await getDoc(doc(db, COL.ayarlar, "kurulum"));
  return snap.exists();
}

// İlk kayıt sırasında çağrılır: kullanıcıyı yetkili listesine
// ekler ve kurulumu "tamamlandı" olarak işaretler.
export async function ilkKurulumuTamamla(uid, eposta) {
  await setDoc(doc(db, "kullanicilar", uid), {
    eposta: eposta,
    rol: "sahibi",
    olusturma: serverTimestamp()
  });
  await setDoc(doc(db, COL.ayarlar, "kurulum"), {
    tamamlandi: true,
    ilkKullanici: eposta,
    tarih: serverTimestamp()
  });
}
