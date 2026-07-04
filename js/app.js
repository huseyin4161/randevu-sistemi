// =============================================================
// UYGULAMA MANTIĞI — takvim, randevu ekleme/düzenleme, hizmetler
// Veri işlemleri js/db.js üzerinden yapılır.
// =============================================================

import * as veri from "./db.js";
import { girisIzle, girisYap, cikisYap, kayitOl, kayitAcikMi, hataMesaji } from "./auth.js";

// ---------- Durum ----------
const durum = {
  ekran: "takvim",           // "takvim" | "musteriler"
  gorunum: "gun",            // "gun" | "hafta"
  tarih: new Date(),         // seçili gün
  hizmetler: [],
  calisanlar: [],
  musteriler: [],
  duzenlenenId: null,        // dialog açıkken düzenlenen randevu id'si
  duzenlenenMusteriId: null, // müşteri kartında düzenlenen müşteri id'si
  calisanFiltre: ""          // takvimde seçili çalışan (boş = tümü)
};

const calisanAdi = (id) => durum.calisanlar.find(c => c.id === id)?.ad ?? "";

const GUN_ADLARI = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const DURUM_ETIKET = { onayli: "Onaylı", beklemede: "Beklemede", iptal: "İptal" };

// ---------- Tarih yardımcıları ----------
const fmtISO = (d) => {
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
};
const fmtUzun = (d) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
const haftaBasi = (d) => {
  const kopya = new Date(d);
  const fark = (kopya.getDay() + 6) % 7; // Pazartesi = 0
  kopya.setDate(kopya.getDate() - fark);
  return kopya;
};
const gunEkle = (d, n) => { const k = new Date(d); k.setDate(k.getDate() + n); return k; };
const saatToDk = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const bitisSaati = (saat, sureDk) => {
  const t = saatToDk(saat) + sureDk;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

// ---------- Eleman kısayolu ----------
const el = (id) => document.getElementById(id);
const icerik = el("icerik");

// =============================================================
// GÖRÜNÜM ÇİZİMİ
// =============================================================

async function ciz() {
  icerik.innerHTML = `<p class="yukleniyor">Yükleniyor…</p>`;
  try {
    if (durum.ekran === "musteriler") {
      await musterilerCiz();
      return;
    }
    el("tarihSec").value = fmtISO(durum.tarih);
    if (durum.gorunum === "gun") await gunCiz();
    else await haftaCiz();
  } catch (e) {
    icerik.innerHTML = `<p class="bos-mesaj">Veri yüklenemedi: ${e.message}</p>`;
  }
}

// Takvimdeki çalışan filtresini uygula (boş = tümü)
const filtreUygula = (liste) =>
  durum.calisanFiltre ? liste.filter(r => r.calisanId === durum.calisanFiltre) : liste;

async function gunCiz() {
  const randevular = filtreUygula(await veri.gununRandevulari(fmtISO(durum.tarih)));
  const baslik = `<h2 class="gun-baslik">${fmtUzun(durum.tarih)}</h2>`;
  if (randevular.length === 0) {
    icerik.innerHTML = baslik + `<p class="bos-mesaj">Bu gün için randevu yok.<br>"+ Yeni Randevu" ile ekleyebilirsin.</p>`;
    return;
  }
  icerik.innerHTML = baslik + randevular.map(r => {
    const calisan = calisanAdi(r.calisanId);
    return `
    <div class="randevu-kart ${r.durum}" data-id="${r.id}">
      <div class="r-saat">${r.saat}<small>${bitisSaati(r.saat, r.sureDk)}</small></div>
      <div class="r-bilgi">
        <div class="r-musteri">${kacir(r.musteriAdi)}</div>
        <div class="r-detay">${kacir(r.hizmetAdi || "—")}${calisan ? " · 🧑‍💼 " + kacir(calisan) : ""}${r.telefon ? " · " + kacir(r.telefon) : ""}${r.not ? " · " + kacir(r.not) : ""}</div>
      </div>
      <span class="r-durum ${r.durum}">${DURUM_ETIKET[r.durum] || r.durum}</span>
    </div>`;
  }).join("");

  icerik.querySelectorAll(".randevu-kart").forEach(k =>
    k.addEventListener("click", () => randevuDuzenle(k.dataset.id, randevular)));
}

async function haftaCiz() {
  const basi = haftaBasi(durum.tarih);
  const sonu = gunEkle(basi, 6);
  const randevular = filtreUygula(await veri.aralikRandevulari(fmtISO(basi), fmtISO(sonu)));
  const bugunISO = fmtISO(new Date());

  const gunler = Array.from({ length: 7 }, (_, i) => {
    const gun = gunEkle(basi, i);
    const iso = fmtISO(gun);
    const gununkiler = randevular.filter(r => r.tarih === iso);
    const cipler = gununkiler.length
      ? gununkiler.map(r => `
          <div class="hafta-cip ${r.durum}" data-id="${r.id}" title="${kacir(r.musteriAdi)} — ${kacir(r.hizmetAdi || "")}">
            <strong>${r.saat}</strong> ${kacir(r.musteriAdi)}
          </div>`).join("")
      : `<div class="hafta-bos">—</div>`;
    return `
      <div class="hafta-gun ${iso === bugunISO ? "bugun" : ""}">
        <h3>${GUN_ADLARI[i]}<small>${gun.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></h3>
        ${cipler}
      </div>`;
  }).join("");

  icerik.innerHTML = `<div class="hafta-kaydirici"><div class="hafta-tablo">${gunler}</div></div>`;
  icerik.querySelectorAll(".hafta-cip").forEach(c =>
    c.addEventListener("click", () => randevuDuzenle(c.dataset.id, randevular)));
}

// HTML kaçışı (kullanıcı girdisi ekrana basılırken)
function kacir(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// =============================================================
// RANDEVU PENCERESİ
// =============================================================

function hizmetSecenekleriniDoldur(seciliId) {
  el("fHizmet").innerHTML =
    `<option value="">— Seçilmedi —</option>` +
    durum.hizmetler.map(h =>
      `<option value="${h.id}" ${h.id === seciliId ? "selected" : ""}>${kacir(h.ad)} (${h.sureDk} dk)</option>`
    ).join("");
}

function calisanSecenekleriniDoldur(seciliId) {
  const satir = el("fCalisanSatir");
  if (durum.calisanlar.length === 0) { satir.hidden = true; return; }
  satir.hidden = false;
  el("fCalisan").innerHTML =
    `<option value="">— Seçilmedi —</option>` +
    durum.calisanlar.map(c =>
      `<option value="${c.id}" ${c.id === seciliId ? "selected" : ""}>${kacir(c.ad)}</option>`
    ).join("");
}

function yeniRandevuAc() {
  durum.duzenlenenId = null;
  el("dialogBaslik").textContent = "Yeni Randevu";
  el("randevuForm").reset();
  el("fTarih").value = fmtISO(durum.tarih);
  el("fSaat").value = "10:00";
  el("fSure").value = 30;
  el("fDurum").value = "onayli";
  el("fUyari").hidden = true;
  el("randevuIptalBtn").hidden = true;
  hizmetSecenekleriniDoldur(null);
  calisanSecenekleriniDoldur(null);
  musteriOnerileriniDoldur();
  el("randevuDialog").showModal();
}

function randevuDuzenle(id, liste) {
  const r = liste.find(x => x.id === id);
  if (!r) return;
  durum.duzenlenenId = id;
  el("dialogBaslik").textContent = "Randevuyu Düzenle";
  el("fMusteriAdi").value = r.musteriAdi;
  el("fTelefon").value = r.telefon || "";
  el("fTarih").value = r.tarih;
  el("fSaat").value = r.saat;
  el("fSure").value = r.sureDk;
  el("fDurum").value = r.durum;
  el("fNot").value = r.not || "";
  el("fUyari").hidden = true;
  el("randevuIptalBtn").hidden = r.durum === "iptal";
  hizmetSecenekleriniDoldur(r.hizmetId);
  calisanSecenekleriniDoldur(r.calisanId);
  musteriOnerileriniDoldur();
  el("randevuDialog").showModal();
}

// Aynı gün/saatte çakışma var mı? (uyarır ama engellemez —
// salon isterse bilerek üst üste randevu alabilir)
// İki randevu da farklı çalışanlara atanmışsa çakışma sayılmaz;
// biri atanmamışsa (herkes olabilir) çakışma uyarısı verilir.
async function cakismaKontrol(tarih, saat, sureDk, haricId, calisanId) {
  const gunun = await veri.gununRandevulari(tarih);
  const bas = saatToDk(saat), bit = bas + sureDk;
  return gunun.filter(r => {
    if (r.id === haricId || r.durum === "iptal") return false;
    if (calisanId && r.calisanId && r.calisanId !== calisanId) return false;
    const rBas = saatToDk(r.saat), rBit = rBas + (r.sureDk || 30);
    return bas < rBit && rBas < bit;
  });
}

async function randevuKaydet(e) {
  e.preventDefault();
  const kaydetBtn = el("kaydetBtn");
  kaydetBtn.disabled = true;
  try {
    const hizmet = durum.hizmetler.find(h => h.id === el("fHizmet").value);
    const kayit = {
      musteriAdi: el("fMusteriAdi").value.trim(),
      telefon: el("fTelefon").value.trim(),
      hizmetId: hizmet?.id ?? null,
      hizmetAdi: hizmet?.ad ?? "",
      calisanId: el("fCalisan").value || null,
      tarih: el("fTarih").value,
      saat: el("fSaat").value,
      sureDk: Number(el("fSure").value) || 30,
      durum: el("fDurum").value,
      not: el("fNot").value.trim()
    };

    // Çakışma uyarısı — ilk kayıtta göster, kullanıcı tekrar
    // "Kaydet" derse kabul edip kaydet
    const uyari = el("fUyari");
    if (uyari.hidden && kayit.durum !== "iptal") {
      const cakisanlar = await cakismaKontrol(kayit.tarih, kayit.saat, kayit.sureDk, durum.duzenlenenId, kayit.calisanId);
      if (cakisanlar.length > 0) {
        uyari.textContent = `⚠️ Bu saatte çakışan randevu var: ${cakisanlar.map(c => `${c.saat} ${c.musteriAdi}`).join(", ")}. Yine de kaydetmek için tekrar "Kaydet"e bas.`;
        uyari.hidden = false;
        return;
      }
    }

    // Müşteriyi eşleştir ya da otomatik kaydet (müşteri ekranı
    // için — sekreter ayrıca müşteri kaydı açmak zorunda kalmaz)
    kayit.musteriId = await musteriBulVeyaOlustur(kayit.musteriAdi, kayit.telefon);

    if (durum.duzenlenenId) await veri.randevuGuncelle(durum.duzenlenenId, kayit);
    else await veri.randevuEkle(kayit);

    el("randevuDialog").close();
    await ciz();
  } catch (e2) {
    alert("Kaydedilemedi: " + e2.message);
  } finally {
    kaydetBtn.disabled = false;
  }
}

async function randevuIptalEt() {
  if (!durum.duzenlenenId) return;
  if (!confirm("Bu randevu iptal edilecek. Emin misin?")) return;
  await veri.randevuIptal(durum.duzenlenenId);
  el("randevuDialog").close();
  await ciz();
}

// =============================================================
// HİZMET YÖNETİMİ PENCERESİ
// =============================================================

function hizmetListesiniCiz() {
  const ul = el("hizmetListe");
  if (durum.hizmetler.length === 0) {
    ul.innerHTML = `<li class="h-detay">Henüz hizmet eklenmedi. Aşağıdan ekleyebilirsin.</li>`;
    return;
  }
  ul.innerHTML = durum.hizmetler.map(h => `
    <li>
      <span>${kacir(h.ad)} <span class="h-detay">· ${h.sureDk} dk${h.fiyat != null ? " · " + h.fiyat + " ₺" : ""}</span></span>
      <button class="hizmet-sil" data-id="${h.id}">Kaldır</button>
    </li>
  `).join("");
  ul.querySelectorAll(".hizmet-sil").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Bu hizmet listeden kaldırılacak (eski randevular etkilenmez). Emin misin?")) return;
      await veri.hizmetGuncelle(b.dataset.id, { aktif: false });
      durum.hizmetler = await veri.hizmetListesi();
      hizmetListesiniCiz();
    }));
}

