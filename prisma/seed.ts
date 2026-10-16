import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedVouchers } from './seed-vouchers';
import { realisticOriginalPrice, realisticProductPrice } from './product-pricing';
import { assertDemoScriptMayMutateDatabase, requireConfiguredSecret } from '../src/lib/security/script-safety';

const prisma = new PrismaClient();

// Helper function to generate slug from Vietnamese text
function generateSlug(text: string, index?: number): string {
  let slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  if (index !== undefined) {
    slug = `${slug}-${index}`;
  }
  return slug;
}

const products = [
  {
    name: 'Nike Mercurial Vapor 16 Elite FG', price: 5490000, originalPrice: 6500000,
    description: 'Giày đá bóng sân cỏ tự nhiên bản Elite, upper Flyknit siêu nhẹ ôm chân, đinh FG tăng tốc bứt phá. Chính hãng Nike, bao check auth trọn đời.',
    category: 'Giày sân cỏ tự nhiên', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Hot',
    emoji: '👟', gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
  },
  {
    name: 'Adidas Predator Elite FG', price: 5890000, originalPrice: 6900000,
    description: 'Predator Elite với lưỡi gà Strikescale hỗ trợ kiểm soát bóng, đế Controlframe bám sân. Dành cho cầu thủ ưa kiểm soát và sút xoáy.',
    category: 'Giày sân cỏ tự nhiên', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Hot',
    emoji: '👟', gradient: 'linear-gradient(135deg, #111827 0%, #ef4444 100%)',
  },
  {
    name: 'Mizuno Morelia Neo IV Japan', price: 6290000, originalPrice: null,
    description: 'Da kangaroo nguyên tấm Made in Japan, form ôm chân Á Đông, nhẹ và êm hàng đầu phân khúc. Lựa chọn của dân chơi giày thứ thiệt.',
    category: 'Giày sân cỏ tự nhiên', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Premium',
    emoji: '👟', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #f8fafc 100%)',
  },
  {
    name: 'Nike Phantom GX II TF', price: 2190000, originalPrice: 2790000,
    description: 'Bản đế TF chuyên sân cỏ nhân tạo Việt Nam, đinh dăm chống lật cổ chân, upper bám bóng tốt khi trời mưa sân ướt.',
    category: 'Giày sân cỏ nhân tạo', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Bán chạy',
    emoji: '👟', gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  },
  {
    name: 'Adidas Predator League TF', price: 1990000, originalPrice: 2490000,
    description: 'Predator League đế TF quốc dân: êm, bền, giá hợp lý. Phù hợp đá phủi 2-3 trận/tuần, form dễ mang cho chân bè.',
    category: 'Giày sân cỏ nhân tạo', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Bán chạy',
    emoji: '👟', gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  },
  {
    name: 'Puma Future 7 Ultimate FG', price: 5390000, originalPrice: null,
    description: 'Dải Fuzionfit+ khóa cổ chân linh hoạt, đế Dynamic Motion bám đa hướng. Phong cách tốc độ của Neymar Jr.',
    category: 'Giày sân cỏ tự nhiên', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Mới',
    emoji: '👟', gradient: 'linear-gradient(135deg, #db2777 0%, #f472b6 100%)',
  },
  {
    name: 'Nike Lunargato II Futsal', price: 2490000, originalPrice: 2990000,
    description: 'Vua sân futsal: đế IC bám sàn gỗ/sân futsal, da thật mềm mại xử lý bóng trong không gian hẹp. Chuẩn thi đấu futsal.',
    category: 'Giày futsal', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Hot',
    emoji: '👟', gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
  },
  {
    name: 'Joma Top Flex Futsal', price: 1790000, originalPrice: 2190000,
    description: 'Top Flex — huyền thoại futsal Tây Ban Nha: da thật, đế xoay PIVOT hỗ trợ đổi hướng nhanh, bền bỉ vượt tầm giá.',
    category: 'Giày futsal', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Bán chạy',
    emoji: '👟', gradient: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
  },
  {
    name: 'Kamito Velocidad TF', price: 1490000, originalPrice: 1790000,
    description: 'Thương hiệu Việt được Quang Hải tin dùng: da tổng hợp cao cấp, đế TF bám tốt, form chuẩn chân người Việt. Giá phủi thân thiện.',
    category: 'Giày sân cỏ nhân tạo', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Bán chạy',
    emoji: '👟', gradient: 'linear-gradient(135deg, #dc2626 0%, #fca5a5 100%)',
  },
  {
    name: 'Mizuno Monarcida Neo II AS', price: 2390000, originalPrice: null,
    description: 'Da thật êm chân, đế AS đa năng đá được cả sân nhân tạo lẫn futsal. Độ bền Mizuno trứ danh, càng đá càng mềm.',
    category: 'Giày sân cỏ nhân tạo', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: null,
    emoji: '👟', gradient: 'linear-gradient(135deg, #0f766e 0%, #5eead4 100%)',
  },
  {
    name: 'Bóng Động Lực UHV 2.07', price: 690000, originalPrice: 850000,
    description: 'Bóng thi đấu đạt chuẩn FIFA Quality, size 5, da PU chống thấm nước, đường may sâu giữ form. Bóng chính thức nhiều giải phong trào.',
    category: 'Phụ kiện bóng đá', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: 'Sale',
    emoji: '⚽', gradient: 'linear-gradient(135deg, #16a34a 0%, #86efac 100%)',
  },
  {
    name: 'Tất chống trượt Compressport', price: 1990000, originalPrice: null,
    description: 'Tất thi đấu chống trượt với đệm silicone lòng bàn chân, thoáng khí, ôm cổ chân. Phụ kiện nhỏ nhưng khác biệt lớn khi bứt tốc.',
    category: 'Phụ kiện bóng đá', rating: 0, reviews: 0, inStock: true, stockQuantity: 50, badge: null,
    emoji: '🧦', gradient: 'linear-gradient(135deg, #4d7c0f 0%, #a3e635 100%)',
  },
];

