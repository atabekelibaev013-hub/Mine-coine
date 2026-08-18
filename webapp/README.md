# Mine Coin — to'liq kod (v3)

Bu zip hozirgi GitHub repo'ingizdagi holatga mos, faqat quyidagi tuzatishlar bilan:

- `webapp/index.html` — ✕ Yopish tugmasi olib tashlandi (Telegram'ning o'zi yopish tugmasini beradi); pastki menyu tartibi Boost→Vazifalar→Bosish→Auksion→Profil qilib o'zgartirildi; Profil bo'limiga to'liq menyu (Kunlik Bonus, Buyurtmalarim, Olmos Yuborish, Reyting, Maxsus Xizmatlar, Sozlanmalar, P2P bozori) qo'shildi.
- `webapp/style.css` — topbar tuzatildi (endi faqat balans va uch nuqta bor).
- `webapp/script.js` — `API_BASE` sizning ishlab turgan backend manzilingizga (`https://mine-coine-1.onrender.com`) sozlangan; Profil menyusidagi "Kunlik Bonus" va "Olmos Yuborish" tugmalari endi ishlaydi; yopish tugmasi kodi olib tashlandi.
- `backend/*` — o'zgarishsiz, sizda ishlab turgan versiya bilan bir xil.

## GitHub'ga qanday joylash

Eng oson yo'l — bu 3 ta `webapp` faylini birma-bir eskisining ustiga **Edit** qilib almashtirish (avvalgi bosqichlar kabi):

1. `webapp/index.html` — Edit → hammasini o'chirib, shu zipdagi faylni joylang → Commit
2. `webapp/style.css` — xuddi shunday
3. `webapp/script.js` — xuddi shunday

`backend` papkasidagi fayllar sizda allaqachon to'g'ri va ishlab turibdi — ularni qayta yuklashning hojati yo'q. (Agar solishtirib ko'rmoqchi bo'lsangiz, ular ham shu zipda bor, farq yo'q.)

## Keyingi qadam — admin panelni sinash

Yangilangan `index.html`ni joylagach:

1. Botga `/start` yozib, Mini App'ni ochib ko'ring — endi bitta X, tartib to'g'ri, Profilda to'liq menyu bo'lishi kerak
2. Admin panelni sinash uchun — bot bilan **shaxsiy chatda** (Mini App emas, oddiy Telegram xabar oynasida):
   ```
   /admin
   ```
   yozing.

Agar `/admin` hech narsa qaytarmasa, demak Render'dagi `OWNER_USERNAME` o'zgaruvchisi sizning haqiqiy Telegram username'ingizga (katta-kichik harfsiz, @ belgisisiz) to'g'ri mos kelmayapti. Buni Render → Environment bo'limidan tekshirib, kerak bo'lsa to'g'irlang va **"Manual Deploy" → "Deploy latest commit"** qilib qayta ishga tushiring.
