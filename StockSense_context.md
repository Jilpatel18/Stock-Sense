# StockSense --- Project Context

## 1. Project Overview

**StockSense** is a modular Inventory Management System (IMS) designed
to digitize and centralize stock-related operations for a business.

The system replaces manual registers, Excel sheets, and scattered
inventory-tracking methods with a centralized, real-time, easy-to-use
web application.

### Primary Goal

Provide a single system where inventory managers and warehouse staff
can:

-   Manage products and categories
-   Track stock by warehouse/location
-   Receive incoming goods
-   Process outgoing deliveries
-   Move stock internally
-   Correct physical-vs-recorded stock mismatches
-   View inventory KPIs and operational status
-   Track every stock movement through a stock ledger
-   Receive low-stock alerts
-   Work across multiple warehouses

Source: StockSense hackathon problem statement.

------------------------------------------------------------------------

## 2. Target Users

### Inventory Manager

Responsible for:

-   Managing incoming stock
-   Managing outgoing stock
-   Creating/updating products
-   Monitoring inventory levels
-   Managing warehouses/locations
-   Reviewing stock operations
-   Monitoring low-stock items and operational KPIs

### Warehouse Staff

Responsible for:

-   Receiving goods
-   Picking items
-   Packing items
-   Shelving/put-away
-   Internal stock transfers
-   Physical stock counting
-   Inventory adjustments

------------------------------------------------------------------------

## 3. Technology Stack

The application will be built with:

### Frontend / Full-stack Framework

**Next.js**

Use Next.js for:

-   Application routing
-   UI
-   Server-side functionality where appropriate
-   API/server actions where appropriate
-   Authentication integration
-   Dashboard pages
-   Product and inventory workflows

### Database

**Neon PostgreSQL**

Neon PostgreSQL will be the primary relational database.

The database should be designed around inventory correctness,
transaction history, warehouse/location tracking, and auditability.

### Suggested Supporting Technologies

These are implementation choices rather than requirements explicitly
stated in the problem statement:

-   TypeScript
-   Tailwind CSS
-   shadcn/ui or another component system
-   Drizzle ORM or Prisma
-   Zod for validation
-   Auth.js/another authentication solution
-   PostgreSQL transactions for stock-changing operations

Do not treat these supporting technologies as mandatory requirements of
the hackathon problem.

------------------------------------------------------------------------

# 4. Core Domain Model

The most important concept in StockSense is that **stock is not just a
number**.

Stock exists for a specific:

-   Product
-   Location/Warehouse

And changes because of an inventory operation.

Every stock-changing operation should therefore be traceable through a
**Stock Ledger**.

------------------------------------------------------------------------

# 5. Main Navigation

The problem statement defines the following major navigation areas:

1.  Products
2.  Operations
    -   Receipts
    -   Delivery Orders
    -   Inventory Adjustment
    -   Move History
    -   Dashboard
    -   Settings
        -   Warehouse
3.  Profile Menu
    -   My Profile
    -   Logout

------------------------------------------------------------------------

# 6. Authentication

The application requires:

-   User signup
-   User login
-   OTP-based password reset
-   Redirect to Inventory Dashboard after authentication

### Authentication Flow

``` text
User
  |
  +--> Sign Up
  |
  +--> Login
  |
  +--> Forgot Password
          |
          +--> OTP Verification
          |
          +--> Reset Password
  |
  +--> Inventory Dashboard
```

Authentication should protect all inventory-management pages.

------------------------------------------------------------------------

# 7. Dashboard

The dashboard is the main operational overview.

## Dashboard KPIs

Display:

-   Total Products in Stock
-   Low Stock / Out of Stock Items
-   Pending Receipts
-   Pending Deliveries
-   Internal Transfers Scheduled

The dashboard should provide a quick snapshot rather than requiring the
user to open individual modules.

------------------------------------------------------------------------

# 8. Dashboard Filters

The problem statement requires dynamic filtering.

### By Document Type

-   Receipts
-   Delivery
-   Internal
-   Adjustments

### By Status

-   Draft
-   Waiting
-   Ready
-   Done
-   Canceled

### By Warehouse / Location

Filter inventory operations according to warehouse/location.

### By Product Category

Filter operations/products by category.

------------------------------------------------------------------------

# 9. Product Management

Users must be able to create and update products.

Each product can contain:

-   Name
-   SKU / Code
-   Category
-   Unit of Measure
-   Initial Stock (optional)

Additional product functionality:

-   Stock availability per location
-   Product categories
-   Reordering rules
-   SKU search
-   Smart filters

### Important Design Principle

Do not make `product.stock` the only source of truth.

Stock needs to be location-aware.

Example:

``` text
Steel Rods
├── Main Warehouse: 500
├── Production Floor: 100
└── Warehouse 2: 250
```

The total available stock is derived from location-level inventory.

