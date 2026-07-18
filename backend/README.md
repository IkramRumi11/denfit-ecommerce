# Backend PDF & Barcode Notes

This backend uses the following for invoice generation:

- PDF generation: `pdfkit` is the default engine. Invoices are rendered server-side and streamed as PDF to admin users when requesting the invoice PDF endpoint.
- Barcode generation: `bwip-js` is used to produce CODE-128 barcodes from the order number. Barcode generation is attempted for invoices, but failures are handled gracefully: if barcode generation fails, the invoice will still be produced without the barcode.

Future option:
- If richer HTML/CSS styling is required for invoices, an optional HTML-based rendering mode using Puppeteer (headless Chromium) can be added later. That mode is not enabled by default to avoid the large Chromium download and added runtime overhead — the current default remains `pdfkit` for faster installs and lower resource usage.

Usage / testing:

1. Install backend dependencies:

```powershell
cd backend
npm install
```

2. Start the backend and call the admin invoice PDF endpoint (admin-auth required):

```
GET /api/v1/admin/orders/:id/invoice/pdf
```

Ensure the order has a `carrier` (courier) value set; the endpoint will return HTTP 400 if `carrier` is missing.
