# PLAN REBUILD TRANG CHỦ MTRUONG-STORE (Fix_Trangchu_plan)

> Phạm vi file này: **kế hoạch** rebuild toàn diện trang chủ `/`
> (hiện tại: `src/app/(shop)/page.tsx`, ~457 dòng, `'use client'` 100%).
> Quy ước triển khai: làm theo Phase 1 → 5, tick checkbox, verify build sau mỗi phase.

---

## 1. AUDIT TRANG CHỦ HIỆN TẠI (vấn đề thật, đọc từ source)

### 1.1 Dữ liệu giả khắp trang (nặng nhất)
| Vị trí | Vấn đề |
|---|---|
| `page.tsx:17-22` heroStats | Số liệu `12K+ / 500+ / 99% / 24/7` hardcode, không nối DB |
| `page.tsx:89-135` hero cards | 2 sản phẩm showcase hardcode (Laptop G15, Air Pro), nút giỏ hàng **không có onClick** (dead button) |
| `page.tsx:173-182` countdown | `04:32:12` là số tĩnh — không đếm, reload cũng đứng yên |
| `page.tsx:267-269` voucher | 3 mã `MTRUONG100K / FREESHIP50K / LUXURYVIP` hardcode, không query `/api/user/vouchers`, không check hạn/điều kiện thật |
| `page.tsx:280` brands | 6 brand text tĩnh (APPLE/SAMSUNG/SONY/DYSON/GUCCI/NIKE), không link đi đâu |
| `page.tsx:298-319` testimonial | 3 review bịa sẵn, avatar là emoji 👨‍💼 |
| `page.tsx:338` newsletter | Submit chỉ `setSubmitted(true)` — không gọi API, không lưu email, message "đã gửi mã" là nói dối |
| `page.tsx:10-15` categories | Tên + icon emoji + count viết tay (`'2 sản phẩm sắp xếp'`) — sai chính tả, không nối `/api/categories` |

### 1.2 Kỹ thuật
- **100% `'use client'`** → trang chủ **không có metadata** (title/description/OG thừa kế generic), SEO bằng 0 cho route quan trọng nhất.
- **1 fetch duy nhất** (`/api/products?sortBy=rating&limit=50`) rồi filter bằng JS cho cả 3 section → tải thừa, không dùng được flash-sale thật (`/api/flash-sale/current` tồn tại nhưng không ai gọi).
- Ảnh Unsplash hotlink (`page.tsx:100`, CSP hiện tại allow `images.unsplash.com` nhưng là domain thứ 3 không kiểm soát; đã có 2 banner trong CSP nhưng vẫn là nợ).
- Icon danh mục = emoji (👗💻💄🏠) — thiếu chuyên nghiệp, không scale.
- `px-8`固定 trên mobile (không có `px-4 sm:px-8`), grid hero `hidden lg:block` → mobile mất hoàn toàn visual hero.
- Không có: thanh search nổi bật, carousel promo, tab brand theo danh mục, sticky category nav, skeleton đúng nghĩa (chỉ có `animate-pulse` div), back-to-top, recently-viewed.

### 1.3 Những gì đang TỐT (giữ lại)
- Tông dark luxury `#0B1120` + accent cam `orange-500 → rose-500` đã thành bản sắc — **không đổi màu chủ đạo**, chỉ tinh chỉnh.
- `ProductCard` dùng chung, `extractProducts` chịu được 2 shape response.
- Cấu trúc section rõ ràng, copywriting tiếng Việt ổn.

---

## 2. THAM KHẢO TỪ CÁC TRANG THẬT (đã fetch & đối chiếu)

| Trang | Pattern đáng học | Áp vào đâu |
|---|---|---|
| **Tiki** | Dải cam kết ngay dưới header (100% hàng thật / Freeship / Hoàn 200% / Đổi trả 30 ngày / Giao 2h); lưới danh mục icon; dải thương hiệu nổi bật; "Từ khóa được quan tâm" (SEO + gợi ý search) | Trust bar, category grid, brand strip, trending keywords |
| **CellphoneS** | Hero carousel promo trượt (iPhone/Samsung/OPPO...); USP bar 3 ô (chính hãng / giao nhanh / thu cũ); section deal theo tab danh mục (Điện thoại/Tablet/Laptop/Âm thanh...); brand-row lọc theo từng ngành; form đăng ký voucher bằng email+SĐT; khối B2B/giáo dục | Hero carousel, USP bar, tabbed deal sections, voucher form thật, B2B strip |
| **TGDD** | Hero tập trung 1 chiến dịch lớn (đặt trước iPhone) + CTA kép; ít section, mỗi section 1 message | Hero message tập trung, CTA kép giữ lại |
| **Shopee (pattern chung)** | Flash sale có **countdown thật** + progress bar % đã bán; freeship banner; voucher kho (collect); gợi ý hôm nay (feed vô hạn) | Countdown thật, stock progress, voucher collect, feed "Gợi ý hôm nay" |

