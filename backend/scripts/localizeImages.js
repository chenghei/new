/**
 * 图片本地化脚本（localizeImages.js）
 * ------------------------------------------------------------------
 * 作用：把项目当前引用的远程图片（商品图、店铺 Logo/资质、首页轮播图）
 *       下载到 backend/uploads，并把数据库中的地址改写为本地文件名，
 *       同时生成 uploads/local-images.json 清单，供种子脚本复用。
 *
 * 用法：node scripts/localizeImages.js
 * 说明：脚本可重复执行；已是本地文件名的记录会自动跳过。
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');
const Product = require('../src/models/Product');
const Shop = require('../src/models/Shop');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const MANIFEST_PATH = path.join(UPLOAD_DIR, 'local-images.json');

// 用户端首页轮播图（前端代码中直接引用，需同步替换为本地文件）
const BANNERS = [
  {
    name: 'banner-1',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20ecommerce%20banner%2C%20consumer%20electronics%20smartphone%20laptop%20headphones%20flat%20lay%20on%20vivid%20orange%20gradient%20background%2C%20bright%20studio%20lighting%2C%20professional%20product%20photography%2C%20no%20text&image_size=landscape_16_9'
  },
  {
    name: 'banner-2',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20ecommerce%20banner%2C%20cozy%20home%20lifestyle%20products%2C%20living%20room%20interior%20with%20plants%20and%20furniture%2C%20warm%20sunlight%2C%20professional%20photography%2C%20no%20text&image_size=landscape_16_9'
  },
  {
    name: 'banner-3',
    url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20AI%20shopping%20assistant%20concept%2C%20digital%20sparkles%20and%20shopping%20bags%2C%20purple%20orange%20gradient%20background%2C%203d%20render%2C%20no%20text&image_size=landscape_16_9'
  }
];

const isRemote = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

const extFromContentType = (contentType) => {
  if (!contentType) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('bmp')) return 'bmp';
  return 'jpg';
};

// 下载单个图片到 uploads，返回本地文件名
const download = async (url, baseName) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (!buffer.length) throw new Error('返回内容为空');
    const ext = extFromContentType(resp.headers.get('content-type'));
    const filename = `${baseName}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    return { filename, size: buffer.length };
  } finally {
    clearTimeout(timer);
  }
};

const run = async () => {
  await sequelize.authenticate();
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    productImages: [],
    shopImages: [],
    licenseImages: [],
    bannerImages: []
  };
  const failed = [];

  // 1) 商品图片（按 id 升序，便于种子脚本按顺序复用）
  const products = await Product.findAll({ order: [['id', 'ASC']] });
  for (const product of products) {
    if (!isRemote(product.image)) continue;
    try {
      const { filename } = await download(product.image, `product-${product.id}`);
      await product.update({ image: filename });
      manifest.productImages.push(filename);
      console.log(`[商品] #${product.id} -> ${filename}`);
    } catch (err) {
      failed.push(`product#${product.id}: ${err.message}`);
    }
  }

  // 2) 店铺 Logo 与资质证件
  const shops = await Shop.findAll({ order: [['id', 'ASC']] });
  for (const shop of shops) {
    if (isRemote(shop.logo)) {
      try {
        const { filename } = await download(shop.logo, `shop-${shop.id}-logo`);
        await shop.update({ logo: filename });
        manifest.shopImages.push(filename);
        console.log(`[店铺Logo] #${shop.id} -> ${filename}`);
      } catch (err) {
        failed.push(`shop#${shop.id}.logo: ${err.message}`);
      }
    }
    if (isRemote(shop.license_image)) {
      try {
        const { filename } = await download(shop.license_image, `shop-${shop.id}-license`);
        await shop.update({ license_image: filename });
        manifest.licenseImages.push(filename);
        console.log(`[店铺资质] #${shop.id} -> ${filename}`);
      } catch (err) {
        failed.push(`shop#${shop.id}.license: ${err.message}`);
      }
    }
  }

  // 3) 首页轮播图（供前端代码引用）
  for (const banner of BANNERS) {
    try {
      const { filename } = await download(banner.url, banner.name);
      manifest.bannerImages.push(filename);
      console.log(`[轮播图] ${banner.name} -> ${filename}`);
    } catch (err) {
      failed.push(`${banner.name}: ${err.message}`);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log('\n===== 图片本地化完成 =====');
  console.log(`商品图 ${manifest.productImages.length} 张 / 店铺Logo ${manifest.shopImages.length} 张 / 资质 ${manifest.licenseImages.length} 张 / 轮播图 ${manifest.bannerImages.length} 张`);
  console.log(`清单文件：${MANIFEST_PATH}`);
  if (failed.length) {
    console.log(`\n以下 ${failed.length} 张下载失败（保持原远程地址）：`);
    failed.forEach((item) => console.log('  - ' + item));
  }
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('图片本地化失败:', err);
    process.exit(1);
  });
