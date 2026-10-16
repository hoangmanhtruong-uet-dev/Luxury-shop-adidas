import { Metadata } from 'next';
import prisma from '@/lib/db';
import { getCategoryProductImage } from '@/lib/upload/product-image';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const product = await prisma.product.findFirst({
    where: { 
      OR: [
        { id: params.id },
        { slug: params.id }
      ]
    },
    include: { categoryRef: true }
  });

  if (!product) {
    return {
      title: 'Sản phẩm không tồn tại',
    };
  }

  const defaultImage = getCategoryProductImage(product.categoryRef?.name);
  const imageUrl = product.image || defaultImage;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    title: product.name,
    description: product.description?.substring(0, 160) || `Mua ngay ${product.name} chính hãng tại Cún-shop với giá tốt nhất.`,
    openGraph: {
      title: product.name,
      description: product.description?.substring(0, 160) || `Sở hữu ${product.name} với khuyến mãi độc quyền.`,
      url: `${baseUrl}/products/${product.slug || product.id}`,
      siteName: 'Cún-shop',
      images: [
        {
          url: imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description?.substring(0, 160) || `Sở hữu ${product.name} với khuyến mãi độc quyền.`,
      images: [imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`],
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