**Kết luận định hướng:** giữ linh hồn dark-luxury của MTRUONG-STORE, nhưng học cấu trúc conversion của CellphoneS/Tiki: **trust → promo → deal → category → brand → social proof → capture**.

---

## 3. ĐỊNH HƯỚNG THIẾT KẾ (khóa trước khi code)

### 3.1 Màu sắc — tinh chỉnh, không lật
- Nền: `#0B1120` (giữ) + surface `#131C2E`/`#1E293B` (giữ).
- Accent chính: gradient `orange-500 → rose-500` (giữ) — dùng cho CTA + giá + điểm nhấn.
- Accent phụ mới: `emerald-400` (trust/success), `amber-400` (voucher/gold — đã dùng, chuẩn hóa), `sky-400` (info/link).
- Quy tắc mới: **mỗi section tối đa 1 màu nhấn** + trắng/xám. Hiện tại có section trộn cam + hồng + tím + xanh lá cùng lúc (newsletter gradient 3 màu) → giới hạn lại.
- Dark-only: không làm light mode (ngoài scope).

### 3.2 Typography
- Display/hero: giữ `font-black`, thêm `tracking-tight`, clamp `text-4xl → text-6xl`.
- Section title: chuẩn hóa 1 pattern — eyebrow (`text-xs uppercase tracking-widest` + màu accent) + H2 `text-2xl md:text-3xl font-black` + sub `text-sm text-slate-400`. Hiện tại mỗi section một kiểu.
- Giá: `font-black text-orange-500`, giá gốc `line-through text-slate-500 text-xs`. Chuẩn hóa qua 1 component `Price`.

### 3.3 Icon
- Xóa toàn bộ emoji icon danh mục/sản phẩm → dùng `react-icons/fi` (đã có dep) + ảnh thật từ DB.
- Emoji chỉ giữ trong copywriting thân thiện (toast, empty state), không dùng làm visual chính.

---

## 4. CẤU TRÚC TRANG MỚI (12 section, thứ tự conversion)

```
0. TrustBar          (mới — dải cam kết dưới navbar, học Tiki)
1. Hero              (rebuild — carousel promo + canvas 3D + CTA kép + stats thật)
2. USPBar            (mới — 4 ô: chính hãng / giao 2h / đổi trả 30 ngày / PayOS-VietQR)
3. FlashSale         (rebuild — countdown THẬT + progress % đã bán, nối /api/flash-sale/current)
4. CategoryGrid      (rebuild — nối /api/categories thật, icon ảnh, count thật)
5. DealTabs          (mới — tab theo ngành như CellphoneS: Công nghệ / Thời trang / Làm đẹp / Gia dụng)
6. FeaturedProducts  (giữ + nâng — grid + sort/filter client, nối API phân trang)
7. VoucherVault      (rebuild — nối /api/user/vouchers thật, nút Lưu mã gọi API, countdown hạn)
8. BrandStrip        (nâng — logo ảnh, click lọc sản phẩm theo brand)
9. Testimonials      (nâng — nối review thật từ /api/products/[id]/reviews aggregate, không bịa)
10. B2BStrip         (mới, gọn — banner seller-register: "Bán hàng cùng MTRUONG-STORE")
11. Newsletter       (rebuild — gọi API thật, lưu email, trả voucher thật)
12. TrendingKeywords (mới — học Tiki, vừa SEO vừa gợi ý search)
```

Chi tiết từng section mới/sửa:

**0. TrustBar** — 1 dòng, 5 item icon + text ngắn, marquee nhẹ trên mobile. Dữ liệu tĩnh (cam kết là policy, không cần DB). Ẩn trên scroll-down, hiện lại khi scroll-up (tăng không gian).