function calisanListesiniCiz() {
  const ul = el("calisanListe");
  if (durum.calisanlar.length === 0) {
    ul.innerHTML = `<li class="h-detay">Henüz çalışan eklenmedi.</li>`;
    return;
  }
  ul.innerHTML = durum.calisanlar.map(c => `
    <li>
      <span>${kacir(c.ad)} <span class="h-detay">· ${c.calismaSaatleri?.baslangic ?? "09:00"}–${c.calismaSaatleri?.bitis ?? "19:00"}</span></span>
      <button class="hizmet-sil" data-id="${c.id}">Kaldır</button>
    </li>
  `).join("");
  ul.querySelectorAll(".hizmet-sil").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Bu çalışan listeden kaldırılacak (eski randevular etkilenmez). Emin misin?")) return;
      await veri.calisanGuncelle(b.dataset.id, { aktif: false });
      durum.calisanlar = await veri.calisanListesi();
      calisanListesiniCiz();
      calisanFiltresiniKur();
    }));
}

async function calisanKaydet(e) {
  e.preventDefault();
  await veri.calisanEkle({
    ad: el("cAd").value.trim(),
    calismaSaatleri: {
      baslangic: el("cBaslangic").value || "09:00",
      bitis: el("cBitis").value || "19:00"
    }
  });
  el("calisanForm").reset();
  el("cBaslangic").value = "09:00";
  el("cBitis").value = "19:00";
  durum.calisanlar = await veri.calisanListesi();
  calisanListesiniCiz();
  calisanFiltresiniKur();
}

