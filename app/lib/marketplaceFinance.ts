export type PlatformName = "TikTok" | "Shopee" | "Tokopedia" | "Internal" | string;

export type SalesItem = {
  platform?: PlatformName;
  orderId?: string;
  order_id?: string;
  noPesanan?: string;
  no_pesanan?: string;
  date?: string;
  orderDate?: string;
  productName?: string;
  product_name?: string;
  namaProduk?: string;
  nama_produk?: string;
  variationName?: string;
  variation_name?: string;
  marketplaceSku?: string;
  sku?: string;
  sellerSku?: string;
  seller_sku?: string;
  sku_produk?: string;
  skuId?: string;
  sku_id?: string;
  idSku?: string;
  id_sku?: string;
  variationId?: string;
  variation_id?: string;
  idVariasi?: string;
  id_variasi?: string;
  quantity?: number;
  qty?: number;
  jumlah?: number;
  amount?: number;
  itemAmount?: number;
  status?: string;
  rawData?: unknown;
};

export type ProductCostRow = {
  id?: string | number;
  platform?: PlatformName;
  marketplace?: string;
  platforms?: string[];
  sku?: string;
  sku_produk?: string;
  skuProduk?: string;
  internalSku?: string;
  internal_sku?: string;
  marketplaceSku?: string;
  marketplace_sku?: string;
  sellerSku?: string;
  seller_sku?: string;
  marketplaceSkuId?: string;
  marketplace_sku_id?: string;
  skuId?: string;
  sku_id?: string;
  marketplaceVariationId?: string;
  marketplace_variation_id?: string;
  variationId?: string;
  variation_id?: string;
  name?: string;
  nama?: string;
  namaProduk?: string;
  nama_produk?: string;
  variation?: string;
  variationName?: string;
  hargaModal?: number;
  harga_modal?: number;
  hpp?: number;
  effectiveFrom?: string;
  effective_from?: string;
  berlakuMulai?: string;
  effectiveTo?: string;
  effective_to?: string;
  berlakuSampai?: string;
  status?: string;
};

export type NormalizedSalesItem = {
  platform: string;
  orderId: string;
  orderDate: string;
  productName: string;
  variationName: string;
  marketplaceSku: string;
  skuId: string;
  variationId: string;
  quantity: number;
  itemAmount: number;
  status: string;
  rawData?: unknown;
};

export type HppItemResult = NormalizedSalesItem & {
  hppPerItem: number;
  totalHpp: number;
  hppStatus: "Valid" | "Belum Mapping";
  matchedSku: string;
};

export type HppCalculation = {
  orderItems: HppItemResult[];
  totalHpp: number;
  hppPerItem: number;
  hppStatus: "Valid" | "Belum Mapping" | "Dikesampingkan - Batal/Retur";
  hppMissingSkus: string[];
  hppRule: string;
  isFinalProfit: boolean;
};

export const normalizeKey = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");

export const cleanOrderId = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/e\+?/i.test(text)) {
    const asNumber = Number(text);
    if (!Number.isNaN(asNumber)) return asNumber.toLocaleString("fullwide", { useGrouping: false }).split(".")[0];
  }
  return text.split(".")[0].replace(/\s/g, "");
};

export const parseCurrency = (value: unknown) => {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return Math.round(value);
  let text = String(value).trim().replace(/Rp/gi, "").replace(/\s/g, "");
  if (text.includes(",") && text.includes(".")) {
    if (text.indexOf(",") < text.indexOf(".")) text = text.replace(/,/g, "");
    else text = text.replace(/\./g, "").replace(/,/g, ".");
  } else if (text.includes(",")) {
    const parts = text.split(",");
    text = parts[parts.length - 1].length === 2 ? text.replace(/,/g, ".") : text.replace(/,/g, "");
  } else if (text.includes(".")) {
    const parts = text.split(".");
    if (parts[parts.length - 1].length !== 2) text = text.replace(/\./g, "");
  }
  text = text.replace(/[^0-9.-]/g, "");
  const number = Number(text);
  return Number.isNaN(number) ? 0 : Math.round(number);
};

export const parseNumber = (value: unknown) => {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isNaN(number) ? 0 : number;
};

export const toISODate = (value: unknown) => {
  if (!value || value === "-") return "";
  if (!Number.isNaN(Number(value)) && Number(value) > 20000) {
    const date = new Date(Math.round((Number(value) - 25569) * 86400 * 1000));
    return date.toISOString().split("T")[0];
  }
  const raw = String(value).trim().split(" ")[0];
  if (!raw) return "";
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
};