**1. Hero (trọng tâm rebuild)** —
- Trái: eyebrow (sự kiện động từ flash-sale đang chạy, fallback text tĩnh), H1 ≤ 12 từ, sub 2 dòng, CTA kép (Mua ngay → `/products`; Săn Flash Sale → `/flash-sale`), stats nối số thật (tổng đơn / tổng sản phẩm / rating TB từ API, cache 1h).
- Phải (desktop): **canvas Three.js** — xem §6. Mobile: fallback ảnh promo tĩnh (không tải three).
- Dưới: carousel promo 3–5 slide (ảnh từ `site-config` hoặc bảng `banner` mới — nếu chưa có bảng thì phase 1 dùng config tĩnh có type, phase sau mới làm admin CRUD banner).

**3. FlashSale** — countdown tính từ `endTime` thật (tick 1s, hết giờ tự refetch + ẩn section), mỗi card thêm **progress bar % đã bán** (`sold/total`), badge `-x%`. Nút "Săn deal" → `/flash-sale`.

**4. CategoryGrid** — fetch `/api/categories` (đã lọc `approved`), ảnh `getCategoryProductImage`, count = số sản phẩm thật (lấy từ API hoặc aggregate nhẹ, cache). Skeleton 8 ô khi loading.

**5. DealTabs** — tab ngành, mỗi tab fetch `/api/products?category=&sortBy=rating&limit=8`. Prefetch tab kề khi hover (desktop). Giữ state tab trên URL (`?tab=`) để share link.

**7. VoucherVault** — card xé vé (ticket notch bằng CSS radial mask), nút "Lưu mã" gọi API collect, trạng thái Đã lưu/Hết hạn/Sắp hết (countdown). Khách chưa login → mở modal login, login xong tự lưu tiếp.

**8. BrandStrip** — marquee vô hạn (CSS animation, pause on hover), logo ảnh grayscale → màu khi hover, click → `/products?brand=`.

**9. Testimonials** — lấy review 5★ mới nhất thật (kèm tên rút gọn + "Đã mua hàng" chỉ khi có đơn completed — không gán bừa). Carousel tự chạy 6s, dots điều hướng.

**11. Newsletter** — POST API thật (tạo endpoint `/api/newsletter/subscribe`: validate email, upsert, rate-limit 3/h như forgot-password, trả voucher code thật 1 lần). Success state hiển thị code để copy (dùng lại pattern VoucherCard).

**12. TrendingKeywords** — 10–12 từ khóa pill → `/products?search=`. Render server (SEO).

**BỎ:** heroStats tĩnh, countdown tĩnh, voucher/testimonial/brand hardcode, nút giỏ hàng chết ở hero card, emoji icon danh mục, Unsplash hotlink (thay bằng ảnh Cloudinary/upload nội bộ).

---

## 5. ANIMATION & TƯƠNG TÁC (spec cụ thể)

Nguyên tắc: **CSS-first, JS khi cần** — không thêm `framer-motion` (bundle ~100KB cho thứ CSS làm được). Three.js là dependency duy nhất được thêm, và chỉ load ở hero desktop.

| # | Hiệu ứng | Kỹ thuật | Áp dụng |
|---|---|---|---|
| A1 | Reveal on scroll (fade+translateY 24px, stagger 80ms) | 1 hook `useReveal()` (IntersectionObserver, `once:true`) + class `.reveal/.revealed` trong `globals.css` | Mọi section title + card grid |
| A2 | Hero entrance | CSS keyframes `hero-up` (stagger bằng `animation-delay` inline) — chạy ngay, không đợi JS | H1, sub, CTA, stats |
| A3 | Countdown tick | `useCountdown(target)` (setInterval 1s, cleanup), flip animation bằng CSS `transform` trên số đổi | FlashSale, VoucherVault |
| A4 | Marquee vô hạn | CSS `@keyframes marquee` (duplicate content 2x), `pause on hover`, `prefers-reduced-motion: off` | BrandStrip, TrustBar mobile |
| A5 | Card hover 3D nhẹ | CSS `group-hover:-translate-y-1 + shadow-glow`, transition 300ms. **Không** tilt-theo-chuột toàn trang (gây say, tốn perf) | ProductCard, CategoryGrid |
| A6 | Stock progress | Div width % + shimmer CSS khi >80% (tạo urgency) | FlashSale cards |
| A7 | Hero carousel | Auto 5s + swipe (touch events native, không lib) + dots + arrows; pause khi tab ẩn (`visibilitychange`) | Hero promo |
| A8 | Sticky mini-nav | Sau khi scroll qua hero: thanh mỏng (logo mini + search + giỏ) slide-down; ẩn khi scroll-down nhanh | Toàn trang (component mới `StickyMiniNav`) |
| A9 | Back-to-top | Xuất hiện sau 600px, smooth scroll | Toàn trang |
| A10 | Canvas 3D hero | §6 | Hero desktop |
| A11 | Skeleton chuẩn | Khớp đúng kích thước card thật (không phải div `h-80` chung chung), shimmer gradient | Mọi grid loading |
| A12 | Toast + micro-copy | Dùng sẵn `Toast` store cho mọi action (lưu voucher, copy, subscribe) | Toàn trang |

