import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertLoanSchema, 
  insertPaymentSchema,
  insertFormFieldSchema 
} from "@shared/schema";
import { z } from "zod";

// Extend Express Request interface to include session
declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["operator", "admin"]),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.session?.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = loginSchema.parse(req.body);
      
      // For admin role, only allow "admin" username
      if (role === "admin" && username !== "admin") {
        return res.status(401).json({ message: "Only 'admin' username is allowed for admin role" });
      }
      
      // Simple auth - in production, use proper password hashing
      let user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Create default users for demo
        const newUser = await storage.upsertUser({
          id: `${role}_${username}`,
          username,
          email: `${username}@goldlending.com`,
          firstName: username === "admin" ? "System" : username.charAt(0).toUpperCase() + username.slice(1),
          lastName: username === "admin" ? "Administrator" : "User",
          role: role as "operator" | "admin",
          isActive: true,
          permissions: role === "admin" ? ["all"] : ["view", "create", "edit"],
        });
        
        req.session.user = newUser;
        await storage.logActivity({
          userId: newUser.id,
          action: "login",
          entityType: "auth",
          entityId: newUser.id,
          details: { role: newUser.role },
          ipAddress: req.ip || "",
        });
        
        return res.json(newUser);
      }
      
      // Check if existing user's role matches requested role
      if (user.role !== role) {
        return res.status(401).json({ message: "Invalid role for this user" });
      }
      
      req.session.user = user;
      await storage.logActivity({
        userId: user.id,
        action: "login",
        entityType: "auth",
        entityId: user.id,
        details: { role: user.role },
        ipAddress: req.ip || "",
      });
      
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.session.user);
  });

  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const { search } = req.query;
      const operatorId = req.session.user.role === "operator" ? req.session.user.id : undefined;
      
      const customers = await storage.getCustomers(
        search as string, 
        operatorId
      );
      
      res.json(customers);
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Get customer error:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        operatorId: req.session.user.id,
      });
      
      const customer = await storage.createCustomer(customerData);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "create_customer",
        entityType: "customer",
        entityId: customer.id.toString(),
        details: { customerName: customer.fullName },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(400).json({ message: "Failed to create customer" });
    }
  });

  // Loan routes
  app.get("/api/loans", requireAuth, async (req, res) => {
    try {
      const { status, customerId } = req.query;
      const operatorId = req.session.user.role === "operator" ? req.session.user.id : undefined;
      
      const loans = await storage.getLoans({
        status: status as string,
        operatorId,
        customerId: customerId ? parseInt(customerId as string) : undefined,
      });
      
      res.json(loans);
    } catch (error) {
      console.error("Get loans error:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/loans/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const loan = await storage.getLoan(id);
      
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      res.json(loan);
    } catch (error) {
      console.error("Get loan error:", error);
      res.status(500).json({ message: "Failed to fetch loan" });
    }
  });

  app.post("/api/loans", requireAuth, async (req, res) => {
    try {
      // Generate loan ID
      const loanCount = await storage.getLoans({});
      const loanId = `GL-${new Date().getFullYear()}-${String(loanCount.length + 1).padStart(3, '0')}`;
      
      const loanData = insertLoanSchema.parse({
        ...req.body,
        loanId,
        operatorId: req.session.user.id,
      });
      
      const loan = await storage.createLoan(loanData);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "create_loan",
        entityType: "loan",
        entityId: loan.id.toString(),
        details: { loanId: loan.loanId, amount: loan.loanAmount },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json(loan);
    } catch (error) {
      console.error("Create loan error:", error);
      res.status(400).json({ message: "Failed to create loan" });
    }
  });

  app.get("/api/customers/:customerId/loans", requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const loans = await storage.getCustomerLoans(customerId);
      res.json(loans);
    } catch (error) {
      console.error("Get customer loans error:", error);
      res.status(500).json({ message: "Failed to fetch customer loans" });
    }
  });

  // Payment routes
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse({
        ...req.body,
        operatorId: req.session.user.id,
      });
      
      const payment = await storage.createPayment(paymentData);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "create_payment",
        entityType: "payment",
        entityId: payment.id.toString(),
        details: { amount: payment.amount, loanId: payment.loanId },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(400).json({ message: "Failed to create payment" });
    }
  });

  // Admin: Create operator (Admin only)
  app.post("/api/admin/operators", requireAdmin, async (req: any, res) => {
    try {
      const { username, email, firstName, lastName, permissions } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const operatorId = `operator_${username}_${Date.now()}`;
      const newOperator = await storage.upsertUser({
        id: operatorId,
        username,
        email,
        firstName,
        lastName,
        role: "operator",
        isActive: true,
        permissions: permissions || ["view", "create", "edit"],
      });
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "create_operator",
        entityType: "operator",
        entityId: newOperator.id,
        details: { operatorName: `${firstName} ${lastName}`, username },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json({ 
        operator: newOperator,
        credentials: {
          username,
          password: "operator123",
          message: "Operator can login with any password using this username"
        }
      });
    } catch (error) {
      console.error("Error creating operator:", error);
      res.status(500).json({ message: "Failed to create operator" });
    }
  });

  // Admin routes
  app.get("/api/operators", requireAdmin, async (req, res) => {
    try {
      const operators = await storage.getOperators();
      res.json(operators);
    } catch (error) {
      console.error("Get operators error:", error);
      res.status(500).json({ message: "Failed to fetch operators" });
    }
  });

  app.put("/api/operators/:id/permissions", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      
      const operator = await storage.updateOperatorPermissions(id, permissions);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "update_operator_permissions",
        entityType: "operator",
        entityId: id,
        details: { permissions: permissions },
        ipAddress: req.ip || "",
      });
      
      res.json(operator);
    } catch (error) {
      console.error("Update operator permissions error:", error);
      res.status(400).json({ message: "Failed to update operator permissions" });
    }
  });

  app.put("/api/operators/:id/deactivate", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const operator = await storage.deactivateOperator(id);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "deactivate_operator",
        entityType: "operator",
        entityId: id,
        details: { operatorName: `${operator.firstName} ${operator.lastName}` },
        ipAddress: req.ip || "",
      });
      
      res.json({ message: "Operator deactivated successfully" });
    } catch (error) {
      console.error("Deactivate operator error:", error);
      res.status(400).json({ message: "Failed to deactivate operator" });
    }
  });

  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/activities", requireAdmin, async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await storage.getRecentActivities(
        limit ? parseInt(limit as string) : 10
      );
      res.json(activities);
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Form fields routes
  app.get("/api/form-fields/:formType", requireAuth, async (req, res) => {
    try {
      const { formType } = req.params;
      const fields = await storage.getFormFields(formType as "customer" | "loan");
      res.json(fields);
    } catch (error) {
      console.error("Get form fields error:", error);
      res.status(500).json({ message: "Failed to fetch form fields" });
    }
  });

  app.post("/api/form-fields", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const fieldData = insertFormFieldSchema.parse(req.body);
      const field = await storage.createFormField(fieldData);
      
      await storage.logActivity({
        userId: req.session.user.id,
        action: "create_form_field",
        entityType: "form_field",
        entityId: field.id.toString(),
        details: { fieldName: field.fieldName, formType: field.formType },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json(field);
    } catch (error) {
      console.error("Create form field error:", error);
      res.status(400).json({ message: "Failed to create form field" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
