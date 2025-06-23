import {
  users,
  customers,
  loans,
  payments,
  formFields,
  activityLogs,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Customer operations
  getCustomers(search?: string, operatorId?: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  
  // Loan operations
  getLoans(filters?: { status?: string; operatorId?: string; customerId?: number }): Promise<(Loan & { customer: Customer; operator: User })[]>;
  getLoan(id: number): Promise<(Loan & { customer: Customer; operator: User; payments: Payment[] }) | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan>;
  getCustomerLoans(customerId: number): Promise<Loan[]>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getLoanPayments(loanId: number): Promise<Payment[]>;
  
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
    totalLoanAmount: string;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  // Customer operations
  async getCustomers(search?: string, operatorId?: string): Promise<Customer[]> {
    let query = db.select().from(customers);
    
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
    
    if (operatorId) {
      conditions.push(eq(customers.operatorId, operatorId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(customers.createdAt));
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

  // Loan operations
  async getLoans(filters?: { status?: string; operatorId?: string; customerId?: number }) {
    let query = db
      .select({
        id: loans.id,
        loanId: loans.loanId,
        customerId: loans.customerId,
        operatorId: loans.operatorId,
        loanAmount: loans.loanAmount,
        goldWeight: loans.goldWeight,
        goldPurity: loans.goldPurity,
        interestRate: loans.interestRate,
        duration: loans.duration,
        status: loans.status,
        issueDate: loans.issueDate,
        dueDate: loans.dueDate,
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
      conditions.push(eq(loans.status, filters.status));
    }
    
    if (filters?.operatorId) {
      conditions.push(eq(loans.operatorId, filters.operatorId));
    }
    
    if (filters?.customerId) {
      conditions.push(eq(loans.customerId, filters.customerId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(loans.createdAt));
  }

  async getLoan(id: number) {
    const [loan] = await db
      .select({
        id: loans.id,
        loanId: loans.loanId,
        customerId: loans.customerId,
        operatorId: loans.operatorId,
        loanAmount: loans.loanAmount,
        goldWeight: loans.goldWeight,
        goldPurity: loans.goldPurity,
        interestRate: loans.interestRate,
        duration: loans.duration,
        status: loans.status,
        issueDate: loans.issueDate,
        dueDate: loans.dueDate,
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
      .where(eq(loans.id, id));

    if (!loan) return undefined;

    const loanPayments = await this.getLoanPayments(id);
    
    return { ...loan, payments: loanPayments };
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values(loan).returning();
    return newLoan;
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

  async getLoanPayments(loanId: number): Promise<Payment[]> {
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

  // Form fields management
  async getFormFields(formType: "customer" | "loan"): Promise<FormField[]> {
    return await db
      .select()
      .from(formFields)
      .where(and(eq(formFields.formType, formType), eq(formFields.isActive, true)))
      .orderBy(asc(formFields.sortOrder));
  }

  async createFormField(field: InsertFormField): Promise<FormField> {
    const [newField] = await db.insert(formFields).values(field).returning();
    return newField;
  }

  async updateFormField(id: number, field: Partial<InsertFormField>): Promise<FormField> {
    const [updatedField] = await db
      .update(formFields)
      .set(field)
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
    const [totalLoanAmountResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${loans.loanAmount}), 0)` })
      .from(loans)
      .where(eq(loans.status, "active"));
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
      totalLoanAmount: totalLoanAmountResult.sum || "0",
      overdueLoans: overdueLoansResult.count,
      activeOperators: activeOperatorsResult.count,
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
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