Ràng buộc chung: tôn trọng `prefers-reduced-motion` (tắt A1/A4/A10), mọi animation `transform/opacity` only (không animate width/margin), mobile giảm 50% số hiệu ứng chuyển động.

---

## 6. THREE.JS TRONG HERO (vừa đủ, không làm cảnh)

**Mục đích duy nhất:** tạo moment "wow" 3 giây đầu ở hero desktop, không ảnh hưởng conversion khi fail.

- **Nội dung 3D:** 1 trong 2 option (chọn 1): (a) vòng xoay sản phẩm — pedestal + 3–4 sản phẩm hot (dùng ảnh thật làm texture trên card 3D xoay chậm, click card → sang trang sản phẩm); (b) nếu ảnh sản phẩm xấu — abstract "luxury particles": ~300 điểm sáng cam/hồng trôi + torus wireframe xoay chậm, nền transparent hòa vào bg `#0B1120`.
- **Kỹ thuật:** `three` (bare import, bundle local — KHÔNG dùng CDN để khỏi đụng CSP `script-src`). Component `Hero3D.tsx` với `next/dynamic(ssr:false)`. Không dùng `@react-three/fiber` (thêm abstraction + bundle cho 1 scene đơn giản — viết three thuần ~120 dòng).
- **Performance budget:** canvas ≤ 520px, `pixelRatio ≤ 1.5`, `antialias:true`, pause khi tab ẩn / out of viewport (IntersectionObserver), dispose geometry/material/renderer on unmount.
- **Fallback 3 tầng:** (1) mobile/tablet → ảnh promo tĩnh; (2) `prefers-reduced-motion` → ảnh tĩnh; (3) WebGL lỗi hoặc three load fail → ảnh tĩnh (dynamic import có `.catch`). Không bao giờ để hero trống.
- **CSP:** three bundle local (`'self'`) — không cần sửa CSP hiện tại. Không texture cross-origin (ảnh sản phẩm qua proxy/Cloudinary cùng allowlist `img-src`).

---

## 7. NỘI DUNG (content plan — viết thật, bỏ bịa)

- H1/sub hero: 1 message/trận (theo chiến dịch đang chạy từ flash-sale; fallback "Sàn đa nhà bán — chính hãng 100%").
- Stats hero: tổng đơn completed, tổng sản phẩm active, rating TB, tỉnh thành phục vụ — API aggregate + cache 1h + fallback "—" (không hiện số bịa khi API lỗi).
- Voucher/testimonial/brand: 100% từ DB (section nào chưa có API thì **ẩn section**, không render fake).
- Copy chuẩn: giá luôn kèm `₫` + `formatPrice`; countdown hiển thị `HH:MM:SS`; hạn voucher ghi ngày tuyệt đối (`31/03/2026`) kèm tương đối (`còn 2 ngày`).
- SEO: page chuyển sang **server component** (metadata động: title/description/OG/canonical), các island tương tác là client components riêng.

---

## 8. TÍNH NĂNG: THÊM / BỚT / GIỮ

**THÊM (mới hoàn toàn):**
1. Hero promo carousel (auto + swipe) — thay hero tĩnh.
2. Countdown flash-sale thật + stock progress.
3. DealTabs theo ngành (prefetch on hover, state trên URL).
4. Voucher collect thật (API + login-gate + countdown hạn).
5. BrandStrip marquee click-lọc được.
6. TrendingKeywords (SEO + gợi ý search).
7. Newsletter subscribe API thật (rate-limit, trả voucher thật).
8. Testimonials từ review thật + carousel.
9. B2B strip → `/profile/seller-register`.
10. StickyMiniNav + back-to-top + recently-viewed (localStorage, tối đa 8).