export const formatDateDisplay = (value: unknown) => {
  if (!value || value === "-") return "-";
  const iso = toISODate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(value);
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const formatRupiah = (value: unknown) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

export const cleanObjectKeys = (row: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  Object.keys(row || {}).forEach((key) => {
    result[String(key).replace(/\s+/g, " ").trim()] = row[key];
  });
  return result;
};

export const readCell = (row: Record<string, unknown>, keys: string[]) => {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const entries = Object.entries(row || {});
  for (const key of keys) {
    const target = clean(key);
    const found = entries.find(([actual]) => clean(actual) === target);
    if (found) return found[1];
  }
  for (const key of keys) {
    const target = clean(key);
    const found = entries.find(([actual]) => clean(actual).includes(target) || target.includes(clean(actual)));
    if (found) return found[1];
  }
  return undefined;
};

export const normalizeSalesItem = (item: SalesItem, fallbackPlatform: string): NormalizedSalesItem => {
  const platform = String(item.platform || fallbackPlatform || "").trim();
  const orderId = cleanOrderId(item.orderId || item.order_id || item.noPesanan || item.no_pesanan);
  const marketplaceSku = String(item.marketplaceSku || item.sku || item.sellerSku || item.seller_sku || item.sku_produk || "").trim();
  const skuId = String(item.skuId || item.sku_id || item.idSku || item.id_sku || "").trim();
  const variationId = String(item.variationId || item.variation_id || item.idVariasi || item.id_variasi || "").trim();
  const quantity = Number(item.quantity || item.qty || item.jumlah || 1) || 1;
  return {
    platform,
    orderId,
    orderDate: String(item.orderDate || item.date || "-").trim(),
    productName: String(item.productName || item.product_name || item.namaProduk || item.nama_produk || "-").trim(),
    variationName: String(item.variationName || item.variation_name || "-").trim(),
    marketplaceSku,
    skuId,
    variationId,
    quantity,
    itemAmount: parseCurrency(item.itemAmount || item.amount || 0),
    status: String(item.status || "Unknown").trim(),
    rawData: item.rawData,
  };
};

export const getSalesItemsByOrderId = (salesOrders: SalesItem[], platform: string, orderId: string, fallback?: Partial<NormalizedSalesItem>) => {
  const orderKey = cleanOrderId(orderId);
  const platformKey = normalizeKey(platform);
  const items = (salesOrders || [])
    .map((item) => normalizeSalesItem(item, platform))
    .filter((item) => cleanOrderId(item.orderId) === orderKey && normalizeKey(item.platform || platform) === platformKey);

  if (items.length > 0) return items;

  return [{
    platform,
    orderId: orderKey,
    orderDate: fallback?.orderDate || "-",
    productName: fallback?.productName || "-",
    variationName: fallback?.variationName || "-",
    marketplaceSku: fallback?.marketplaceSku || "",
    skuId: fallback?.skuId || "",
    variationId: fallback?.variationId || "",
    quantity: Number(fallback?.quantity || 1) || 1,
    itemAmount: Number(fallback?.itemAmount || 0) || 0,
    status: fallback?.status || "Unknown",
  }];
};

export const getProductPlatform = (product: ProductCostRow) => String(product.platform || product.marketplace || (Array.isArray(product.platforms) ? product.platforms[0] : "")).trim();

export const getProductSkuKeys = (product: ProductCostRow) => [
  product.marketplaceSku,
  product.marketplace_sku,
  product.sellerSku,
  product.seller_sku,
  product.marketplaceSkuId,
  product.marketplace_sku_id,
  product.skuId,
  product.sku_id,
  product.marketplaceVariationId,
  product.marketplace_variation_id,
  product.variationId,
  product.variation_id,
  product.internalSku,
  product.internal_sku,
  product.sku,
  product.sku_produk,
  product.skuProduk,
].map(normalizeKey).filter(Boolean);

export const getItemSkuKeys = (item: NormalizedSalesItem) => [
  item.marketplaceSku,
  item.skuId,
  item.variationId,
].map(normalizeKey).filter(Boolean);

export const findProductCost = (products: ProductCostRow[], platform: string, item: NormalizedSalesItem, orderDate: string) => {
  const platformKey = normalizeKey(platform);
  const itemSkuKeys = getItemSkuKeys(item);
  if (itemSkuKeys.length === 0) return null;

  const matches = (products || []).filter((product) => {
    const productPlatformKeys = [
      getProductPlatform(product),
      ...(Array.isArray(product.platforms) ? product.platforms : []),
    ].map(normalizeKey).filter(Boolean);

    if (!productPlatformKeys.includes(platformKey) && !productPlatformKeys.includes("internal")) return false;
    const productSkuKeys = getProductSkuKeys(product);
    const skuMatched = itemSkuKeys.some((sku) => productSkuKeys.includes(sku));
    if (!skuMatched) return false;

    const effectiveFrom = toISODate(product.effectiveFrom || product.effective_from || product.berlakuMulai);
    const effectiveTo = toISODate(product.effectiveTo || product.effective_to || product.berlakuSampai);
    const normalizedOrderDate = toISODate(orderDate);

    if (effectiveFrom && normalizedOrderDate && normalizedOrderDate < effectiveFrom) return false;
    if (effectiveTo && normalizedOrderDate && normalizedOrderDate > effectiveTo) return false;

    return true;
  });

  return matches[0] || null;
};

export const getCostValue = (product: ProductCostRow | null) => {
  if (!product) return 0;
  return parseCurrency(product.hargaModal || product.harga_modal || product.hpp || 0);
};

export const getHppPolicy = (status: string, net: number, refundAmount = 0) => {
  const text = String(status || "").toLowerCase();
  const isCancelled = text.includes("batal") || text.includes("cancel");
  const isRefund = text.includes("retur") || text.includes("refund") || refundAmount > 0;

  if (isCancelled) {
    return {
      ignoreCost: true,
      status: "Dikesampingkan - Batal/Retur" as const,
      rule: "Batal: HPP 0 karena transaksi tidak dianggap sebagai barang terjual",
    };
  }

  if (isRefund && net <= 0) {
    return {
      ignoreCost: true,
      status: "Dikesampingkan - Batal/Retur" as const,
      rule: "Retur/Refund penuh: HPP 0 karena barang diasumsikan kembali atau transaksi tidak menghasilkan penjualan final",
    };
  }

  if (isRefund && net > 0) {
    return {
      ignoreCost: false,
      status: null,
      rule: "Refund sebagian: HPP tetap dihitung, profit mengikuti nilai settlement bersih",
    };
  }

  return {
    ignoreCost: false,
    status: null,
    rule: "Selesai: HPP dihitung dari platform + SKU marketplace + tanggal berlaku",
  };
};

export const calculateOrderHpp = (params: {
  salesOrders: SalesItem[];
  products: ProductCostRow[];
  platform: string;
  orderId: string;
  orderDate: string;
  status: string;
  net: number;
  refundAmount?: number;
  fallback?: Partial<NormalizedSalesItem>;
}): HppCalculation => {
  const policy = getHppPolicy(params.status, params.net, params.refundAmount || 0);
  const orderItems = getSalesItemsByOrderId(params.salesOrders, params.platform, params.orderId, params.fallback);

  if (policy.ignoreCost) {
    return {
      orderItems: orderItems.map((item) => ({
        ...item,
        hppPerItem: 0,
        totalHpp: 0,
        hppStatus: "Valid",
        matchedSku: "",
      })),
      totalHpp: 0,
      hppPerItem: 0,
      hppStatus: policy.status ?? "Dikesampingkan - Batal/Retur",
      hppMissingSkus: [],
      hppRule: policy.rule,
      isFinalProfit: true,
    };
  }

  let totalHpp = 0;
  let firstHpp = 0;
  const missingSkus: string[] = [];

  const resultItems = orderItems.map((item) => {
    const matchedProduct = findProductCost(params.products, params.platform, item, params.orderDate || item.orderDate);
    const hpp = getCostValue(matchedProduct);
    const quantity = Number(item.quantity || 1) || 1;
    const status: HppItemResult["hppStatus"] = matchedProduct && hpp > 0 ? "Valid" : "Belum Mapping";

    if (status === "Belum Mapping") {
      missingSkus.push(
        item.marketplaceSku ||
        item.skuId ||
        item.variationId ||
        (item.productName && item.productName !== "-" ? item.productName : "SKU kosong")
      );
    }

    if (firstHpp === 0 && hpp > 0) firstHpp = hpp;
    totalHpp += hpp * quantity;

    return {
      ...item,
      hppPerItem: hpp,
      totalHpp: hpp * quantity,
      hppStatus: status,
      matchedSku: matchedProduct ? String(matchedProduct.marketplaceSku || matchedProduct.sku || matchedProduct.internalSku || "") : "",
    };
  });

  const hppStatus = missingSkus.length === 0 ? "Valid" : "Belum Mapping";

  return {
    orderItems: resultItems,
    totalHpp: hppStatus === "Valid" ? totalHpp : 0,
    hppPerItem: hppStatus === "Valid" ? firstHpp : 0,
    hppStatus,
    hppMissingSkus: missingSkus,
    hppRule: policy.rule,
    isFinalProfit: hppStatus === "Valid",
  };
};
