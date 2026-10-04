/**
 * 通用格式化工具
 */

// 后端返回的商品图片为文件名（如 file-xxx.png），统一补全为 /uploads 路径；
// 若本身已是完整 URL 或 data URI 则原样返回
export const resolveImage = (image) => {
  if (!image) return ''
  if (/^(https?:)?\/\//.test(image) || image.startsWith('data:')) return image
  if (image.startsWith('/')) return image
  return `/uploads/${image}`
}

// 价格格式化：保留两位小数，去除多余尾零
export const formatPrice = (value) => {
  const num = Number(value || 0)
  if (Number.isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// 时间格式化：YYYY-MM-DD HH:mm
export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

// 订单状态映射：文案 / 主题色（用于 el-tag 的 type 或自定义颜色）
export const ORDER_STATUS = {
  pending: { text: '待支付', color: '#ff8f1f', bg: '#fff7e6' },
  paid: { text: '待发货', color: '#2f7bff', bg: '#eaf2ff' },
  shipped: { text: '待收货', color: '#00a870', bg: '#e8f8f2' },
  completed: { text: '已完成', color: '#8a8a8a', bg: '#f2f2f2' },
  cancelled: { text: '已取消', color: '#b3b3b3', bg: '#f7f7f7' }
}

export const getOrderStatus = (status) =>
  ORDER_STATUS[status] || { text: status || '未知', color: '#8a8a8a', bg: '#f2f2f2' }

// 售后类型映射
export const AFTER_SALE_TYPE = {
  refund: '仅退款',
  return: '退货退款'
}

// 售后状态映射
export const AFTER_SALE_STATUS = {
  pending: { text: '待处理', color: '#ff8f1f', bg: '#fff7e6' },
  approved: { text: '已同意', color: '#2f7bff', bg: '#eaf2ff' },
  rejected: { text: '已拒绝', color: '#ff2c55', bg: '#fff0f3' },
  completed: { text: '已完成', color: '#00a870', bg: '#e8f8f2' }
}

export const getAfterSaleStatus = (status) =>
  AFTER_SALE_STATUS[status] || { text: status || '未知', color: '#8a8a8a', bg: '#f2f2f2' }

// 销量格式化：1万以上显示为 x.x万
export const formatSales = (value) => {
  const num = Number(value || 0)
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}
