import Order from '../models/Order.js';

export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * 0.16; // 16% GST
    const shippingCost = subtotal > 2000 ? 0 : 200; // Free shipping over 2000
    const total = subtotal + taxAmount + shippingCost;

    const order = await Order.create({
      customer: req.user.id,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      taxAmount,
      shippingCost,
      total
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order'
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
};