// Takvim üstündeki çalışan filtresi — çalışan yoksa gizli kalır
function calisanFiltresiniKur() {
  const sec = el("calisanFiltre");
  if (durum.calisanlar.length === 0) {
    sec.hidden = true;
    durum.calisanFiltre = "";
    return;
  }
  sec.hidden = false;
  sec.innerHTML =
    `<option value="">Tüm çalışanlar</option>` +
    durum.calisanlar.map(c =>
      `<option value="${c.id}" ${c.id === durum.calisanFiltre ? "selected" : ""}>${kacir(c.ad)}</option>`
    ).join("");
}

async function hizmetKaydet(e) {
  e.preventDefault();
  const fiyatDeger = el("hFiyat").value;
  await veri.hizmetEkle({
    ad: el("hAd").value.trim(),
    sureDk: Number(el("hSure").value) || 30,
    fiyat: fiyatDeger === "" ? null : Number(fiyatDeger)
  });
  el("hizmetForm").reset();
  el("hSure").value = 30;
  durum.hizmetler = await veri.hizmetListesi();
  hizmetListesiniCiz();
}

// =============================================================
// MÜŞTERİLER EKRANI
// =============================================================

const telefonSade = (t) => String(t ?? "").replace(/\D/g, "");

async function musterilerCiz() {
  durum.musteriler = await veri.musteriListesi();
  icerik.innerHTML = `
    <div class="musteri-arac">
      <input type="search" id="musteriAra" placeholder="Ad veya telefon ara…">
      <button id="yeniMusteriBtn" class="birincil">+ Yeni Müşteri</button>
    </div>
    <div id="musteriListeAlani"></div>`;

  const listele = (filtre) => {
    const alan = el("musteriListeAlani");
    const f = (filtre || "").toLocaleLowerCase("tr").trim();
    const fTel = telefonSade(filtre);
    const secilenler = durum.musteriler.filter(m =>
      !f ||
      m.ad.toLocaleLowerCase("tr").includes(f) ||
      (fTel && telefonSade(m.telefon).includes(fTel)));

    if (secilenler.length === 0) {
      alan.innerHTML = `<p class="bos-mesaj">${durum.musteriler.length === 0
        ? "Henüz müşteri kaydı yok. Randevu ekledikçe müşteriler otomatik kaydedilir; \"+ Yeni Müşteri\" ile elle de ekleyebilirsin."
        : "Aramaya uyan müşteri bulunamadı."}</p>`;
      return;
    }
    alan.innerHTML = secilenler.map(m => `
      <div class="musteri-kart" data-id="${m.id}">
        <div class="r-bilgi">
          <div class="r-musteri">${kacir(m.ad)}</div>
          <div class="r-detay">${kacir(m.telefon || "telefon yok")}${m.notlar ? " · " + kacir(m.notlar) : ""}</div>
        </div>
        <span class="ok">›</span>
      </div>`).join("");
    alan.querySelectorAll(".musteri-kart").forEach(k =>
      k.addEventListener("click", () => musteriKartiAc(k.dataset.id)));
  };

  listele("");
  el("musteriAra").addEventListener("input", (e) => listele(e.target.value));
  el("yeniMusteriBtn").addEventListener("click", () => musteriKartiAc(null));
}

