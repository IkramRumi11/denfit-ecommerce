# Detail Templates

This document shows example `DetailTemplate` JSON structures and how to use them via the admin UI or API.

Example template (Clothing - Default):

```json
{
  "name": "Clothing - Default",
  "categorySlug": "clothing",
  "sections": [
    {
      "title": "Description",
      "type": "description",
      "content": "<p>Classic cotton jacket with a regular fit. Breathable and durable.</p>",
      "order": 0,
      "published": true
    },
    {
      "title": "How to Use / Styling",
      "type": "howto",
      "content": "<ul><li>Pair with jeans for a casual look.</li><li>Machine wash cold.</li></ul>",
      "order": 1,
      "published": true
    },
    {
      "title": "Materials & Care",
      "type": "care",
      "content": "<p>100% Cotton. Wash inside out. Do not tumble dry.</p>",
      "order": 2,
      "published": true
    },
    {
      "title": "Size & Fit",
      "type": "size",
      "content": "<p>Model is 6'1" and wears size M. See size guide for measurements.</p>",
      "order": 3,
      "published": true,
      "links": { "sizeGuideUrl": "/static/size-guides/clothing-size-guide.pdf" }
    },
    {
      "title": "Delivery & Returns",
      "type": "delivery",
      "content": "<p>Standard delivery 3-7 business days. Returns accepted within 14 days unless marked Final Sale.</p>",
      "order": 4,
      "published": true,
      "flags": { "noExchange": false, "noReturns": false }
    }
  ]
}
```

How to apply via API (admin):

- Create template: POST `/api/v1/admin/detail-templates` with JSON body `{ name, categorySlug, sections }` (authenticated admin).
- Assign template to product: PATCH `/api/v1/admin/products/:id/detail-sections` with body `{ detailTemplate: "<templateId>" }`.
- Override product sections directly: PATCH `/api/v1/admin/products/:id/detail-sections` with body `{ detailSections: [ ... ] }`.

Frontend notes:
- The `GET /api/v1/products/:id` response will include `detailSections`. If a product has no `detailSections`, the server will merge the linked `detailTemplate`'s sections into the response automatically.
- `content` is stored as sanitized HTML; the frontend should render it as HTML inside a safe container.

Admin UI:
- The admin UI page `/admin/detail-templates` allows creating/editing templates using a JSON editor (textarea) and provides a quick assign helper to assign templates to a product by ID.

Accessibility & security:
- Always sanitize admin HTML on input server-side (the backend stores sanitized HTML ideally). The current implementation expects admins to provide safe HTML or sanitized content.

