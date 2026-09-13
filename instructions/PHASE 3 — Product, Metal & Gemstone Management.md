# PHASE 3 — Product, Metal & Gemstone Management

Continue the existing Jewellery ERP Admin Portal.

Implement the complete jewellery master-data management experience.

## Product Management

Build:

- Product Categories
- Product Types
- Collections
- Brands
- Jewellery Designs
- Products
- Sizes
- Product Images

Support:

- Create
- Edit
- View
- Activate/deactivate
- Search
- Filter
- Pagination

## Jewellery Design

Design a rich detail page:

```text
Product Image
Product Code
Design Code
Category
Collection
Brand
Metal
Default Purity
Size
Description
Status
```

Support multiple product images.

## Metal Management

Build:

- Metal master
- Purity master
- Gold rate management
- Wastage configuration
- Metal conversion

Example:

```text
Gold
 ├── 18K
 ├── 22K
 └── 24K

Silver
Platinum
White Gold
```

## Gold Rate UI

Create a professional rate management screen:

```text
Metal       Purity       Buy Rate       Sell Rate       Effective From
Gold        22K          ...            ...             ...
Gold        24K          ...            ...             ...
```

Support rate history.

Never overwrite historical rates.

## Gemstone

Build:

- Gemstone master
- Diamond master
- Stone certificates

Diamond fields:

```text
Carat
Cut
Colour
Clarity
Shape
Certificate Number
```

Certificate upload should use the existing file-storage API.

## Design

Make the product detail pages premium and image-focused while keeping the overall ERP experience professional.

Use reusable forms and tables.

Do not create duplicate components for similar master-data screens.