**BỚT (xóa):** stats tĩnh, countdown tĩnh, voucher/testimonial/brand hardcode, emoji icon, Unsplash hotlink, nút giỏ hàng chết, `VoucherCard`/`TestimonialCard`/`NewsletterForm` bản fake (viết lại bản nối API).

**GIỮ:** tông dark + accent cam-hồng, CTA kép, `ProductCard`, layout max-w-7xl, copywriting tiếng Việt hiện tại (ráp lại).

**API cần thêm (backend nhỏ, liệt kê để không quên):**
- `GET /api/home/stats` (aggregate cache 1h) — hoặc gộp vào 3 API hiện có nếu ngại thêm route.
- `GET /api/home/banners` (phase 1 có thể là config tĩnh typed; CRUD admin để phase sau).
- `POST /api/newsletter/subscribe` (validate + upsert + rate-limit 3/h + trả voucher 1 lần).
- `GET /api/testimonials` (review 5★ mới nhất, chỉ gắn "Đã mua hàng" khi có đơn completed).
- Mở rộng `/api/products` hỗ trợ `?brand=` (BrandStrip cần).

---

## 9. KẾ HOẠCH TRIỂN KHAI (5 phase, tick dần)

- [x] **Phase 1 — Nền móng (không đổi visual):** tách `page.tsx` thành server page + islands (`HeroSection`, `FlashSaleSection`, ...); tạo `useReveal`, `useCountdown`, CSS keyframes dùng chung; chuẩn hóa `SectionHeader` + `Price`; viết `ProductSkeleton` đúng kích thước. *Verify: build pass, visual y hệt cũ.*
  - Đã làm 2026-10-16: `src/app/(shop)/page.tsx` → server shell mỏng render `<HomePage/>`; 8 islands trong `src/components/home/sections/` (move verbatim, chỉ thay skeleton → `ProductSkeleton`, giá hero → `Price`, header voucher → `SectionHeader`, bọc `Reveal`); thêm `src/hooks/useReveal.ts`, `src/hooks/useCountdown.ts`, `Reveal/SectionHeader/Price/ProductSkeleton`; keyframes + `prefers-reduced-motion` vào `globals.css`. Verify: `tsc` 0, `lint` 0 errors, `next build` pass. Lưu ý: `npm run build` full-chain có thể EPERM ở bước `prisma generate` nếu dev server đang chạy giữ DLL — verify bằng `npx next build` trực tiếp (schema Phase 1 không đổi nên không cần regenerate).
- [x] **Phase 2 — Dữ liệu thật:** nối categories/vouchers/testimonials/stats thật; countdown + progress thật; ẩn section khi API trống; xóa toàn bộ hardcode bịa. *Verify: tắt DB → trang vẫn render skeleton + empty state, không số bịa.*
  - Đã làm 2026-10-16: `GET /api/home/stats` (aggregate + cache 1h), `GET /api/testimonials` (5★ mới nhất, badge "Đã mua hàng" chỉ khi có đơn delivered chứa sản phẩm, cache 10p); `CategorySection`/`VoucherSection`/`TestimonialSection` fetch API thật + skeleton + ẩn khi trống; guest thấy CTA login thay vì mã fake; `FlashSaleSection` tự fetch `/api/flash-sale/current` + `useCountdown` tick thật + progress % đã bán + tự ẩn khi hết giờ/không có event; `HeroSection` nhận stats thật (hiện "—" khi loading). Lệch nhỏ: nút voucher giữ copy-to-clipboard (chưa có bảng collect per-user ở backend).
  - Verify: `tsc` 0, `lint` 0 errors, `next build` pass. Runtime chưa verify được: PG local ở 5432 từ chối credential trong `.env` nên dev server 500 mọi route DB (kể cả API cũ) — cần bạn chạy Postgres đúng như README rồi reload dev server.
  - Update 2026-10-16 (runtime verify DONE): Supabase đã live + seed demo (212 sp/4 cat/100 voucher). Curl dev server: `/api/home/stats` 200 số thật, `/api/categories` 200 (4 approved + count thật), `/api/products` 200, `/api/user/vouchers` 401 đúng (guest → CTA login), `/api/testimonials` 200 rỗng → ẩn section, `/api/flash-sale/current` 200 `{active:false}` → ẩn section. Fix kèm: seed quên `approved:true` (4 danh mục vô hình khắp site) — đã sửa seed + approve 4 dòng.
