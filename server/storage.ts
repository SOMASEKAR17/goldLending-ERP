import {
  users,
  customers,
  loans,
  payments,
  formFields,
  activityLogs,
  loanCategories,
  loanInterestRanges,

  type User,
  type UpsertUser,
  type Customer,
  type InsertCustomer,
  type Loan,
  type InsertLoan,
  type Payment,
  type InsertPayment,
  type FormField,
  type InsertFormField,
  type ActivityLog,
  type InsertActivityLog,
  type InsertLoanCategory,
  type LoanCategory,
  type InsertCategoryRange,
  type CategoryRange,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, count, sql } from "drizzle-orm";


export interface IStorage {
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;


  getGstPercentage(): Promise<number>;
  updateGstPercentage(value: number): Promise<void>;

  // Loan Category & Interest Range Management
  createLoanCategory(data: InsertLoanCategory): Promise<LoanCategory>;
  getLoanCategories(): Promise<LoanCategory[]>;
  deleteLoanCategory(id: number): Promise<void>;

  addCategoryRange(range: InsertCategoryRange): Promise<CategoryRange>;
  getCategoryRanges(categoryId: number): Promise<CategoryRange[]>;
  deleteCategoryRange(id: number): Promise<void>;

  
  // Customer operations
  getCustomers(search?: string, operatorId?: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  
  // Loan operations
  getLoans(filters?: { status?: string; operatorId?: string; customerId?: number }): Promise<(Loan & { customer: Customer; operator: User })[]>;
  getLoan(id: string): Promise<(Loan & { customer: Customer; operator: User; payments: Payment[] }) | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan>;
  getCustomerLoans(customerId: number): Promise<Loan[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getLoanPayments(loanId: string): Promise<Payment[]>;
  
  // Operator management
  getOperators(): Promise<User[]>;
  updateOperatorPermissions(id: string, permissions: string[]): Promise<User>;
  deactivateOperator(id: string): Promise<User>;
  
  // Form fields management
  getFormFields(formType: "customer" | "loan"): Promise<FormField[]>;
  createFormField(field: InsertFormField): Promise<FormField>;
  updateFormField(id: number, field: Partial<InsertFormField>): Promise<FormField>;
  deleteFormField(id: number): Promise<void>;
  
  // Analytics
  getAnalytics(): Promise<{
    totalCustomers: number;
    activeLoans: number;
    totalLoanAmount: {
        month: string;
        total: string;
    }[];
    totalActiveLoanAmount: string;
    overdueLoans: number;
    activeOperators: number;
  }>;
  
  // Activity logging
  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivities(limit?: number): Promise<(ActivityLog & { user: User })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getGstPercentage(): Promise<number> {
  try {
    const result = await db
      .select({ value: sql<number>`COALESCE(MAX(${formFields.fieldValue}::int), 0)` })
      .from(formFields)
      .where(eq(formFields.fieldName, "gst"))
      .limit(1);

    console.log("GST DB result:", result); // ✅ Add this

    return result[0]?.value ?? 0;
  } catch (err) {
    console.error("❌ Error inside getGstPercentage:", err); // ✅ Add this
    throw err;
  }
}


  async updateGstPercentage(value: number): Promise<void> {
    const existing = await db
      .select()
      .from(formFields)
      .where(eq(formFields.fieldName, "gst"))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(formFields)
        .set({ fieldValue: value })
        .where(eq(formFields.id, existing[0].id));
    } else {
      await db.insert(formFields).values({
        formType: "loan",
        fieldName: "gst",
        fieldLabel: "GST %",
        fieldType: "number",
        isRequired: true,
        options: null,
        isActive: true,
        sortOrder: 999,
        fieldValue: value,
      });
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Loan Category
async createLoanCategory(data: InsertLoanCategory): Promise<LoanCategory> {
  const [category] = await db.insert(loanCategories).values(data).returning();
  return category;
}

async getLoanCategories(): Promise<LoanCategory[]> {
  return await db.select().from(loanCategories).orderBy(asc(loanCategories.name));
}

async deleteLoanCategory(id: number): Promise<void> {
  await db.delete(loanCategories).where(eq(loanCategories.id, id));
}

async getInterestAmountForLoan(loanId: string): Promise<number> {
  const [loan] = await db
    .select()
    .from(loans)
    .where(eq(loans.loanId, loanId))
    .limit(1);

  if (!loan || !loan.issueDate || !loan.loanCategoryId) {
    throw new Error("Loan not found or missing issue date/category.");
  }

  const daysPassed = Math.floor(
    (Date.now() - new Date(loan.issueDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysPassed <= 0) return 0;

  const ranges = await db
    .select()
    .from(loanInterestRanges)
    .where(eq(loanInterestRanges.categoryId, loan.loanCategoryId))
    .orderBy(asc(loanInterestRanges.fromDays));

  if (!ranges.length) {
    throw new Error("No interest ranges found for this category.");
  }

  let totalInterest = 0;
  let remainingDays = daysPassed;

  for (const range of ranges) {
    const startDay = range.fromDays;
    const endDay = range.toDays;

    if (remainingDays <= 0) break;

    const overlapStart = Math.max(startDay, 1);
    const overlapEnd = Math.min(endDay, daysPassed);
    const daysInRange = overlapEnd - overlapStart + 1;

    if (daysInRange > 0) {
      const ratePerRange = Number(range.interestPercent);
      if (!ratePerRange) continue;
      const issueDate = new Date(loan.issueDate);
      const year = issueDate.getFullYear();
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeapYear ? 366 : 365;

      const dailyRate = ratePerRange / daysInYear;

      const interest = (Number(loan.loanAmount) * dailyRate * daysInRange) / 100;
      totalInterest += interest;
    }
  }

  return Number(totalInterest.toFixed(2));
}



async givedueloan()
{
  return await db
      .select()
      .from(loans)
      .where(eq(loans.status, "due"));
}

// Interest Ranges
async addCategoryRange(range: InsertCategoryRange): Promise<CategoryRange> {
  const [newRange] = await db.insert(loanInterestRanges).values(range).returning();
  return newRange;
}

async getCategoryRanges(categoryId: number): Promise<CategoryRange[]> {
  return await db
    .select()
    .from(loanInterestRanges)
    .where(eq(loanInterestRanges.categoryId, categoryId))
    .orderBy(asc(loanInterestRanges.fromDays));
}

async deleteCategoryRange(id: number): Promise<void> {
  await db.delete(loanInterestRanges).where(eq(loanInterestRanges.id, id));
}


  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  // Customer operations
  async getCustomers(search?: string): Promise<Customer[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(customers.fullName, `%${search}%`),
          like(customers.phoneNumber, `%${search}%`),
          like(customers.aadhaarNumber, `%${search}%`),
          like(customers.email, `%${search}%`)
        )
      );
    }
    
    
    if (conditions.length > 0) {
      return await db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt));
    }
    
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }


