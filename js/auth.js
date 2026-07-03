// =============================================================
// GİRİŞ (Firebase Authentication — e-posta/şifre)
// -------------------------------------------------------------
// Temel Paket'te tek kullanıcı vardır: salon sekreteri/sahibi.
// Kullanıcı Firebase Console > Authentication'dan tanımlanır;
// uygulamada kayıt olma (signup) yoktur — bilerek.
// =============================================================

import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { app } from "./db.js";

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
  return "Giriş yapılamadı: " + (hata?.message || hata);
}