async function musteriKartiAc(id) {
  durum.duzenlenenMusteriId = id;
  const yeni = !id;
  el("musteriDialogBaslik").textContent = yeni ? "Yeni Müşteri" : "Müşteri Kartı";
  el("musteriForm").reset();
  el("mGecmisAlan").hidden = yeni;
  el("musteriyeRandevuBtn").hidden = yeni;
  el("musteriDialog").showModal();

  if (yeni) return;
  const m = durum.musteriler.find(x => x.id === id);
  if (!m) return;
  el("mAd").value = m.ad;
  el("mTelefon").value = m.telefon || "";
  el("mNotlar").value = m.notlar || "";

  const ul = el("mGecmis");
  ul.innerHTML = `<li class="h-detay">Yükleniyor…</li>`;
  const gecmis = await veri.musterininRandevulari(id);
  if (gecmis.length === 0) {
    ul.innerHTML = `<li class="h-detay">Kayıtlı randevusu yok.</li>`;
    return;
  }
  ul.innerHTML = gecmis.slice(0, 20).map(r => {
    const t = new Date(r.tarih + "T00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
    return `<li>
      <span>${t} ${r.saat} <span class="h-detay">· ${kacir(r.hizmetAdi || "—")}</span></span>
      <span class="r-durum ${r.durum}">${DURUM_ETIKET[r.durum] || r.durum}</span>
    </li>`;
  }).join("");
}

async function musteriKaydet(e) {
  e.preventDefault();
  const kayit = {
    ad: el("mAd").value.trim(),
    telefon: el("mTelefon").value.trim(),
    notlar: el("mNotlar").value.trim()
  };
  if (durum.duzenlenenMusteriId) await veri.musteriGuncelle(durum.duzenlenenMusteriId, kayit);
  else await veri.musteriEkle(kayit);
  el("musteriDialog").close();
  await ciz();
}

// Randevu kaydında müşteriyi eşleştir; yoksa otomatik oluştur.
// Eşleştirme önce telefonla (en güvenilir), sonra tam ad ile yapılır.
async function musteriBulVeyaOlustur(ad, telefon) {
  const adKey = ad.toLocaleLowerCase("tr").trim();
  const telKey = telefonSade(telefon);
  const mevcut = durum.musteriler.find(m =>
    (telKey && telefonSade(m.telefon) === telKey) ||
    m.ad.toLocaleLowerCase("tr").trim() === adKey);
  if (mevcut) return mevcut.id;

  const ref = await veri.musteriEkle({ ad, telefon });
  durum.musteriler = await veri.musteriListesi();
  return ref.id;
}

// Randevu formunda ad yazarken kayıtlı müşterilerden öneri;
// öneriden seçilirse telefon otomatik dolar.
function musteriOnerileriniDoldur() {
  el("musteriOneri").innerHTML = durum.musteriler
    .map(m => `<option value="${kacir(m.ad)}">`).join("");
}

function musteriAdiDegisti() {
  const ad = el("fMusteriAdi").value.toLocaleLowerCase("tr").trim();
  const m = durum.musteriler.find(x => x.ad.toLocaleLowerCase("tr").trim() === ad);
  if (m && !el("fTelefon").value.trim()) el("fTelefon").value = m.telefon || "";
}

// =============================================================
// OLAY BAĞLAMA + BAŞLANGIÇ
// =============================================================

function gorunumDegistir(yeni) {
  durum.gorunum = yeni;
  el("gunGorunumBtn").classList.toggle("aktif", yeni === "gun");
  el("haftaGorunumBtn").classList.toggle("aktif", yeni === "hafta");
  ciz();
}

function tarihKaydir(yon) {
  const adim = durum.gorunum === "hafta" ? 7 : 1;
  durum.tarih = gunEkle(durum.tarih, yon * adim);
  ciz();
}

async function baslat() {
  // Salon adı ayarlardan (yoksa genel başlık kalır — koda gömülmez)
  try {
    const ayarlar = await veri.ayarlariGetir();
    if (ayarlar?.salonAdi) {
      el("salonAdi").textContent = ayarlar.salonAdi;
      document.title = ayarlar.salonAdi + " — Randevu";
    }
  } catch { /* ayarlar yoksa sorun değil */ }

  [durum.hizmetler, durum.calisanlar, durum.musteriler] = await Promise.all([
    veri.hizmetListesi(),
    veri.calisanListesi(),
    veri.musteriListesi()
  ]);

  el("oncekiBtn").addEventListener("click", () => tarihKaydir(-1));
  el("sonrakiBtn").addEventListener("click", () => tarihKaydir(1));
  el("bugunBtn").addEventListener("click", () => { durum.tarih = new Date(); ciz(); });
  el("tarihSec").addEventListener("change", (e) => {
    if (e.target.value) { durum.tarih = new Date(e.target.value + "T00:00"); ciz(); }
  });
  el("gunGorunumBtn").addEventListener("click", () => gorunumDegistir("gun"));
  el("haftaGorunumBtn").addEventListener("click", () => gorunumDegistir("hafta"));

  el("yeniRandevuBtn").addEventListener("click", yeniRandevuAc);
  el("randevuForm").addEventListener("submit", randevuKaydet);
  el("dialogKapatBtn").addEventListener("click", () => el("randevuDialog").close());
  el("randevuIptalBtn").addEventListener("click", randevuIptalEt);
  el("fMusteriAdi").addEventListener("change", musteriAdiDegisti);

  // Takvim ↔ Müşteriler ekran geçişi
  el("musterilerBtn").addEventListener("click", () => {
    const musteriEkrani = durum.ekran !== "musteriler";
    durum.ekran = musteriEkrani ? "musteriler" : "takvim";
    el("musterilerBtn").textContent = musteriEkrani ? "📅 Takvim" : "👥 Müşteriler";
    document.querySelector(".takvim-bar").hidden = musteriEkrani;
    ciz();
  });
  el("musteriForm").addEventListener("submit", musteriKaydet);
  el("musteriKapatBtn").addEventListener("click", () => el("musteriDialog").close());
  el("musteriyeRandevuBtn").addEventListener("click", () => {
    const m = durum.musteriler.find(x => x.id === durum.duzenlenenMusteriId);
    el("musteriDialog").close();
    yeniRandevuAc();
    if (m) {
      el("fMusteriAdi").value = m.ad;
      el("fTelefon").value = m.telefon || "";
    }
  });

  el("hizmetlerBtn").addEventListener("click", () => {
    hizmetListesiniCiz();
    calisanListesiniCiz();
    el("hizmetDialog").showModal();
  });
  el("hizmetForm").addEventListener("submit", hizmetKaydet);
  el("calisanForm").addEventListener("submit", calisanKaydet);
  el("hizmetKapatBtn").addEventListener("click", () => el("hizmetDialog").close());
  el("calisanFiltre").addEventListener("change", (e) => {
    durum.calisanFiltre = e.target.value;
    ciz();
  });
  calisanFiltresiniKur();

  await ciz();
}

// =============================================================
// GİRİŞ KAPISI — uygulama ancak oturum açılınca başlar
// =============================================================

let basladiMi = false;

el("girisForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = el("girisBtn");
  const hata = el("gHata");
  btn.disabled = true;
  hata.hidden = true;
  try {
    await girisYap(el("gEposta").value.trim(), el("gSifre").value);
    // girisIzle tetiklenir, ekran orada açılır
  } catch (e2) {
    hata.textContent = hataMesaji(e2);
    hata.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

el("kayitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = el("kayitBtn");
  const hata = el("kHata");
  btn.disabled = true;
  hata.hidden = true;
  try {
    await kayitOl(el("kEposta").value.trim(), el("kSifre").value);
    // girisIzle tetiklenir, ekran orada açılır
  } catch (e2) {
    hata.textContent = hataMesaji(e2);
    hata.hidden = false;
    btn.disabled = false;
  }
});

// Giriş ↔ kayıt formu arasında geçiş (kayıt sekmesi sadece
// kurulum tamamlanmamışsa zaten görünür olacak, aşağıda kontrol edilir)
el("kayitGecisBtn").addEventListener("click", () => {
  el("girisForm").hidden = true;
  el("kayitForm").hidden = false;
});
el("girisGecisBtn").addEventListener("click", () => {
  el("kayitForm").hidden = true;
  el("girisForm").hidden = false;
});

el("cikisBtn").addEventListener("click", () => cikisYap());

girisIzle(async (kullanici) => {
  const girisli = !!kullanici;
  el("girisEkrani").hidden = girisli;
  el("uygulama").hidden = !girisli;

  // Oturum yoksa: kurulum tamamlanmış mı diye bak, kayıt
  // sekmesine geçiş butonunu ona göre göster/gizle.
  if (!girisli) {
    try {
      const kayitAcik = await kayitAcikMi();
      el("kayitGecisBtn").hidden = !kayitAcik;
      if (!kayitAcik) {
        // Kurulum tamamlanmışsa kayıt formu asla gösterilmez,
        // biri sekmede kalmış olsa bile giriş formuna zorla.
        el("kayitForm").hidden = true;
        el("girisForm").hidden = false;
      }
    } catch {
      // Firestore'a erişilemezse (örn. bağlantı yok) temkinli
      // davran: kayıt seçeneğini gösterme, sadece girişi sun.
      el("kayitGecisBtn").hidden = true;
    }
  }

  if (girisli && !basladiMi) {
    basladiMi = true;
    baslat().catch(e => {
      icerik.innerHTML = `<p class="bos-mesaj">Uygulama başlatılamadı: ${e.message}</p>`;
    });
  }
});
