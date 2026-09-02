import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import Order from '../models/Order.js';
import { getColorName, resolveColorHex } from '../utils/colorHelper.js';

function formatPaymentMethod(key) {
  if (!key) return '';
  try {
    return String(key)
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch (e) {
    return String(key);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TAX_RATE = Number(process.env.TAX_RATE) || 0.13;

async function generateBarcodeBase64(orderNumber) {
  try {
    const bwipjs = await import('bwip-js');
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: String(orderNumber),
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    });
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (err) {
    // bwip-js not installed or generation failed — return null and let template show empty placeholder
    console.warn('Barcode generation failed (bwip-js missing or error):', err?.message || err);
    return null;
  }
}

export const getInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).lean().populate?.('items.product', 'name images sku variants') || await Order.findById(orderId).populate('items.product', 'name images sku variants').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Calculate total items
    const totalItems = (order.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    // Calculate subtotal (use stored subtotal if present, otherwise sum line totals)
    const subtotal = (typeof order.subtotal === 'number' && !Number.isNaN(order.subtotal)) ? Number(order.subtotal) : (order.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
    // TAX FEATURE TEMPORARILY DISABLED FOR CUSTOMER INVOICES
    // Original tax logic preserved for future reactivation.
    // Use stored taxAmount internally, but do NOT expose or include tax in customer-facing invoice totals.
    const storedTax = (typeof order.legacyTax === 'number' && !Number.isNaN(order.legacyTax))
      ? Number(order.legacyTax)
      : ((typeof order.taxAmount === 'number' && !Number.isNaN(order.taxAmount)) ? Number(order.taxAmount) : Math.round((subtotal * TAX_RATE) * 100) / 100);
    // For customer-facing invoice, zero-out tax to avoid showing or charging customers.
    const tax = 0; // customer-facing tax suppressed
    // Shipping cost: use stored shippingCost if present; otherwise apply rule: subtotal < 5000 => 300 fixed, else 0
    const shipping = (typeof order.shippingCost === 'number' && !Number.isNaN(order.shippingCost)) ? Number(order.shippingCost) : ((subtotal < 5000) ? 300 : 0);
    // Preserve original total calculation in variable for future use (not used in customer invoice)
    const originalTotal = Math.round((subtotal + storedTax + shipping) * 100) / 100;
    // But for customer-facing invoice, exclude tax
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    // Amount due (if paid, zero)
    const amount = (String(order.paymentStatus || '').toLowerCase() === 'paid') ? 0 : total;

    // Enrich each item with SKU where possible (use order item sku, else product.sku, else matching variant.sku)
    try {
      for (const it of (order.items || [])) {
        try {
          if (!it.sku && it.product) {
            const prod = it.product;
            if (prod.sku) it.sku = prod.sku;
            else if (Array.isArray(prod.variants) && prod.variants.length) {
              let found = null;
              if (it.color && it.color.name) {
                found = prod.variants.find(v => v && v.name && String(v.name).toLowerCase() === String(it.color.name).toLowerCase());
              }
              if (!found && it.size) {
                found = prod.variants.find(v => Array.isArray(v.availableSizes) && v.availableSizes.includes(it.size));
              }
              if (!found && prod.variants.length === 1) found = prod.variants[0];
              if (found && found.sku) it.sku = found.sku;
            }
          }
        } catch (e) {
          // ignore per-item enrichment errors
        }
      }
    } catch (e) {
      // ignore enrichment failures
    }

    // Payment amount rules (use previously computed `total` and stored `order.total` when appropriate)

    // Courier validation: require for shipped/delivered orders, optional/Not Assigned otherwise
    const isShippedOrDelivered = ['shipped', 'delivered'].includes(String(order.status).toLowerCase());
    const courier = order.carrier || null;
    if (isShippedOrDelivered && !courier) {
      return res.status(400).json({ success: false, message: 'Courier name is required for shipped/delivered orders. Please set tracking info first.' });
    }
    const displayCourier = courier || 'Not Assigned';

    // Generate barcode (base64 data URI) using orderNumber
    const barcodeDataUri = await generateBarcodeBase64(order.orderNumber || order._id);

    // Render template
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice.ejs');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: 'Invoice template missing on server' });
    }

    const ejs = await import('ejs');
    // Attempt to fetch brand logo and provide a data URI for embedding in HTML
    let logoDataUri = null;
    const logoUrl = process.env.BRAND_LOGO || process.env.DEFAULT_BRAND_LOGO || 'https://i.ibb.co/GQG243Rb/DENFiT.jpg';
    if (logoUrl) {
      try {
        const fetchFn = (typeof globalThis.fetch === 'function') ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
        const r = await fetchFn(logoUrl);
        if (r && r.ok) {
          const contentType = r.headers && (r.headers.get ? r.headers.get('content-type') : r.headers['content-type']) || 'image/png';
          const ab = await r.arrayBuffer();
          const buf = Buffer.from(ab);
          logoDataUri = `data:${contentType};base64,${buf.toString('base64')}`;
        } else {
          console.warn('Logo fetch for invoice HTML returned non-ok response:', r && r.status);
        }
      } catch (e) {
        console.warn('Failed to fetch brand logo for HTML embedding:', e?.message || e);
      }
    }
    const html = await ejs.renderFile(templatePath, {
      brand: {
        name: process.env.BRAND_NAME || 'Denfit',
        logo: process.env.BRAND_LOGO || process.env.DEFAULT_BRAND_LOGO || '',
        logoDataUri
      },
      // provide a human-friendly label for payment method to the template
      order: Object.assign({}, order, { formattedPaymentMethod: formatPaymentMethod(order.paymentMethod) }),
      totalItems,
      subtotal,
      // include storedTax so templates or admin code can access preserved value if needed
      tax: tax,
      storedTax,
      shipping,
      total,
      amount,
      courier: displayCourier,
      date: new Date(),
      barcodeDataUri,
      getColorName,
      resolveColorHex
    }, { async: true });
    // Return HTML for print/download. Set a relaxed CSP for this invoice response
    // so externally-hosted brand logos (e.g., Cloudinary) can load when needed.
    // This overrides the global CSP for this response only.
    const csp = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:;";
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error('getInvoice error:', err);
    return next(err);
  }
};

