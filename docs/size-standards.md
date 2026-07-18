# Size Standards & Suggested Defaults

This document summarizes recommended default size profiles that the admin UI seeds and suggests. It is intended to be used by the `SizeProfile` seed script and as admin guidance when creating or editing size profiles.

Sources and notes
- General garment sizing conventions (S/M/L/XL) are common across retail. For precise conversions and measurements, consult brand-specific charts (e.g., ASOS, Nike, Adidas) and international conversion tables.
- Shoe sizing varies by region (EU/UK/US) and by age (adults vs kids). When in doubt, offer EU sizes as a stable numeric baseline and consider adding mapping metadata (meta: { us: '8', uk: '7' }).

Recommended default profiles (examples)

1) Clothes - Standard (S, M, L, XL)
- `name`: Clothes - Standard (S,M,L,XL)
- `category`: clothes
- `type`: clothes
- `gender`: unisex (or men/women/kids as appropriate)
- `sizes`:
  - S (value: "S", label: "Small")
  - M (value: "M", label: "Medium")
  - L (value: "L", label: "Large")
  - XL (value: "XL", label: "Extra Large")

2) Shoes - Men (EU baseline)
- `name`: Shoes - Men (EU)
- `category`: shoes
- `type`: shoes
- `gender`: men
- `sizes`: 40, 41, 42, 43, 44, 45, 46 (values as strings)
- `meta` (optional): include `us`/`uk` mappings for each entry where available

3) Shoes - Women (EU baseline)
- `sizes`: 36, 37, 38, 39, 40, 41

4) Shoes - Kids (EU baseline)
- `sizes`: 28, 29, 30, 31, 32, 33, 34

5) Accessories
- One-size (OS) or small set of numeric/lengths depending on product (belts, hats, etc.)

Extensibility & metadata
- Each `SizeProfile.sizes` entry can include a `meta` field for:
  - international conversions: `{ us: '8', uk: '7', eu: '41' }`
  - measurement units: `{ chest_cm: 96, waist_cm: 80 }`
  - inventory SKU modifiers
- Admins can create new `SizeProfile` entries for region or brand-specific charts; products reference profiles by ID but store per-product `availableSizes` independently.

Admin UI behavior recommendations
- When a product category is selected, automatically fetch relevant `SizeProfile` entries filtered by `category` and `gender`.
- Provide two display modes for selecting available sizes:
  1. Boxes: quick visual toggles for short lists (clothes S/M/L/XL).
  2. Dropdown multi-select: better for long numeric lists (shoe sizes).
- Show unavailable sizes with a clear cross icon (✖) or disabled style; clicking toggles availability and only affects that product's `availableSizes`.
- Allow admins to open a "Manage Size Profiles" page to add/update/delete profiles without code changes.

Seeding and maintenance
- The existing `backend/scripts/seed-size-profiles.js` contains a compact set of defaults. Consider adding additional profiles for US/UK mappings and brand-specific charts and run with `--force` when safe in development.

International considerations
- If you need to present sizes to customers in their locale, store both the baseline value and conversion metadata in the profile's `meta`. Convert on render using that mapping.

Quick next steps for the repo
- Add an admin CRUD UI for `SizeProfile` (list, create, update, delete).
- Enhance seeds with US/UK mappings if desired.
- Add `docs/size-standards.md` to repo (this file) so admins/developers can review and extend.

