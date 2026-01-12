import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  decimal,
  jsonb,
  varchar,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { number, z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);



// login schema

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["operator", "admin"]),
});


// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["operator", "admin"] }).notNull().default("operator"),
  isActive: boolean("is_active").notNull().default(true),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phoneNumber: varchar("phone_number", { length: 15 }).notNull(),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).notNull(),
  email: varchar("email"),
  address: text("address").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  occupation: varchar("occupation"),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().default({}),
  operatorId: varchar("operator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// categories table
export const loanCategories = pgTable("loan_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull()
});

// range table

export const loanInterestRanges = pgTable("loan_interest_ranges", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => loanCategories.id, { onDelete: "cascade" }).notNull(),
  fromDays: integer("from_days").notNull(),       // e.g., 0
  toDays: integer("to_days").notNull(),           // e.g., 30
  interestPercent: decimal("interest_percent", { precision: 5, scale: 2 }).notNull(), // e.g., 1.25%
});


// Loans table
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  loanId: varchar("loan_id").unique().notNull(), // GL-2024-001 format
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  operatorId: varchar("operator_id").references(() => users.id).notNull(),
  loanAmount: decimal("loan_amount", { precision: 10, scale: 2 }).notNull(),
  goldWeight: decimal("gold_weight", { precision: 8, scale: 2 }).notNull(), // in grams
  goldPurity: varchar("gold_purity").default("22K"),
  loanCategoryId: integer("loan_category_id").references(() => loanCategories.id).notNull(),
  status: varchar("status", { 
    enum: ["active", "due", "overdue", "closed", "defaulted"] 
  }).notNull().default("active"),
  issueDate: timestamp("issue_date").defaultNow(),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LoanWithRelations = Loan & {
  customer: Customer;
  operator: User;
};


// Payments table for loan payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),

  loanId: varchar("loan_id", { length: 50 }).references(() => loans.loanId).notNull(),

  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

  paymentDate: varchar("payment_date", { length: 50 }).notNull(),
  paymentType: varchar("payment_type", {
    enum: ["interest", "principal", "penalty", "full"],
  }).notNull(),

  paymentMode: varchar("payment_mode", {
    enum: ["cash", "upi", "banktransfer", "check"],
  }).notNull(),

  operatorId: varchar("operator_id").references(() => users.id).notNull(),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
});


// Form fields configuration
export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formType: varchar("form_type", { enum: ["customer", "loan"] }).notNull(),
  fieldValue: integer("value").default(0), // ✅ numeric, not integer
  fieldName: varchar("field_name").notNull(),
  fieldLabel: varchar("field_label").notNull(),
  fieldType: varchar("field_type", { 
    enum: ["text", "number", "email", "tel", "date", "select", "textarea"] 
  }).notNull(),
  isRequired: boolean("is_required").default(false),
  options: jsonb("options").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  details: jsonb("details").$type<Record<string, any>>(),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  loans: many(loans),
  payments: many(payments),
  activityLogs: many(activityLogs),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  operator: one(users, {
    fields: [customers.operatorId],
    references: [users.id],
  }),
  loans: many(loans),
}));

export const loansRelations = relations(loans, ({ one, many }) => ({
  customer: one(customers, {
    fields: [loans.customerId],
    references: [customers.id],
  }),
  operator: one(users, {
    fields: [loans.operatorId],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  loan: one(loans, {
    fields: [payments.loanId],
    references: [loans.id],
  }),
  operator: one(users, {
    fields: [payments.operatorId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(loanCategories).omit({
  id: true,
});

export const insertIntrestRangesSchema = createInsertSchema(loanInterestRanges).omit({
  id: true,
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type LoanCategory = typeof loanCategories.$inferSelect;
export type InsertLoanCategory = z.infer<typeof insertCategorySchema>;

export type CategoryRange = typeof loanInterestRanges.$inferSelect;
export type InsertCategoryRange = z.infer<typeof insertIntrestRangesSchema>;


export const insertLoanCategorySchema = z.object({
  name: z.string().min(2),
});

export const insertCategoryRangeSchema = z.object({
  categoryId: z.number(),
  fromDays: z.number().min(0),
  toDays: z.number().min(1),
  interestRate: z.string(), // or .number().refine(...) if you want strict control
});