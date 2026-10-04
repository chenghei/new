/**
 * 通用格式化工具
 */

// 后端返回的图片为文件名（如 file-xxx.png），统一补全为 /uploads 路径
export const resolveImage = (image) => {
  if (!image) return ''
  if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image
  if (image.startsWith('/')) return image
  return `/uploads/${image}`
}

export const formatPrice = (value) => {
  const num = Number(value || 0)
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export const formatSales = (value) => {
  const num = Number(value || 0)
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

/* -------------------- 订单状态 -------------------- */
export const ORDER_STATUS = {
  pending: { text: '待支付', color: '#ff8f1f', bg: '#fff7e6', tag: 'warning' },
  paid: { text: '待发货', color: '#2f7bff', bg: '#eaf2ff', tag: 'primary' },
  shipped: { text: '待收货', color: '#00a870', bg: '#e8f8f2', tag: 'success' },
  completed: { text: '已完成', color: '#86909c', bg: '#f2f3f5', tag: 'info' },
  cancelled: { text: '已取消', color: '#b3b3b3', bg: '#f7f7f7', tag: 'info' }
}

export const getOrderStatus = (status) =>
  ORDER_STATUS[status] || { text: status || '未知', color: '#86909c', bg: '#f2f3f5', tag: 'info' }

/* -------------------- 商品审核状态 -------------------- */
export const AUDIT_STATUS = {
  pending: { text: '待审核', tag: 'warning' },
  approved: { text: '已通过', tag: 'success' },
  rejected: { text: '未通过', tag: 'danger' }
}

export const getAuditStatus = (status) =>
  AUDIT_STATUS[status] || { text: status || '未知', tag: 'info' }

/* -------------------- 店铺审核状态 -------------------- */
export const SHOP_STATUS = {
  pending: { text: '审核中', tag: 'warning', color: '#ff8f1f' },
  approved: { text: '已通过', tag: 'success', color: '#00a870' },
  rejected: { text: '已拒绝', tag: 'danger', color: '#ff2c55' }
}

export const getShopStatus = (status) =>
  SHOP_STATUS[status] || { text: '未入驻', tag: 'info', color: '#86909c' }

/* -------------------- 售后 -------------------- */
export const AFTER_SALE_TYPE = {
  refund: '仅退款',
  return: '退货退款'
}

export const AFTER_SALE_STATUS = {
  pending: { text: '待处理', tag: 'warning' },
  approved: { text: '已同意', tag: 'primary' },
  rejected: { text: '已拒绝', tag: 'danger' },
  completed: { text: '已完成', tag: 'success' }
}

export const getAfterSaleStatus = (status) =>
  AFTER_SALE_STATUS[status] || { text: status || '未知', tag: 'info' }