------------------------------------------------------------------------

# 10. Warehouse and Location Management

StockSense supports multiple warehouses.

A warehouse can contain multiple locations.

Example:

``` text
Warehouse 1
├── Rack A
├── Rack B
└── Production Floor

Warehouse 2
├── Rack A
└── Dispatch Area
```

Stock movement can happen:

-   Between locations in the same warehouse
-   Between warehouses
-   Between storage and production locations

------------------------------------------------------------------------

# 11. Receipts --- Incoming Stock

Receipts represent goods arriving from vendors.

## Receipt Workflow

``` text
Create Receipt
      |
      v
Select Supplier
      |
      v
Add Products
      |
      v
Enter Received Quantities
      |
      v
Validate
      |
      v
Increase Stock
      |
      v
Create Stock Ledger Entries
```

### Example

Receive:

``` text
50 Steel Rods
```

Result:

``` text
Steel Rods Stock: +50
```

The increase should happen when the receipt is validated, not merely
when a draft receipt is created.

------------------------------------------------------------------------

# 12. Delivery Orders --- Outgoing Stock

Delivery orders represent stock leaving the warehouse for customer
shipment.

## Delivery Workflow

``` text
Create Delivery
      |
      v
Select/Pick Items
      |
      v
Pack Items
      |
      v
Validate
      |
      v
Decrease Stock
      |
      v
Create Stock Ledger Entries
```

### Example

Customer order:

``` text
10 Chairs
```

After validation:

``` text
Chair Stock: -10
```

The system must prevent invalid stock operations where the available
quantity is insufficient, unless an explicit business rule is introduced
later.

------------------------------------------------------------------------

# 13. Internal Transfers

Internal transfers move stock between company-owned locations.

Examples:

``` text
Main Warehouse
      |
      v
Production Floor
```

or:

``` text
Rack A
  |
  v
Rack B
```

or:

``` text
Warehouse 1
  |
  v
Warehouse 2
```

### Important Rule

An internal transfer does **not** change the company's total stock.

It changes the stock location.

Example:

Before:

``` text
Main Warehouse: 100
Production Rack: 20
Total: 120
```

Move 30 from Main Warehouse to Production Rack:

``` text
Main Warehouse: 70
Production Rack: 50
Total: 120
```

Every movement must be recorded in the Stock Ledger.

------------------------------------------------------------------------

# 14. Inventory Adjustments

Inventory adjustments reconcile recorded inventory with the physical
count.

Example:

System says:

``` text
Steel = 100 kg
```

Physical count:

``` text
Steel = 97 kg
```

Adjustment:

``` text
-3 kg
```

## Adjustment Workflow

``` text
Select Product
      |
      v
Select Location
      |
      v
Enter Physical Count
      |
      v
Calculate Difference
      |
      v
Validate Adjustment
      |
      v
Update Stock
      |
      v
Create Ledger Entry
```

The system should preserve the adjustment history.

------------------------------------------------------------------------

# 15. Stock Ledger

The Stock Ledger is one of the most important parts of StockSense.

Every stock-changing event should create an immutable history entry.

Events include:

-   Receipt
-   Delivery
-   Internal Transfer
-   Inventory Adjustment

A ledger entry should conceptually capture:

``` text
Product
Location
Quantity Change
Operation Type
Reference Document
Before Quantity
After Quantity
Timestamp
User
```

Example:

``` text
Product: Steel Rods
Location: Main Warehouse
Operation: Receipt
Quantity Change: +50
Before: 100
After: 150
Reference: REC-00021
User: Inventory Manager
Timestamp: ...
```

For an internal transfer, the ledger should represent both sides of the
movement:

``` text
Main Warehouse: -30
Production Rack: +30
```

Total stock remains unchanged.

------------------------------------------------------------------------

# 16. Inventory Statuses

The problem statement defines these statuses:

``` text
Draft
Waiting
Ready
Done
Canceled
```

These statuses should be used consistently for operational documents.

Suggested conceptual lifecycle:

``` text
Draft
  |
  v
Waiting / Ready
  |
  v
Done
```

A document may also become:

``` text
Canceled
```

Only the appropriate final validation action should modify stock.

Do not increase/decrease inventory merely because a document exists in
Draft.

------------------------------------------------------------------------

# 17. Low Stock and Reordering

StockSense requires:

-   Low-stock alerts
-   Reordering rules

A product can have a reorder threshold.

Conceptually:

``` text
Current Stock <= Reorder Level
          |
          v
     Low Stock Alert
```

Example:

``` text
Product: Steel Rods
Current Stock: 18
Reorder Level: 25
Status: LOW STOCK
```

The exact reorder algorithm and procurement workflow are not specified
in the problem statement and should remain configurable.

------------------------------------------------------------------------

# 18. Search and Filtering

The application should support:

-   SKU search
-   Product search
-   Smart filters
-   Warehouse/location filtering
-   Product category filtering
-   Document-type filtering
-   Status filtering

The UI should make it possible for warehouse staff to quickly locate the
required item or operation.

------------------------------------------------------------------------

# 19. Complete Inventory Flow

The problem statement provides this example:

## Step 1 --- Receive Goods

Receive:

``` text
100 kg Steel
```

Stock:

``` text
+100
```

## Step 2 --- Move Stock

Move:

``` text
Main Store → Production Rack
```

Total company stock:

``` text
Unchanged
```

Location quantities change.

## Step 3 --- Deliver Finished Goods

Deliver:

``` text
20 steel
```

Relevant stock:

``` text
-20
```

## Step 4 --- Damaged Stock

Physical damage:

``` text
3 kg steel damaged
```

Adjustment:

``` text
-3
```

All operations are recorded in the Stock Ledger.

------------------------------------------------------------------------

# 20. Recommended Database Architecture

The following is a practical database model for implementing the
requirements with Neon PostgreSQL.

## Users

``` text
users
- id
- name
- email
- password_hash
- role
- created_at
- updated_at
```

Possible roles:

``` text
INVENTORY_MANAGER
WAREHOUSE_STAFF
```

The exact authorization model can be expanded later.

------------------------------------------------------------------------

## Categories

``` text
categories
- id
- name
- description
- created_at
```

------------------------------------------------------------------------

## Products

``` text
products
- id
- name
- sku
- category_id
- unit_of_measure
- reorder_level
- created_at
- updated_at
```

SKU should be unique.

------------------------------------------------------------------------

## Warehouses

``` text
warehouses
- id
- name
- code
- address
- created_at
- updated_at
```

------------------------------------------------------------------------

## Locations

``` text
locations
- id
- warehouse_id
- name
- code
- location_type
- created_at
```

Examples:

``` text
Rack A
Rack B
Production Floor
Dispatch Area
```

------------------------------------------------------------------------

## Inventory

This represents current quantity of a product at a location.

``` text
inventory
- id
- product_id
- location_id
- quantity
- updated_at
```

Recommended uniqueness:

``` text
UNIQUE(product_id, location_id)
```

------------------------------------------------------------------------

## Suppliers

The receipt workflow requires a supplier.

``` text
suppliers
- id
- name
- contact_name
- email
- phone
- address
- created_at
```

------------------------------------------------------------------------

## Receipts

``` text
receipts
- id
- receipt_number
- supplier_id
- destination_location_id
- status
- created_by
- validated_by
- validated_at
- created_at
- updated_at
```

------------------------------------------------------------------------

## Receipt Items

``` text
receipt_items
- id
- receipt_id
- product_id
- quantity
```

------------------------------------------------------------------------

## Delivery Orders

``` text
delivery_orders
- id
- delivery_number
- source_location_id
- status
- created_by
- validated_by
- validated_at
- created_at
- updated_at
```

------------------------------------------------------------------------

## Delivery Items

``` text
delivery_items
- id
- delivery_id
- product_id
- quantity
```

------------------------------------------------------------------------

## Internal Transfers

``` text
internal_transfers
- id
- transfer_number
- source_location_id
- destination_location_id
- status
- created_by
- validated_by
- validated_at
- created_at
- updated_at
```

------------------------------------------------------------------------

## Internal Transfer Items

``` text
internal_transfer_items
- id
- transfer_id
- product_id
- quantity
```

------------------------------------------------------------------------

## Inventory Adjustments

``` text
inventory_adjustments
- id
- adjustment_number
- location_id
- status
- reason
- created_by
- validated_by
- validated_at
- created_at
```

------------------------------------------------------------------------

## Inventory Adjustment Items

``` text
inventory_adjustment_items
- id
- adjustment_id
- product_id
- counted_quantity
- previous_quantity
- difference
```

------------------------------------------------------------------------

## Stock Ledger

``` text
stock_ledger
- id
- product_id
- location_id
- operation_type
- reference_type
- reference_id
- quantity_before
- quantity_change
- quantity_after
- performed_by
- created_at
```

Possible operation types:

``` text
RECEIPT
DELIVERY
TRANSFER_OUT
TRANSFER_IN
ADJUSTMENT
```

------------------------------------------------------------------------

# 21. Critical Inventory Transaction Rule

Stock updates must be atomic.

For example, when validating a receipt:

``` text
BEGIN TRANSACTION

1. Validate receipt status
2. Validate quantities
3. Lock/read relevant inventory row
4. Increase inventory quantity
5. Create stock ledger entry
6. Mark receipt as DONE

COMMIT
```

If any step fails:

``` text
ROLLBACK
```

Never update inventory without successfully creating the corresponding
ledger entry.

Similarly, an internal transfer should update source inventory,
destination inventory, and both ledger records within the same database
transaction.