- [x] **Phase 3 — Section mới:** TrustBar, USPBar, DealTabs, BrandStrip, B2BStrip, TrendingKeywords, StickyMiniNav, recently-viewed, newsletter API. *Verify: click-through từng section.*
  - Đã làm 2026-10-16: migration `newsletter_subscription` + `POST /api/newsletter/subscribe` (validate/rate-limit 3h/upsert/trả voucher thật); TrustBar (ẩn khi scroll-down), USPBar, DealTabs (`?tab=` shareable + prefetch on hover + discard stale), BrandStrip marquee (click → `/products?search=`, không cần cột brand), B2BStrip, TrendingKeywords, StickyMiniNav + back-to-top, RecentlyViewed (localStorage, record ở trang chi tiết), NewsletterSection API thật; xóa `BrandSection` cũ. Lệch nhỏ: `?brand=` đổi thành `?search=` (Product chưa có cột brand).
  - Verify runtime: subscribe 201 + mã thật `SALE1000`; HTML trang chủ chứa đủ section mới; `tsc` 0. "Đã xem gần đây" ẩn đúng khi chưa xem sản phẩm nào.
- [x] **Phase 4 — Motion & 3D:** A1–A12 + `Hero3D` (three thuần, dynamic, 3 tầng fallback), `prefers-reduced-motion`, performance check (Lighthouse mobile ≥ 85, canvas không chạy khi hidden). *Verify: mobile không tải three (Network tab), WebGL off vẫn đẹp.*
  - Đã làm 2026-10-16: A1 Reveal đã phủ mọi section (Phase 1); A2 `hero-up` stagger 0→360ms; A3 countdown tick thật (Phase 2); A4 marquee BrandStrip; A5 hover giữ Tailwind; A6 progress + shimmer khi ≥80%; A8/A9 StickyMiniNav + back-to-top (Phase 3); A11 skeleton shimmer; A12 toast subscribe + copy voucher; A10 `Hero3D` (particles + torus cam/hồng, pixelRatio ≤1.5, pause khi hidden, dispose đầy đủ, fallback 3 tầng). **A7 carousel hoãn lại** — không có nguồn banner (cần bảng/CMS backend, chưa tồn tại).
  - Verify: `tsc` 0, build pass, three nằm 1 chunk dynamic duy nhất, **129KB gz < budget 150KB**. Lighthouse chưa chạy (cần browser + server chạy — dev server của bạn đang tắt).
  - Mở rộng tương tác (theo yêu cầu, sau Phase 4): count-up số liệu hero (`useCountUp`, easeOutExpo, tôn trọng reduced-motion), 3D parallax theo chuột + click nổ hạt trong hero (giới hạn 4 burst, tự dispose), nút CTA magnetic, cursor glow desktop, shine sweep trên card (`.home-shine`), thanh scroll-progress gradient. Chunk 3D vẫn 129KB gz. Verify: `tsc` 0, `lint` 0 errors, build pass.
- [x] **Phase 5 — SEO & polish:** metadata động + JSON-LD (dùng `escapeJsonForHtmlScript` đã có), OG image, alt text ảnh, contrast check, keyboard nav carousel/tabs, `notFound` khi API chết. *Verify: View-source có title/desc/OG; Lighthouse SEO 100.*
  - Đã làm 2026-10-16: `page.tsx` export metadata (title/desc/canonical/OG/Twitter + OG image local), JSON-LD Organization+WebSite (escape đầy đủ). Verify trên HTML prerender: `<title>`, `ld+json`, `og:image` đều có. Còn lại thuộc kiểm tra trình duyệt (contrast/keyboard/Lighthouse) — làm khi bạn mở lại dev server.

**Rủi ro đã lường trước:**
- three.js tăng bundle → chỉ dynamic ở hero desktop, budget < 150KB gz cho chunk 3D.
- API mới (stats/banners/newsletter/testimonials) cần migration hoặc bảng mới → liệt kê trước khi code Phase 2/3.
- Countdown nhiều instance → 1 hook dùng chung, 1 interval/section (không 1 interval/card).
- Không để trang chủ thành SPA fetch-all như cũ: mỗi section fetch riêng, `revalidate` hợp lý (flash-sale 60s, categories 1h, stats 1h).