// Function to generate 200 products
function generateProducts() {
  const categories = ['Giày sân cỏ tự nhiên', 'Giày sân cỏ nhân tạo', 'Giày futsal', 'Phụ kiện bóng đá'];
  const emojis = ['👟', '⚽', '🧦', '🥅', '🧤', '🎽', '🏟️', '💪', '🔥', '⭐', '🏆', '💨'];
  const badges = ['Hot', 'Sale', 'Mới', 'Bán chạy', 'Premium', null];
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  ];

  const productNames = [
    'Nike Mercurial Vapor 16 Elite FG', 'Nike Phantom GX II Elite FG', 'Nike Tiempo Legend 10 Elite', 'Adidas Predator Elite FG',
    'Adidas F50 Elite FG', 'Adidas Copa Pure 2 Elite', 'Puma Future 7 Ultimate FG', 'Puma Ultra 5 Carbon FG',
    'Mizuno Morelia Neo IV Japan', 'New Balance Furon v8 FG', 'New Balance Tekela v4 FG', 'Nike Mercurial Vapor 16 Academy',
    'Adidas Predator League FG', 'Puma Ultra Play FG', 'Mizuno Monarcida Neo III', 'Grand Sport Copa FG', 'Kamito TA11 Pro',
    'Nike Phantom GX II TF', 'Adidas Predator League TF', 'Mizuno Monarcida Neo II AS', 'Puma Future Play TT',
    'Joma Propulsion Lite TF', 'Zocker Strike TF', 'Mitre Delta TF', 'Kamito Velocidad TF', 'Grand Sport GTX TF', 'Động Lực Spectre TF',
    'Nike Lunargato II Futsal', 'Adidas Top Sala Competition', 'Mizuno Morelia Sala Club IC', 'Joma Top Flex Futsal',
    'Kelme Michel Futsal', 'Grand Sport Futsal Pro', 'Kamito GRL Futsal', 'Zocker Futsal Pro IC', 'Mitre Futsal X', 'Pan Vigor X Futsal',
    'Nike Mercurial Vapor 16 Kids', 'Adidas Predator Kids TF', 'Puma Kids Star TF',
    'Bóng Động Lực UHV 2.07', 'Bóng Mitre Impel', 'Tất chống trượt Compressport', 'Bó gối Mueller', 'Băng quấn cổ chân',
    'Túi đựng giày đá bóng', 'Xịt khử mùi giày', 'Đế lót giày thể thao', 'Găng tay thủ môn Adidas', 'Băng đội trưởng',
    'Còi trọng tài kèm thẻ', 'Túi lưới đựng bóng',
  ];

  const descriptions = [
    'Giày đá bóng chính hãng 100%, bao check auth trọn đời. Form chuẩn, đế bám tốt trên mặt sân tương ứng.',
    'Upper ôm chân, hỗ trợ kiểm soát bóng và bứt tốc. Đổi size miễn phí trong 30 ngày nếu không vừa.',
    'Độ bền đã được kiểm chứng qua hàng ngàn trận phủi. Càng đá càng mềm, càng êm.',
    'Lựa chọn của dân đá phủi: giá hợp lý, chất lượng vượt tầm giá, bảo hành keo chỉ 6 tháng.',
    'Thiết kế từ hãng lớn, công nghệ upper mới nhất giúp xử lý bóng tự tin trong mọi tình huống.',
    'Phù hợp đá 2-3 trận/tuần. Tư vấn chọn size theo form chân miễn phí qua hotline.',
    'Phụ kiện bóng đá thiết yếu, chất lượng thi đấu, giá bình dân cho anh em phong trào.',
    'Hàng chính hãng đầy đủ hóa đơn. Phát hiện fake đền 200% giá trị đơn hàng.',
  ];

  const newProducts = [];
  for (let i = 0; i < 200; i++) {
    const nameIndex = i % productNames.length;
    const categoryIndex = i % categories.length;
    const price = realisticProductPrice(productNames[nameIndex], i);
    const hasDiscount = Math.random() > 0.4;
    
    newProducts.push({
      name: `${productNames[nameIndex]} ${i + 1}`,
      price: price,
      originalPrice: realisticOriginalPrice(price, hasDiscount, i),
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      category: categories[categoryIndex],
      // Dữ liệu thật: không bịa rating/review. Tồn đầu kỳ 50 để chủ shop
      // kiểm kê lại trong Admin → Kho hàng trước go-live.
      rating: 0,
      reviews: 0,
      stockQuantity: 50,
      inStock: true,
      badge: badges[Math.floor(Math.random() * badges.length)],
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      gradient: gradients[Math.floor(Math.random() * gradients.length)],
    });
  }
  return newProducts;
}

