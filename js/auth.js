// =============================================================
// GİRİŞ (Firebase Authentication — e-posta/şifre)
// -------------------------------------------------------------
// Temel Paket'te tek kullanıcı vardır: salon sekreteri/sahibi.
// Kayıt (signup) SADECE ilk kurulumda bir kereliğine açıktır —
// ayarlar/kurulum belgesi yazılınca kayıt formu kalıcı olarak
// kapanır (bkz. db.js, firestore.rules: aynı kısıtlama sunucu
// tarafında da uygulanır).
// =============================================================

import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { app, kurulumTamamlandiMi, ilkKurulumuTamamla } from "./db.js";

const auth = getAuth(app);

// Oturum değişince haber ver (sayfa açılışında da tetiklenir;
// tarayıcı oturumu hatırlar, her seferinde şifre istenmez)
export function girisIzle(geriCagir) {
  onAuthStateChanged(auth, geriCagir);
}

export async function girisYap(eposta, sifre) {
  return signInWithEmailAndPassword(auth, eposta, sifre);
}

export async function cikisYap() {
  return signOut(auth);
}

// Kayıt formunun gösterilip gösterilmeyeceğine karar verir.
export async function kayitAcikMi() {
  return !(await kurulumTamamlandiMi());
}

// İlk kurulum kaydı. Firebase Auth hesabını oluşturur, ardından
// Firestore'a "yetkili kullanıcı" ve "kurulum tamamlandı" kaydını
// yazar. İkinci adım başarısız olursa (örn. bağlantı kopması) Auth
// hesabı oluşmuş ama yetkisiz kalır — bu durumda kullanıcı normal
// giriş ekranından tekrar dener, sonraki oturumda kurulum adımı
// otomatik tamamlanmaz; bu nadir uç durumu şimdilik Temel Paket
// kapsamı dışında bırakıyoruz (KURULUM.md'de not var).
export async function kayitOl(eposta, sifre) {
  const kimlikBilgisi = await createUserWithEmailAndPassword(auth, eposta, sifre);
  await ilkKurulumuTamamla(kimlikBilgisi.user.uid, eposta);
  return kimlikBilgisi;
}

// Firebase hata kodlarını kullanıcı diline çevir
export function hataMesaji(hata) {
  const kod = hata?.code || "";
  if (kod.includes("invalid-credential") || kod.includes("wrong-password") || kod.includes("user-not-found"))
    return "E-posta veya şifre hatalı.";
  if (kod.includes("invalid-email")) return "Geçersiz e-posta adresi.";
  if (kod.includes("too-many-requests")) return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (kod.includes("network-request-failed")) return "İnternet bağlantısı yok görünüyor.";
  if (kod.includes("operation-not-allowed") || kod.includes("configuration-not-found"))
    return "Giriş yöntemi henüz açılmamış — Firebase Console > Authentication'da E-posta/Şifre etkinleştirilmeli.";
  if (kod.includes("email-already-in-use")) return "Bu e-posta zaten kayıtlı — giriş yapmayı dene.";
  if (kod.includes("weak-password")) return "Şifre en az 6 karakter olmalı.";
  return "İşlem yapılamadı: " + (hata?.message || hata);
}
