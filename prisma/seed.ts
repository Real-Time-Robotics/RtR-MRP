import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.purchasePayment.deleteMany();
  await prisma.purchaseInvoiceLine.deleteMany();
  await prisma.purchaseInvoice.deleteMany();
  await prisma.salesPayment.deleteMany();
  await prisma.salesInvoiceLine.deleteMany();
  await prisma.salesInvoice.deleteMany();
  await prisma.partCostRollup.deleteMany();
  await prisma.partCost.deleteMany();
  await prisma.gLAccount.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.bomHeader.deleteMany();
  await prisma.partSupplier.deleteMany();
  await prisma.part.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // Create admin user
  // Default demo password - override with SEED_ADMIN_PASSWORD env var in production
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "admin123456@";
  console.log(`Creating admin user with email: admin@rtr.com`);
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);
  await prisma.user.create({
    data: {
      email: "admin@rtr.com",
      name: "Admin User",
      password: hashedPassword,
      role: "admin",
      status: "active",
    },
  });
  console.log("Created admin user");

  // Create demo user for customer trials
  const demoPassword = "DemoMRP@2026!";
  console.log(`Creating demo user with email: demo@rtr-mrp.com`);
  const hashedDemoPassword = await bcrypt.hash(demoPassword, 12);
  await prisma.user.create({
    data: {
      email: "demo@rtr-mrp.com",
      name: "Demo User",
      password: hashedDemoPassword,
      role: "admin", // Full access for demo
      status: "active",
    },
  });
  console.log("Created demo user");

  // Create role-based demo users for demo mode role testing
  console.log("Creating role-based demo users...");
  const demoRoleUsers = [
    { email: "admin@demo.rtr-mrp.com", name: "Demo Admin", password: "Admin@Demo2026!", role: "admin" },
    { email: "manager@demo.rtr-mrp.com", name: "Demo Manager", password: "Manager@Demo2026!", role: "manager" },
    { email: "operator@demo.rtr-mrp.com", name: "Demo Operator", password: "Operator@Demo2026!", role: "operator" },
    { email: "viewer@demo.rtr-mrp.com", name: "Demo Viewer", password: "Viewer@Demo2026!", role: "viewer" },
  ];
  for (const user of demoRoleUsers) {
    const hashedPwd = await bcrypt.hash(user.password, 12);
    await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashedPwd,
        role: user.role,
        status: "active",
      },
    });
    console.log(`  Created ${user.role}: ${user.email}`);
  }
  console.log("Role-based demo users created");

  // Create GL Accounts (Chart of Accounts)
  const glAccounts = await Promise.all([
    // ASSETS (1000-1999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "1000",
        name: "Cash",
        description: "Cash and bank accounts",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1010",
        name: "Petty Cash",
        description: "Petty cash fund",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1100",
        name: "Accounts Receivable",
        description: "Trade accounts receivable",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1200",
        name: "Inventory - Raw Materials",
        description: "Raw materials and components inventory",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1210",
        name: "Inventory - Work in Progress",
        description: "Work in progress inventory",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1220",
        name: "Inventory - Finished Goods",
        description: "Finished goods inventory",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1300",
        name: "Prepaid Expenses",
        description: "Prepaid expenses and deposits",
        accountType: "ASSET",
        accountCategory: "CURRENT_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1500",
        name: "Fixed Assets",
        description: "Property, plant and equipment",
        accountType: "ASSET",
        accountCategory: "FIXED_ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "1510",
        name: "Accumulated Depreciation",
        description: "Accumulated depreciation on fixed assets",
        accountType: "ASSET",
        accountCategory: "FIXED_ASSET",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    // LIABILITIES (2000-2999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "2000",
        name: "Accounts Payable",
        description: "Trade accounts payable",
        accountType: "LIABILITY",
        accountCategory: "CURRENT_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "2100",
        name: "Accrued Expenses",
        description: "Accrued liabilities",
        accountType: "LIABILITY",
        accountCategory: "CURRENT_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "2200",
        name: "Sales Tax Payable",
        description: "Sales tax collected",
        accountType: "LIABILITY",
        accountCategory: "CURRENT_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "2300",
        name: "Payroll Liabilities",
        description: "Payroll taxes and withholdings",
        accountType: "LIABILITY",
        accountCategory: "CURRENT_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "2500",
        name: "Short-term Debt",
        description: "Short-term loans and notes payable",
        accountType: "LIABILITY",
        accountCategory: "CURRENT_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "2700",
        name: "Long-term Debt",
        description: "Long-term loans and notes payable",
        accountType: "LIABILITY",
        accountCategory: "LONG_TERM_LIABILITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    // EQUITY (3000-3999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "3000",
        name: "Common Stock",
        description: "Common stock and paid-in capital",
        accountType: "EQUITY",
        accountCategory: "EQUITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "3100",
        name: "Retained Earnings",
        description: "Accumulated retained earnings",
        accountType: "EQUITY",
        accountCategory: "EQUITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "3200",
        name: "Current Year Earnings",
        description: "Current year net income/loss",
        accountType: "EQUITY",
        accountCategory: "EQUITY",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    // REVENUE (4000-4999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "4000",
        name: "Product Sales",
        description: "Revenue from product sales",
        accountType: "REVENUE",
        accountCategory: "REVENUE",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "4100",
        name: "Service Revenue",
        description: "Revenue from services",
        accountType: "REVENUE",
        accountCategory: "REVENUE",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "4200",
        name: "Other Income",
        description: "Other miscellaneous income",
        accountType: "REVENUE",
        accountCategory: "OTHER_INCOME",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "4300",
        name: "Interest Income",
        description: "Interest earned on investments",
        accountType: "REVENUE",
        accountCategory: "OTHER_INCOME",
        normalBalance: "CREDIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    // COST OF GOODS SOLD (5000-5999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "5000",
        name: "COGS - Materials",
        description: "Cost of materials sold",
        accountType: "EXPENSE",
        accountCategory: "COGS",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5100",
        name: "COGS - Labor",
        description: "Direct labor costs",
        accountType: "EXPENSE",
        accountCategory: "COGS",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5200",
        name: "COGS - Overhead",
        description: "Manufacturing overhead costs",
        accountType: "EXPENSE",
        accountCategory: "COGS",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5300",
        name: "COGS - Subcontract",
        description: "Subcontract and outsourced costs",
        accountType: "EXPENSE",
        accountCategory: "COGS",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5400",
        name: "Material Price Variance",
        description: "Variance between standard and actual material prices",
        accountType: "EXPENSE",
        accountCategory: "VARIANCE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5500",
        name: "Material Usage Variance",
        description: "Variance in material usage vs standard",
        accountType: "EXPENSE",
        accountCategory: "VARIANCE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5600",
        name: "Labor Rate Variance",
        description: "Variance between standard and actual labor rates",
        accountType: "EXPENSE",
        accountCategory: "VARIANCE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5700",
        name: "Labor Efficiency Variance",
        description: "Variance in labor hours vs standard",
        accountType: "EXPENSE",
        accountCategory: "VARIANCE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "5800",
        name: "Overhead Variance",
        description: "Manufacturing overhead variance",
        accountType: "EXPENSE",
        accountCategory: "VARIANCE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: true,
      },
    }),
    // OPERATING EXPENSES (6000-6999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "6000",
        name: "Salaries & Wages",
        description: "Employee salaries and wages",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6100",
        name: "Employee Benefits",
        description: "Health insurance and other benefits",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6200",
        name: "Rent Expense",
        description: "Facility rent and lease payments",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6300",
        name: "Utilities",
        description: "Electric, water, gas expenses",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6400",
        name: "Insurance",
        description: "Business insurance premiums",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6500",
        name: "Depreciation Expense",
        description: "Depreciation on fixed assets",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6600",
        name: "Office Supplies",
        description: "Office supplies and materials",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6700",
        name: "Travel & Entertainment",
        description: "Travel and business entertainment",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6800",
        name: "Professional Fees",
        description: "Legal, accounting, consulting fees",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "6900",
        name: "Marketing & Advertising",
        description: "Marketing and advertising expenses",
        accountType: "EXPENSE",
        accountCategory: "OPERATING_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    // OTHER EXPENSES (7000-7999)
    prisma.gLAccount.create({
      data: {
        accountNumber: "7000",
        name: "Interest Expense",
        description: "Interest on loans and debt",
        accountType: "EXPENSE",
        accountCategory: "OTHER_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "7100",
        name: "Bank Fees",
        description: "Bank service charges and fees",
        accountType: "EXPENSE",
        accountCategory: "OTHER_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
    prisma.gLAccount.create({
      data: {
        accountNumber: "7200",
        name: "Other Expenses",
        description: "Miscellaneous other expenses",
        accountType: "EXPENSE",
        accountCategory: "OTHER_EXPENSE",
        normalBalance: "DEBIT",
        isActive: true,
        isSystemAccount: false,
      },
    }),
  ]);
  console.log(`Created ${glAccounts.length} GL accounts`);

  // Create warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      code: "WH-MAIN",
      name: "Main Warehouse",
      location: "Austin, TX",
      type: "mixed",
      status: "active",
    },
  });
  console.log("Created warehouse");

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        code: "SUP-001",
        name: "KDE Direct",
        country: "USA",
        ndaaCompliant: true,
        contactName: "John Smith",
        contactEmail: "sales@kdedirect.com",
        leadTimeDays: 14,
        rating: 4.8,
        category: "Motors",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-002",
        name: "Castle Creations",
        country: "USA",
        ndaaCompliant: true,
        contactName: "Mike Johnson",
        contactEmail: "sales@castlecreations.com",
        leadTimeDays: 10,
        rating: 4.7,
        category: "ESC",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-003",
        name: "Tattu/Gensace",
        country: "USA",
        ndaaCompliant: true,
        contactName: "Sarah Lee",
        contactEmail: "sales@genstattu.com",
        leadTimeDays: 7,
        rating: 4.6,
        category: "Batteries",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-004",
        name: "NVIDIA",
        country: "USA",
        ndaaCompliant: true,
        contactName: "Tech Sales",
        contactEmail: "enterprise@nvidia.com",
        leadTimeDays: 28,
        rating: 5.0,
        category: "AI Computing",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-005",
        name: "Sony Semiconductor",
        country: "Japan",
        ndaaCompliant: true,
        contactName: "Yuki Tanaka",
        contactEmail: "sales@sony-semicon.co.jp",
        leadTimeDays: 30,
        rating: 4.9,
        category: "Sensors",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-006",
        name: "Teledyne FLIR",
        country: "USA",
        ndaaCompliant: true,
        contactName: "Defense Sales",
        contactEmail: "sales@flir.com",
        leadTimeDays: 21,
        rating: 4.8,
        category: "Thermal",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-007",
        name: "Holybro",
        country: "USA",
        ndaaCompliant: true,
        contactName: "Chris Wang",
        contactEmail: "sales@holybro.com",
        leadTimeDays: 14,
        rating: 4.5,
        category: "Flight Controller",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        code: "SUP-008",
        name: "Panasonic Energy",
        country: "Japan",
        ndaaCompliant: true,
        contactName: "Kenji Yamamoto",
        contactEmail: "energy@panasonic.com",
        leadTimeDays: 25,
        rating: 4.9,
        category: "Batteries",
        status: "active",
      },
    }),
  ]);
  console.log("Created suppliers");

  // Create parts
  const parts = await Promise.all([
    // Propulsion parts
    prisma.part.create({
      data: {
        partNumber: "PRT-MT-001",
        name: "KDE7215XF-135 Brushless Motor",
        category: "Propulsion",
        description: "High-performance brushless motor for heavy-lift drones",
        unit: "pcs",
        isCritical: true,
        status: "active",
        specs: { create: { weightKg: 0.82 } },
        costs: { create: { unitCost: 389.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 40, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-ESC-001",
        name: "Castle Creations Phoenix Edge 120HV",
        category: "Propulsion",
        description: "120A High Voltage ESC",
        unit: "pcs",
        isCritical: true,
        status: "active",
        specs: { create: { weightKg: 0.12 } },
        costs: { create: { unitCost: 275.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 40, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-PROP-001",
        name: "KDE-CF305-DP Propeller CW",
        category: "Propulsion",
        description: "30.5 inch Carbon Fiber Propeller - Clockwise",
        unit: "pcs",
        isCritical: false,
        status: "active",
        specs: { create: { weightKg: 0.15 } },
        costs: { create: { unitCost: 185.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 50, safetyStock: 10 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-PROP-002",
        name: "KDE-CF305-DP Propeller CCW",
        category: "Propulsion",
        description: "30.5 inch Carbon Fiber Propeller - Counter-Clockwise",
        unit: "pcs",
        isCritical: false,
        specs: { create: { weightKg: 0.15 } },
        status: "active",
        costs: { create: { unitCost: 185.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 50, safetyStock: 10 } },
      },
    }),
    // Power parts
    prisma.part.create({
      data: {
        partNumber: "PRT-BAT-001",
        name: "Tattu 22000mAh 6S 25C Smart Battery",
        category: "Power",
        description: "High capacity LiPo battery with smart BMS",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 2.8 } },
        status: "active",
        costs: { create: { unitCost: 899.0 } },
        planning: { create: { minStockLevel: 15, reorderPoint: 30, safetyStock: 5 } }, // shelfLife removed/moved? Assuming removed for now or put in simple creation if exists
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-PWR-001",
        name: "Power Distribution Board 12S",
        category: "Power",
        description: "12S capable power distribution with current sensing",
        unit: "pcs",
        isCritical: false,
        specs: { create: { weightKg: 0.08 } },
        status: "active",
        costs: { create: { unitCost: 145.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    // AI Computing
    prisma.part.create({
      data: {
        partNumber: "PRT-AI-001",
        name: "NVIDIA Jetson Orin NX 16GB",
        category: "AI Computing",
        description: "Edge AI computing module",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 0.06 } },
        status: "active",
        costs: { create: { unitCost: 699.0 } },
        planning: { create: { minStockLevel: 8, reorderPoint: 15, safetyStock: 3 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-AI-002",
        name: "Jetson Orin Carrier Board",
        category: "AI Computing",
        description: "Custom carrier board for Jetson Orin",
        unit: "pcs",
        isCritical: false,
        specs: { create: { weightKg: 0.12 } },
        status: "active",
        costs: { create: { unitCost: 249.0 } },
        planning: { create: { minStockLevel: 8, reorderPoint: 15, safetyStock: 3 } },
      },
    }),
    // Sensors
    prisma.part.create({
      data: {
        partNumber: "PRT-CAM-001",
        name: "Sony IMX477 Camera Module",
        category: "Sensors",
        description: "12.3MP high-quality camera sensor",
        unit: "pcs",
        isCritical: false,
        specs: { create: { weightKg: 0.025 } },
        status: "active",
        costs: { create: { unitCost: 89.0 } },
        planning: { create: { minStockLevel: 15, reorderPoint: 30, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-CAM-002",
        name: "FLIR Boson 640 Thermal Core",
        category: "Sensors",
        description: "640x512 Thermal imaging core",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 0.03 } },
        status: "active",
        costs: { create: { unitCost: 3995.0 } },
        planning: { create: { minStockLevel: 5, reorderPoint: 10, safetyStock: 2 } },
      },
    }),
    // Flight Controller
    prisma.part.create({
      data: {
        partNumber: "PRT-FC-001",
        name: "Pixhawk 6X Flight Controller",
        category: "Flight Control",
        description: "Professional-grade flight controller",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 0.055 } },
        status: "active",
        costs: { create: { unitCost: 499.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-GPS-001",
        name: "Here3+ RTK GPS Module",
        category: "Flight Control",
        description: "High-precision RTK GPS with compass",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 0.065 } },
        status: "active",
        costs: { create: { unitCost: 349.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
    // Airframe
    prisma.part.create({
      data: {
        partNumber: "PRT-AF-001",
        name: "Main Frame Carbon Fiber X8",
        category: "Airframe",
        description: "Carbon fiber main frame for X8 configuration",
        unit: "pcs",
        isCritical: true,
        specs: { create: { weightKg: 1.8 } },
        status: "active",
        costs: { create: { unitCost: 1250.0 } },
        planning: { create: { minStockLevel: 5, reorderPoint: 10, safetyStock: 2 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-AF-002",
        name: "Motor Arm Assembly",
        category: "Airframe",
        description: "Carbon fiber motor arm with quick-release",
        unit: "pcs",
        isCritical: false,
        specs: { create: { weightKg: 0.28 } },
        status: "active",
        costs: { create: { unitCost: 180.0 } },
        planning: { create: { minStockLevel: 20, reorderPoint: 40, safetyStock: 8 } },
      },
    }),
    prisma.part.create({
      data: {
        partNumber: "PRT-AF-003",
        name: "Landing Gear Set",
        category: "Airframe",
        description: "Retractable landing gear system",
        unit: "set",
        isCritical: false,
        specs: { create: { weightKg: 0.6 } },
        status: "active",
        costs: { create: { unitCost: 450.0 } },
        planning: { create: { minStockLevel: 10, reorderPoint: 20, safetyStock: 5 } },
      },
    }),
  ]);
  console.log("Created parts");

  // Create part-supplier relationships
  await prisma.partSupplier.createMany({
    data: [
      { partId: parts[0].id, supplierId: suppliers[0].id, unitPrice: 389.0, leadTimeDays: 14, isPreferred: true },
      { partId: parts[1].id, supplierId: suppliers[1].id, unitPrice: 275.0, leadTimeDays: 10, isPreferred: true },
      { partId: parts[2].id, supplierId: suppliers[0].id, unitPrice: 185.0, leadTimeDays: 14, isPreferred: true },
      { partId: parts[3].id, supplierId: suppliers[0].id, unitPrice: 185.0, leadTimeDays: 14, isPreferred: true },
      { partId: parts[4].id, supplierId: suppliers[2].id, unitPrice: 899.0, leadTimeDays: 7, isPreferred: true },
      { partId: parts[6].id, supplierId: suppliers[3].id, unitPrice: 699.0, leadTimeDays: 28, isPreferred: true },
      { partId: parts[8].id, supplierId: suppliers[4].id, unitPrice: 89.0, leadTimeDays: 30, isPreferred: true },
      { partId: parts[9].id, supplierId: suppliers[5].id, unitPrice: 3995.0, leadTimeDays: 21, isPreferred: true },
      { partId: parts[10].id, supplierId: suppliers[6].id, unitPrice: 499.0, leadTimeDays: 14, isPreferred: true },
      { partId: parts[11].id, supplierId: suppliers[6].id, unitPrice: 349.0, leadTimeDays: 14, isPreferred: true },
    ],
  });
  console.log("Created part-supplier relationships");

  // Create product
  const product = await prisma.product.create({
    data: {
      sku: "HERA-X8-PRO",
      name: "HERA X8 Professional Drone",
      description: "Heavy-lift octocopter with AI capabilities for enterprise applications",
      basePrice: 28500.0,
      assemblyHours: 16,
      testingHours: 8,
      status: "active",
    },
  });
  console.log("Created product");

  // Create BOM
  const bomHeader = await prisma.bomHeader.create({
    data: {
      productId: product.id,
      version: "2.1",
      effectiveDate: new Date("2024-01-01"),
      status: "active",
      notes: "Current production version",
    },
  });

  // Create BOM lines
  await prisma.bomLine.createMany({
    data: [
      // Propulsion Module
      { bomId: bomHeader.id, lineNumber: 1, partId: parts[0].id, quantity: 8, moduleCode: "MOD-PROP", moduleName: "Propulsion System", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 2, partId: parts[1].id, quantity: 8, moduleCode: "MOD-PROP", moduleName: "Propulsion System", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 3, partId: parts[2].id, quantity: 4, moduleCode: "MOD-PROP", moduleName: "Propulsion System" },
      { bomId: bomHeader.id, lineNumber: 4, partId: parts[3].id, quantity: 4, moduleCode: "MOD-PROP", moduleName: "Propulsion System" },
      // Power Module
      { bomId: bomHeader.id, lineNumber: 5, partId: parts[4].id, quantity: 2, moduleCode: "MOD-PWR", moduleName: "Power System", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 6, partId: parts[5].id, quantity: 1, moduleCode: "MOD-PWR", moduleName: "Power System" },
      // AI Module
      { bomId: bomHeader.id, lineNumber: 7, partId: parts[6].id, quantity: 1, moduleCode: "MOD-AI", moduleName: "AI Computing", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 8, partId: parts[7].id, quantity: 1, moduleCode: "MOD-AI", moduleName: "AI Computing" },
      // Sensors Module
      { bomId: bomHeader.id, lineNumber: 9, partId: parts[8].id, quantity: 1, moduleCode: "MOD-CAM", moduleName: "Camera & Sensors" },
      { bomId: bomHeader.id, lineNumber: 10, partId: parts[9].id, quantity: 1, moduleCode: "MOD-CAM", moduleName: "Camera & Sensors", isCritical: true },
      // Flight Control Module
      { bomId: bomHeader.id, lineNumber: 11, partId: parts[10].id, quantity: 1, moduleCode: "MOD-FC", moduleName: "Flight Control", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 12, partId: parts[11].id, quantity: 1, moduleCode: "MOD-FC", moduleName: "Flight Control", isCritical: true },
      // Airframe Module
      { bomId: bomHeader.id, lineNumber: 13, partId: parts[12].id, quantity: 1, moduleCode: "MOD-AF", moduleName: "Airframe", isCritical: true },
      { bomId: bomHeader.id, lineNumber: 14, partId: parts[13].id, quantity: 8, moduleCode: "MOD-AF", moduleName: "Airframe" },
      { bomId: bomHeader.id, lineNumber: 15, partId: parts[14].id, quantity: 1, moduleCode: "MOD-AF", moduleName: "Airframe" },
    ],
  });
  console.log("Created BOM");

  // Create inventory
  await prisma.inventory.createMany({
    data: [
      { partId: parts[0].id, warehouseId: warehouse.id, quantity: 45, reservedQty: 24 },
      { partId: parts[1].id, warehouseId: warehouse.id, quantity: 40, reservedQty: 24 },
      { partId: parts[2].id, warehouseId: warehouse.id, quantity: 60, reservedQty: 12 },
      { partId: parts[3].id, warehouseId: warehouse.id, quantity: 60, reservedQty: 12 },
      { partId: parts[4].id, warehouseId: warehouse.id, quantity: 18, reservedQty: 6 },
      { partId: parts[5].id, warehouseId: warehouse.id, quantity: 25, reservedQty: 3 },
      { partId: parts[6].id, warehouseId: warehouse.id, quantity: 8, reservedQty: 3 },
      { partId: parts[7].id, warehouseId: warehouse.id, quantity: 12, reservedQty: 3 },
      { partId: parts[8].id, warehouseId: warehouse.id, quantity: 30, reservedQty: 3 },
      { partId: parts[9].id, warehouseId: warehouse.id, quantity: 6, reservedQty: 3 },
      { partId: parts[10].id, warehouseId: warehouse.id, quantity: 15, reservedQty: 3 },
      { partId: parts[11].id, warehouseId: warehouse.id, quantity: 18, reservedQty: 3 },
      { partId: parts[12].id, warehouseId: warehouse.id, quantity: 8, reservedQty: 3 },
      { partId: parts[13].id, warehouseId: warehouse.id, quantity: 35, reservedQty: 24 },
      { partId: parts[14].id, warehouseId: warehouse.id, quantity: 12, reservedQty: 3 },
    ],
  });
  console.log("Created inventory");

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        code: "CUST-001",
        name: "US Department of Interior",
        type: "government",
        country: "USA",
        contactName: "James Wilson",
        contactEmail: "jwilson@doi.gov",
        paymentTerms: "Net 30",
        creditLimit: 500000,
        status: "active",
      },
    }),
    prisma.customer.create({
      data: {
        code: "CUST-002",
        name: "AgriTech Solutions Inc.",
        type: "enterprise",
        country: "USA",
        contactName: "Maria Garcia",
        contactEmail: "mgarcia@agritech.com",
        paymentTerms: "Net 30",
        creditLimit: 200000,
        status: "active",
      },
    }),
    prisma.customer.create({
      data: {
        code: "CUST-003",
        name: "Pacific Power & Light",
        type: "enterprise",
        country: "USA",
        contactName: "Robert Chen",
        contactEmail: "rchen@pacificpl.com",
        paymentTerms: "Net 45",
        creditLimit: 300000,
        status: "active",
      },
    }),
    prisma.customer.create({
      data: {
        code: "CUST-004",
        name: "RMUS (Rocky Mountain UAS)",
        type: "distributor",
        country: "USA",
        contactName: "David Miller",
        contactEmail: "dmiller@rmus.com",
        paymentTerms: "Net 30",
        creditLimit: 150000,
        status: "active",
      },
    }),
  ]);
  console.log("Created customers");

  // Create sales orders
  const salesOrders = await Promise.all([
    prisma.salesOrder.create({
      data: {
        orderNumber: "SO-2024-001",
        customerId: customers[0].id,
        orderDate: new Date("2024-01-15"),
        requiredDate: new Date("2024-04-25"),
        priority: "high",
        status: "confirmed",
        totalAmount: 171000,
        currency: "USD",
        lines: {
          create: [
            { lineNumber: 1, productId: product.id, quantity: 6, unitPrice: 28500, lineTotal: 171000 },
          ],
        },
      },
    }),
    prisma.salesOrder.create({
      data: {
        orderNumber: "SO-2024-002",
        customerId: customers[1].id,
        orderDate: new Date("2024-01-20"),
        requiredDate: new Date("2024-05-15"),
        priority: "normal",
        status: "confirmed",
        totalAmount: 85500,
        currency: "USD",
        lines: {
          create: [
            { lineNumber: 1, productId: product.id, quantity: 3, unitPrice: 28500, lineTotal: 85500 },
          ],
        },
      },
    }),
    prisma.salesOrder.create({
      data: {
        orderNumber: "SO-2024-003",
        customerId: customers[2].id,
        orderDate: new Date("2024-02-01"),
        requiredDate: new Date("2024-06-01"),
        priority: "normal",
        status: "in_production",
        totalAmount: 228000,
        currency: "USD",
        lines: {
          create: [
            { lineNumber: 1, productId: product.id, quantity: 8, unitPrice: 28500, lineTotal: 228000 },
          ],
        },
      },
    }),
    prisma.salesOrder.create({
      data: {
        orderNumber: "SO-2024-004",
        customerId: customers[3].id,
        orderDate: new Date("2024-02-10"),
        requiredDate: new Date("2024-05-30"),
        priority: "high",
        status: "confirmed",
        totalAmount: 342000,
        currency: "USD",
        lines: {
          create: [
            { lineNumber: 1, productId: product.id, quantity: 12, unitPrice: 28500, lineTotal: 342000 },
          ],
        },
      },
    }),
    prisma.salesOrder.create({
      data: {
        orderNumber: "SO-2024-005",
        customerId: customers[1].id,
        orderDate: new Date("2024-02-15"),
        requiredDate: new Date("2024-07-01"),
        priority: "normal",
        status: "draft",
        totalAmount: 142500,
        currency: "USD",
        lines: {
          create: [
            { lineNumber: 1, productId: product.id, quantity: 5, unitPrice: 28500, lineTotal: 142500 },
          ],
        },
      },
    }),
  ]);
  console.log("Created sales orders");

  // Create purchase orders
  await Promise.all([
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2024-001",
        supplierId: suppliers[0].id,
        orderDate: new Date("2024-01-10"),
        expectedDate: new Date("2024-01-24"),
        status: "received",
        totalAmount: 15560,
        lines: {
          create: [
            { lineNumber: 1, partId: parts[0].id, quantity: 40, unitPrice: 389, lineTotal: 15560, receivedQty: 40, status: "received" },
          ],
        },
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2024-002",
        supplierId: suppliers[1].id,
        orderDate: new Date("2024-01-12"),
        expectedDate: new Date("2024-01-22"),
        status: "received",
        totalAmount: 13200,
        lines: {
          create: [
            { lineNumber: 1, partId: parts[1].id, quantity: 48, unitPrice: 275, lineTotal: 13200, receivedQty: 48, status: "received" },
          ],
        },
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2024-003",
        supplierId: suppliers[3].id,
        orderDate: new Date("2024-01-15"),
        expectedDate: new Date("2024-02-12"),
        status: "confirmed",
        totalAmount: 6990,
        lines: {
          create: [
            { lineNumber: 1, partId: parts[6].id, quantity: 10, unitPrice: 699, lineTotal: 6990, status: "pending" },
          ],
        },
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2024-004",
        supplierId: suppliers[5].id,
        orderDate: new Date("2024-01-20"),
        expectedDate: new Date("2024-02-10"),
        status: "partial",
        totalAmount: 39950,
        lines: {
          create: [
            { lineNumber: 1, partId: parts[9].id, quantity: 10, unitPrice: 3995, lineTotal: 39950, receivedQty: 4, status: "partial" },
          ],
        },
      },
    }),
    prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2024-005",
        supplierId: suppliers[7].id,
        orderDate: new Date("2024-01-22"),
        expectedDate: new Date("2024-02-16"),
        status: "sent",
        totalAmount: 17980,
        lines: {
          create: [
            { lineNumber: 1, partId: parts[4].id, quantity: 20, unitPrice: 899, lineTotal: 17980, status: "pending" },
          ],
        },
      },
    }),
  ]);
  console.log("Created purchase orders");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
