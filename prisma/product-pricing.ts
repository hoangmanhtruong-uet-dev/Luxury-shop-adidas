// Giá realism cho catalog GIÀY ĐÁ BÓNG Cún-shop.
// Quy tắc khớp theo keyword (đã normalize, không dấu). Thứ tự quan trọng:
// dòng cụ thể (academy/league/tf/kids) phải đứng TRƯỚC dòng chung của hãng,
// vì `find` lấy rule đầu tiên khớp.
const PRICE_RULES: Array<[string, number]> = [
  // Trẻ em
  ['kids', 990_000],
  // Nike — bản academy/league trước, elite sau
  ['vapor 16 academy', 2_290_000],
  ['lunargato ii', 2_490_000],
  ['phantom gx ii tf', 2_190_000],
  ['mercurial vapor 16', 5_490_000],
  ['phantom gx ii', 5_790_000],
  ['tiempo legend 10', 5_990_000],
  // Adidas
  ['predator league tf', 1_990_000],
  ['predator league', 2_090_000],
  ['top sala competition', 2_190_000],
  ['predator elite', 5_890_000],
  ['f50 elite', 5_690_000],
  ['copa pure 2', 5_290_000],
  // Puma
  ['future play', 1_690_000],
  ['ultra play', 1_590_000],
  ['future 7', 5_390_000],
  ['ultra 5', 5_990_000],
  // Mizuno
  ['morelia sala club', 1_890_000],
  ['monarcida neo ii as', 2_290_000],
  ['morelia neo iv', 6_290_000],
  ['monarcida', 2_390_000],
  // New Balance
  ['furon v8', 5_190_000],
  ['tekela v4', 4_990_000],
  // Joma / Kelme / Pan
  ['top flex', 1_790_000],
  ['propulsion lite', 1_590_000],
  ['michel', 1_490_000],
  ['vigor', 1_290_000],
  // Thương hiệu Việt / phổ thông
  ['kamito ta11', 1_290_000],
  ['kamito velocidad', 1_490_000],
  ['kamito grl', 899_000],
  ['zocker strike', 1_390_000],
  ['zocker futsal pro', 799_000],
  ['mitre delta', 1_190_000],
  ['mitre futsal x', 749_000],
  ['grand sport gtx', 1_090_000],
  ['grand sport futsal pro', 849_000],
  ['grand sport copa', 1_990_000],
  ['dong luc spectre', 1_190_000],
  // Phụ kiện
  ['mitre impel', 550_000],
  ['dong luc uhv', 690_000],
  ['tat chong truot', 199_000],
  ['bo goi', 249_000],
  ['bang quan co chan', 99_000],
  ['tui dung giay', 299_000],
  ['xit khu mui', 149_000],
  ['de lot giay', 199_000],
  ['gang tay thu mon', 899_000],
  ['bang doi truong', 119_000],
  ['coi trong tai', 129_000],
  ['tui luoi dung bong', 159_000],
];

function normalized(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function roundToTenThousand(value: number) {
  return Math.max(100_000, Math.round(value / 10_000) * 10_000);
}

export function realisticProductPrice(name: string, index = 0, fallback?: number) {
  const cleanName = normalized(name);
  const rule = PRICE_RULES.find(([keyword]) => cleanName.includes(keyword));
  const basePrice = rule?.[1] ?? fallback ?? 1_500_000;
  const variant = Math.floor(index / 50) % 4;
  const multiplier = [0.95, 1, 1.05, 1.1][variant];
  return roundToTenThousand(basePrice * multiplier);
}

export function realisticOriginalPrice(price: number, hasDiscount: boolean, index = 0) {
  if (!hasDiscount) return null;
  const markup = 1.15 + (index % 4) * 0.05;
  return roundToTenThousand(price * markup);
}
