const { Op } = require('sequelize');
const User = require('../models/User');
const Order = require('../models/Order');
const { success, error } = require('../utils/response');

// 获取商城统计数据
exports.getDashboardStats = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 只有管理员可以查看统计数据
    if (user.role !== 'admin') {
      return error(res, '无权限查看统计数据', 403);
    }

    // 获取今日的开始和结束时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 统计总用户数
    const totalUsers = await User.count();

    // 统计总完成订单数
    const totalCompletedOrders = await Order.count({
      where: { status: 'completed' }
    });

    // 统计总未完成订单数（进行中）
    const totalOngoingOrders = await Order.count({
      where: { status: 'ongoing' }
    });

    // 统计今日订单数
    const todayOrders = await Order.count({
      where: {
        created_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // 统计今日已完成订单数
    const todayCompletedOrders = await Order.count({
      where: {
        status: 'completed',
        updated_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // 统计总订单数
    const totalOrders = await Order.count();

    // 统计今日新增用户数
    const todayNewUsers = await User.count({
      where: {
        created_at: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    return success(res, {
      totalUsers,
      totalOrders,
      totalCompletedOrders,
      totalOngoingOrders,
      todayOrders,
      todayCompletedOrders,
      todayNewUsers
    }, '获取统计数据成功');
  } catch (err) {
    console.error('获取统计数据失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};

// 获取最近订单列表
exports.getRecentOrders = async (req, res) => {
  try {
    const { user } = req;
    const { limit = 10 } = req.query;

    if (!user) {
      return error(res, '请先登录', 401);
    }

    // 只有管理员可以查看
    if (user.role !== 'admin') {
      return error(res, '无权限查看', 403);
    }

    const orders = await Order.findAll({
      include: [
        {
          model: require('../models/Product'),
          as: 'product',
          attributes: ['id', 'name', 'image', 'price', 'user_id'],
          include: [
            {
              model: User,
              as: 'merchant',
              attributes: ['id', 'username', 'nickname']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    return success(res, orders, '获取最近订单成功');
  } catch (err) {
    console.error('获取最近订单失败:', err);
    return error(res, '服务器内部错误', 500);
  }
};