export const getInvoicePdf = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('items.product', 'name images sku variants').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const totalItems = (order.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    // Calculate subtotal (use stored subtotal if present, otherwise sum line totals)
    const subtotal = (typeof order.subtotal === 'number' && !Number.isNaN(order.subtotal)) ? Number(order.subtotal) : (order.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
    // TAX FEATURE TEMPORARILY DISABLED FOR CUSTOMER INVOICES
    // Preserve stored tax but do not expose/include it in customer-facing PDF invoices.
    const storedTax = (typeof order.legacyTax === 'number' && !Number.isNaN(order.legacyTax))
      ? Number(order.legacyTax)
      : ((typeof order.taxAmount === 'number' && !Number.isNaN(order.taxAmount)) ? Number(order.taxAmount) : Math.round((subtotal * TAX_RATE) * 100) / 100);
    const tax = 0; // suppressed for customer PDF
    // Shipping cost: use stored shippingCost if present; otherwise apply rule: subtotal < 5000 => 300 fixed, else 0
    const shipping = (typeof order.shippingCost === 'number' && !Number.isNaN(order.shippingCost)) ? Number(order.shippingCost) : ((subtotal < 5000) ? 300 : 0);
    const originalTotal = Math.round((subtotal + storedTax + shipping) * 100) / 100;
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    const amount = (String(order.paymentStatus || '').toLowerCase() === 'paid') ? 0 : total;
    // Courier validation: require for shipped/delivered orders, optional/Not Assigned otherwise
    const isShippedOrDelivered = ['shipped', 'delivered'].includes(String(order.status).toLowerCase());
    const courier = order.carrier || null;
    if (isShippedOrDelivered && !courier) {
      return res.status(400).json({ success: false, message: 'Courier name is required for shipped/delivered orders. Please set tracking info first.' });
    }
    const displayCourier = courier || 'Not Assigned';

    const barcodeDataUri = await generateBarcodeBase64(order.orderNumber || order._id);
    // Enrich each item with SKU where possible (use order item sku, else product.sku, else matching variant.sku)
    try {
      for (const it of (order.items || [])) {
        try {
          if (!it.sku && it.product) {
            const prod = it.product;
            if (prod.sku) it.sku = prod.sku;
            else if (Array.isArray(prod.variants) && prod.variants.length) {
              let found = null;
              if (it.color && it.color.name) {
                found = prod.variants.find(v => v && v.name && String(v.name).toLowerCase() === String(it.color.name).toLowerCase());
              }
              if (!found && it.size) {
                found = prod.variants.find(v => Array.isArray(v.availableSizes) && v.availableSizes.includes(it.size));
              }
              if (!found && prod.variants.length === 1) found = prod.variants[0];
              if (found && found.sku) it.sku = found.sku;
            }
          }
        } catch (e) {
          // ignore per-item enrichment errors
        }
      }
    } catch (e) {
      // ignore enrichment failures
    }
    // Render the same HTML invoice template (used by the Print view) and generate PDF via Puppeteer
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice.ejs');
    const ejs = await import('ejs');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ success: false, message: 'Invoice template missing on server' });
    }

    // Prepare logoDataUri similar to getInvoice so HTML matches
    let logoDataUri = null;
    const logoUrl = process.env.BRAND_LOGO || process.env.DEFAULT_BRAND_LOGO || 'https://i.ibb.co/GQG243Rb/DENFiT.jpg';
    if (logoUrl) {
      try {
        const fetchFn = (typeof globalThis.fetch === 'function') ? globalThis.fetch.bind(globalThis) : (await import('node-fetch')).default;
        const r = await fetchFn(logoUrl);
        if (r && r.ok) {
          const contentType = r.headers && (r.headers.get ? r.headers.get('content-type') : r.headers['content-type']) || 'image/png';
          const ab = await r.arrayBuffer();
          const buf = Buffer.from(ab);
          logoDataUri = `data:${contentType};base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('Logo fetch for PDF rendering returned error:', e?.message || e);
      }
    }

    const html = await ejs.renderFile(templatePath, {
      brand: {
        name: process.env.BRAND_NAME || 'Denfit',
        logo: process.env.BRAND_LOGO || process.env.DEFAULT_BRAND_LOGO || '',
        logoDataUri
      },
      order: Object.assign({}, order, { formattedPaymentMethod: formatPaymentMethod(order.paymentMethod) }),
      totalItems,
      subtotal,
      tax,
      storedTax,
      shipping,
      total,
      amount,
      courier: displayCourier,
      date: new Date(),
      barcodeDataUri,
      getColorName,
      resolveColorHex
    }, { async: true });

    // Use Puppeteer to render the HTML to PDF so print and download look identical
    try {
      const puppeteer = await import('puppeteer');
      const launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      };
      const browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '36px', bottom: '36px', left: '36px', right: '36px' } });
      await browser.close();

      const filename = `invoice-${order.orderNumber || order._id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      // use end() to avoid any encoding/transformations that may corrupt binary data
      res.status(200).end(pdfBuffer);
    } catch (e) {
      console.error('Puppeteer PDF generation failed:', e && (e.stack || e.message || e));
      return res.status(500).json({ success: false, message: 'Failed to generate PDF invoice' });
    }
  } catch (err) {
    console.error('getInvoicePdf error:', err);
    return next(err);
  }
};