const generatedProducts = generateProducts();
const allProducts = [...products, ...generatedProducts];

async function main() {
  assertDemoScriptMayMutateDatabase({ scriptName: 'prisma/seed.ts', optInEnv: 'DEMO_SEED_ENABLED' });
  console.log('🌱 Bắt đầu seed database...');

  // Xóa data cũ
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.address.deleteMany();
  await prisma.bankInfo.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  let userCount = 0;
  let adminCount = 0;
  let productCount = 0;

  // Tạo admin user
  const adminPassword = await bcrypt.hash(requireConfiguredSecret(process.env.DEMO_ADMIN_PASSWORD, 'DEMO_ADMIN_PASSWORD'), 12);
  adminCount++;
  const admin = await prisma.user.create({
    data: {
      code: `AD${String(adminCount).padStart(3, '0')}`,
      name: 'Admin',
      email: 'truongcri0101@gmail.com',
      password: adminPassword,
      role: 'admin',
      phone: '0868544769',
      gender: 'male',
      birthday: new Date('2007-01-01'),
    },
  });
  console.log(`✅ Tạo admin: ${admin.email} (${admin.code})`);

  // Tạo test user
  const userPassword = await bcrypt.hash(requireConfiguredSecret(process.env.DEMO_USER_PASSWORD, 'DEMO_USER_PASSWORD'), 12);
  userCount++;
  const user = await prisma.user.create({
    data: {
      code: `US${String(userCount).padStart(3, '0')}`,
      name: 'Test User',
      email: 'user@cun-shop.store',
      password: userPassword,
      role: 'user',
      phone: '0123456789',
      gender: 'female',
      birthday: new Date('1990-05-15'),
    },
  });
  console.log(`✅ Tạo user: ${user.email} (${user.code})`);

  // Tạo shipper user mẫu
  const shipperPassword = await bcrypt.hash(requireConfiguredSecret(process.env.DEMO_SHIPPER_PASSWORD, 'DEMO_SHIPPER_PASSWORD'), 12);
  const shipper = await prisma.user.create({
    data: {
      code: 'SH001',
      name: 'Nguyễn Văn Giao',
      email: 'shipper@cun-shop.store',
      password: shipperPassword,
      role: 'shipper',
      phone: '0987654321',
      licensePlate: '29A-123.45',
      transportType: 'Xe máy (Yamaha Exciter)',
      gender: 'male',
      birthday: new Date('1995-10-20'),
    },
  });
  console.log(`✅ Tạo shipper: ${shipper.email} (SH001)`);

  // Tạo categories
  const categoriesData = ['Giày sân cỏ tự nhiên', 'Giày sân cỏ nhân tạo', 'Giày futsal', 'Phụ kiện bóng đá'];
  const categoryMap: Record<string, string> = {};
  for (const catName of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        name: catName,
        slug: catName.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        approved: true, // Seed demo: visible ngay, khỏi chờ duyệt tay (Phase 2)
      }
    });
    categoryMap[catName] = cat.id;
  }
  console.log(`✅ Tạo ${categoriesData.length} danh mục`);

  // Tồn kho: dùng đúng số đầu kỳ khai báo trong catalog (mặc định 50), KHÔNG random.
  // Chủ shop phải kiểm kê và sửa lại trong Admin → Kho hàng trước khi bán thật.
  for (const product of allProducts) {
    const { category, ...rest } = product;
    productCount++;
    const stockQty = rest.stockQuantity ?? 50;
    await prisma.product.create({ 
      data: {
        ...rest,
        code: `PR${String(productCount).padStart(3, '0')}`,
        slug: generateSlug(product.name),
        categoryId: categoryMap[category],
        stockQuantity: stockQty,
        inStock: stockQty > 0,
      } 
    });
  }
  console.log(`✅ Tạo ${allProducts.length} sản phẩm`);

  await seedVouchers(admin.id, 100);

  console.log('\n🎉 Seed hoàn thành!');
  console.log('📧 Admin:  truongcri0101@gmail.com (AD001)');
  console.log('📧 User:   user@cun-shop.store (US001)');
  console.log('📧 Shipper: shipper@cun-shop.store (SH001)');
  console.log(`📦 Tổng sản phẩm: ${allProducts.length} (PR001 - PR${String(allProducts.length).padStart(3, '0')})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