  async findCustomerByPhoneOrAadhaar(
  phoneNumber: string,
  aadhaarNumber: string
): Promise<Customer | undefined> {
  const existing = await db
    .select()
    .from(customers)
    .where(
      or(
        eq(customers.phoneNumber, phoneNumber),
        eq(customers.aadhaarNumber, aadhaarNumber)
      )
    )
    .limit(1);

  return existing[0]; // returns undefined if no match found
}


  // Loan operations
  async getLoans(filters?: { status?: string;  customerId?: number }) {
    let query = db
      .select({
        id: loans.id,
        loanId: loans.loanId,
        customerId: loans.customerId,
        operatorId: loans.operatorId,
        loanAmount: loans.loanAmount,
        goldWeight: loans.goldWeight,
        goldPurity: loans.goldPurity,
        loanCategoryId:loans.loanCategoryId,
        status: loans.status,
        issueDate: loans.issueDate,
        customFields: loans.customFields,
        createdAt: loans.createdAt,
        updatedAt: loans.updatedAt,
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phoneNumber: customers.phoneNumber,
          aadhaarNumber: customers.aadhaarNumber,
          email: customers.email,
          address: customers.address,
          dateOfBirth: customers.dateOfBirth,
          occupation: customers.occupation,
          customFields: customers.customFields,
          operatorId: customers.operatorId,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        },
        operator: {
          id: users.id,
          username: users.username,
          password:users.password,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          permissions: users.permissions,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(loans)
      .innerJoin(customers, eq(loans.customerId, customers.id))
      .innerJoin(users, eq(loans.operatorId, users.id));

    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(loans.status, filters.status as any));
    }
    
    
    
    if (filters?.customerId) {
      conditions.push(eq(loans.customerId, filters.customerId));
    }
    
    if (conditions.length > 0) {
      return await db
        .select({
          id: loans.id,
          loanId: loans.loanId,
          customerId: loans.customerId,
          operatorId: loans.operatorId,
          loanAmount: loans.loanAmount,
          goldWeight: loans.goldWeight,
          goldPurity: loans.goldPurity,
          loanCategoryId:loans.loanCategoryId,
          status: loans.status,
          issueDate: loans.issueDate,
          customFields: loans.customFields,
          createdAt: loans.createdAt,
          updatedAt: loans.updatedAt,
          customer: {
            id: customers.id,
            fullName: customers.fullName,
            phoneNumber: customers.phoneNumber,
            aadhaarNumber: customers.aadhaarNumber,
            email: customers.email,
            address: customers.address,
            dateOfBirth: customers.dateOfBirth,
            occupation: customers.occupation,
            customFields: customers.customFields,
            operatorId: customers.operatorId,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
          },
          operator: {
            id: users.id,
            username: users.username,
            password:users.password,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            role: users.role,
            isActive: users.isActive,
            permissions: users.permissions,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
        })
        .from(loans)
        .innerJoin(customers, eq(loans.customerId, customers.id))
        .innerJoin(users, eq(loans.operatorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(loans.createdAt));
    }
    
    return await db
      .select({
        id: loans.id,
        loanId: loans.loanId,
        customerId: loans.customerId,
        operatorId: loans.operatorId,
        loanAmount: loans.loanAmount,
        goldWeight: loans.goldWeight,
        goldPurity: loans.goldPurity,
        loanCategoryId:loans.loanCategoryId,
        status: loans.status,
        issueDate: loans.issueDate,
        customFields: loans.customFields,
        createdAt: loans.createdAt,
        updatedAt: loans.updatedAt,
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phoneNumber: customers.phoneNumber,
          aadhaarNumber: customers.aadhaarNumber,
          email: customers.email,
          address: customers.address,
          dateOfBirth: customers.dateOfBirth,
          occupation: customers.occupation,
          customFields: customers.customFields,
          operatorId: customers.operatorId,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        },
        operator: {
          id: users.id,
          username: users.username,
          password:users.password,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          permissions: users.permissions,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(loans)
      .innerJoin(customers, eq(loans.customerId, customers.id))
      .innerJoin(users, eq(loans.operatorId, users.id))
      .orderBy(desc(loans.createdAt));
  }

  async getLoan(id: string) {
    const [loan] = await db
      .select({
        id: loans.id,
        loanId: loans.loanId,
        customerId: loans.customerId,
        operatorId: loans.operatorId,
        loanAmount: loans.loanAmount,
        goldWeight: loans.goldWeight,
        goldPurity: loans.goldPurity,
        loanCategoryId:loans.loanCategoryId,
        status: loans.status,
        issueDate: loans.issueDate,
        customFields: loans.customFields,
        createdAt: loans.createdAt,
        updatedAt: loans.updatedAt,
        customer: {
          id: customers.id,
          fullName: customers.fullName,
          phoneNumber: customers.phoneNumber,
          aadhaarNumber: customers.aadhaarNumber,
          email: customers.email,
          address: customers.address,
          dateOfBirth: customers.dateOfBirth,
          occupation: customers.occupation,
          customFields: customers.customFields,
          operatorId: customers.operatorId,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        },
        operator: {
          id: users.id,
          password:users.password,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          isActive: users.isActive,
          permissions: users.permissions,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(loans)
      .innerJoin(customers, eq(loans.customerId, customers.id))
      .innerJoin(users, eq(loans.operatorId, users.id))
      .where(eq(loans.loanId, id));

    if (!loan) return undefined;

    const loanPayments = await this.getLoanPayments(id);
    
    return { ...loan, payments: loanPayments };
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values(loan).returning();
    return newLoan;
  }

  async updateLoanStatuses() {
  const today = new Date();

  // Get all active loans
  const activeLoans = await db.select().from(loans).where(eq(loans.status, "active"));

  for (const loan of activeLoans) {
    if (!loan.issueDate) continue; // skip if null

const daysSinceIssue = Math.floor(
  (today.getTime() - new Date(loan.issueDate).getTime()) / (1000 * 60 * 60 * 24)
);



    // Get all interest ranges for this loan's category
    const ranges = await db.select().from(loanInterestRanges).where(eq(loanInterestRanges.categoryId, loan.loanCategoryId));

    const matchedRange = ranges.find(
      (range) => daysSinceIssue >= range.fromDays && daysSinceIssue <= range.toDays
    );

    if (matchedRange) {
      // Inside range → keep active (optional: mark "due" if close to end)
      const nearingEnd = daysSinceIssue >= (matchedRange.toDays - 3); // 3 days buffer before due

      if (nearingEnd) {
        await db.update(loans).set({ status: "due" }).where(eq(loans.id, loan.id));
      } else {
        // Still inside range and not nearing end, remain active
        await db.update(loans).set({ status: "active" }).where(eq(loans.id, loan.id));
      }
    } else {
      // Outside all ranges → overdue
      await db.update(loans).set({ status: "overdue" }).where(eq(loans.id, loan.id));
    }
  }
}

  async updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan> {
    const [updatedLoan] = await db
      .update(loans)
      .set({ ...loan, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return updatedLoan;
  }

  async getCustomerLoans(customerId: number): Promise<Loan[]> {
    return await db
      .select()
      .from(loans)
      .where(eq(loans.customerId, customerId))
      .orderBy(desc(loans.createdAt));
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getLoanPayments(loanId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.loanId, loanId))
      .orderBy(desc(payments.paymentDate));
  }

  // Operator management
  async getOperators(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "operator"))
      .orderBy(asc(users.firstName));
  }

  async updateOperatorPermissions(id: string, permissions: string[]): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ permissions, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deactivateOperator(id: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async reactivateOperator(id: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Form fields management
  async getFormFields(formType: "customer" | "loan"): Promise<FormField[]> {
    return await db
      .select()
      .from(formFields)
      .where(and(eq(formFields.formType, formType), eq(formFields.isActive, true)))
      .orderBy(asc(formFields.sortOrder));
  }

  async createFormField(field: InsertFormField): Promise<FormField> {
    const [newField] = await db.insert(formFields).values({
      formType: field.formType,
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options as string[] | null,
      isActive: field.isActive,
      sortOrder: field.sortOrder,
    }).returning();
    return newField;
  }

  async updateFormField(id: number, field: Partial<InsertFormField>): Promise<FormField> {
    const [updatedField] = await db
      .update(formFields)
      .set({
        formType: field.formType,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        options: field.options as string[] | null,
        isActive: field.isActive,
        sortOrder: field.sortOrder,
      })
      .where(eq(formFields.id, id))
      .returning();
    return updatedField;
  }

  async deleteFormField(id: number): Promise<void> {
    await db.update(formFields).set({ isActive: false }).where(eq(formFields.id, id));
  }

  // Analytics
  async getAnalytics() {
    const [totalCustomersResult] = await db.select({ count: count() }).from(customers);
    const [activeLoansResult] = await db
      .select({ count: count() })
      .from(loans)
      .where(eq(loans.status, "active"));
    const [totalActiveLoanAmountResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${loans.loanAmount}), 0)` })
      .from(loans)
      .where(eq(loans.status, "active"));
     const monthlyTotals = await db
    .select({
      month: sql<string>`TO_CHAR(${loans.createdAt}, 'YYYY-MM')`, // e.g., 2025-07
      total: sql<string>`COALESCE(SUM(${loans.loanAmount}), 0)`
    })
    .from(loans)
    .groupBy(sql`TO_CHAR(${loans.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${loans.createdAt}, 'YYYY-MM')`);

    const monthlyLoanStatusBreakdown = await db
    .select({
      month: sql<string>`TO_CHAR(${loans.createdAt}, 'YYYY-MM')`,
      total: sql<number>`COUNT(*)`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${loans.status} = 'active')`,
      due: sql<number>`COUNT(*) FILTER (WHERE ${loans.status} = 'due')`,
      closed: sql<number>`COUNT(*) FILTER (WHERE ${loans.status} = 'closed')`
    })
    .from(loans)
    .groupBy(sql`TO_CHAR(${loans.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${loans.createdAt}, 'YYYY-MM') DESC`)
    .limit(12);

    const [overdueLoansResult] = await db
      .select({ count: count() })
      .from(loans)
      .where(eq(loans.status, "overdue"));
    const [activeOperatorsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "operator"), eq(users.isActive, true)));

    return {
      totalCustomers: totalCustomersResult.count,
      activeLoans: activeLoansResult.count,
      totalLoanAmount: monthlyTotals,
      totalActiveLoanAmount: totalActiveLoanAmountResult.sum || "0",
      overdueLoans: overdueLoansResult.count,
      activeOperators: activeOperatorsResult.count,
      monthlyLoanStatusBreakdown,
    };
  }

  // Activity logging
  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getRecentActivities(limit: number = 10) {
    return await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        user: {
          id: users.id,
          password:users.password,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          _profileImageUrl: users.profileImageUrl,
          get profileImageUrl() {
            return this._profileImageUrl;
          },
          set profileImageUrl(value) {
            this._profileImageUrl = value;
          },
          role: users.role,
          isActive: users.isActive,
          permissions: users.permissions,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }



  // Close loan operation
  async closeLoan(loanId: string, userId: string): Promise<Loan> {
    // Fetch the user to check their role
    const user = await this.getUser(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can close loans.");
    }

    // Update the loan status to 'closed'
    const [closedLoan] = await db
      .update(loans)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(loans.loanId, loanId))
      .returning();

    if (!closedLoan) {
      throw new Error("Loan not found or could not be closed.");
    }

    return closedLoan;
  }
}

export const storage = new DatabaseStorage();