This protects StockSense from inconsistent inventory data.

------------------------------------------------------------------------

# 22. Next.js Application Structure

A practical structure:

``` text
app/
├── (auth)/
│   ├── login/
│   ├── signup/
│   ├── forgot-password/
│   └── reset-password/
│
├── dashboard/
│
├── products/
│   ├── page.tsx
│   ├── new/
│   └── [id]/
│
├── operations/
│   ├── receipts/
│   ├── deliveries/
│   ├── transfers/
│   ├── adjustments/
│   └── history/
│
├── warehouses/
│
├── settings/
│
└── profile/
```

Database/server code can be organized separately:

``` text
lib/
├── db/
├── auth/
├── inventory/
├── validations/
└── utils/
```

------------------------------------------------------------------------

# 23. Core Business Logic

The application should follow these rules.

### Receipt

``` text
Receipt validated
→ inventory increases
→ ledger entry created
→ receipt becomes DONE
```

### Delivery

``` text
Delivery validated
→ inventory decreases
→ ledger entry created
→ delivery becomes DONE
```

### Internal Transfer

``` text
Transfer validated
→ source inventory decreases
→ destination inventory increases
→ transfer ledger entries created
→ transfer becomes DONE
```

### Adjustment

``` text
Adjustment validated
→ physical count compared with recorded quantity
→ inventory corrected
→ adjustment ledger entry created
→ adjustment becomes DONE
```

------------------------------------------------------------------------

# 24. What Should NOT Happen

Avoid these architectural mistakes:

### Do not directly edit stock without a business operation

Bad:

``` text
inventory.quantity = 500
```

without recording why.

Better:

``` text
Receipt / Delivery / Transfer / Adjustment
        ↓
Inventory Update
        ↓
Stock Ledger
```

### Do not let Draft documents affect inventory

Draft operations are plans, not completed stock movements.

### Do not treat internal transfers as stock creation/destruction

Transfers only change location quantities.

### Do not delete historical stock movements

Ledger history should be preserved for traceability.

------------------------------------------------------------------------

# 25. Dashboard Data Model

The dashboard can derive KPIs from the database.

### Total Products in Stock

Count products with available inventory.

### Low Stock / Out of Stock

Compare current inventory against reorder levels.

### Pending Receipts

Count receipts whose status is not DONE/CANCELED.

### Pending Deliveries

Count delivery orders that still require processing.

### Internal Transfers Scheduled

Count transfers that are not completed/canceled.

------------------------------------------------------------------------

# 26. MVP Priority

For the hackathon, the core working flow should be:

``` text
Authentication
     ↓
Dashboard
     ↓
Products
     ↓
Warehouse + Locations
     ↓
Receipt
     ↓
Inventory Update
     ↓
Delivery
     ↓
Inventory Update
     ↓
Internal Transfer
     ↓
Location Update
     ↓
Adjustment
     ↓
Stock Ledger
```

The most important demonstration is that a real inventory quantity
changes correctly as operations are validated.

------------------------------------------------------------------------

# 27. Example Demo Scenario

Use a simple scenario during development/demo:

### Product

``` text
Product: Steel Rod
SKU: STEEL-001
Unit: KG
```

### Warehouse

``` text
Main Warehouse
└── Main Store
```

### Receipt

``` text
Receive 100 KG
```

Inventory:

``` text
Main Store = 100 KG
```

### Transfer

``` text
Main Store → Production Rack
Quantity = 30 KG
```

Inventory:

``` text
Main Store = 70 KG
Production Rack = 30 KG
Total = 100 KG
```

### Delivery

``` text
Deliver 20 KG
```

Inventory:

``` text
Production Rack = 10 KG
Total = 80 KG
```

### Adjustment

Physical count finds:

``` text
Production Rack = 7 KG
```

Adjustment:

``` text
-3 KG
```

Final:

``` text
Main Store = 70 KG
Production Rack = 7 KG
Total = 77 KG
```

The Stock Ledger contains the complete sequence of changes.

------------------------------------------------------------------------

# 28. Product Vision

StockSense should feel like a lightweight operational ERP focused
specifically on inventory.

The core idea is:

> **Every product has a quantity, every quantity belongs to a location,
> and every change in quantity must have a traceable reason.**

This principle should guide the database design, API/server actions, UI
workflows, and dashboard calculations.

------------------------------------------------------------------------

# 29. Source Requirements

This context is derived from the provided StockSense hackathon problem
statement.

The source explicitly requires a modular Inventory Management System,
target users, authentication, dashboard KPIs, dynamic filters, product
management, receipts, delivery orders, internal transfers, stock
adjustments, low-stock alerts, multi-warehouse support, SKU search/smart
filters, and stock-ledger tracking.

The source does not prescribe Next.js or Neon PostgreSQL; those are the
selected implementation technologies for this project.
