import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { 
  insertCustomerSchema, 
  insertLoanSchema, 
  insertPaymentSchema,
  insertFormFieldSchema,
  insertLoanCategorySchema,
  insertCategoryRangeSchema
} from "../shared/schema.js";
import { z } from "zod";

import {db } from "./db.js";


import { loginSchema } from "../shared/schema.js";

import { log } from "console";

// Extend Express Request interface to include session
declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}



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

  // Create a loan category (Admin only)
app.post("/api/loan-categories", requireAdmin, async (req, res) => {
  try {
    const data = insertLoanCategorySchema.parse(req.body);
    const category = await storage.createLoanCategory(data);

    await storage.logActivity({
      userId: req.session.user.id,
      action: "create_loan_category",
      entityType: "loan_category",
      entityId: category.id.toString(),
      details: { name: [category.name] },
      ipAddress: req.ip || "",
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Create loan category error:", error);
    res.status(400).json({ message: "Failed to create loan category" });
  }
});

// Fetch all loan categories
app.get("/api/loan-categories", requireAuth, async (req, res) => {
  try {
    const categories = await storage.getLoanCategories();
    res.json(categories);
  } catch (error) {
    console.error("Fetch loan categories error:", error);
    res.status(500).json({ message: "Failed to fetch loan categories" });
  }
});

// Delete loan category by ID (Admin only)
app.delete("/api/loan-categories/:id", requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    await storage.deleteLoanCategory(categoryId);

    await storage.logActivity({
      userId: req.session.user.id,
      action: "delete_loan_category",
      entityType: "loan_category",
      entityId: categoryId.toString(),
      details: { deletedBy: [req.session.user.username] },
      ipAddress: req.ip || "",
    });

    res.json({ message: "Loan category deleted" });
  } catch (error: any) {
  if (error.code === "23503") {
    return res.status(400).json({
      message: "Cannot delete or edit category: It is still being used in existing loans.",
    });
  }

  console.error("Delete loan category error:", error);
  res.status(400).json({ message: "Cannot delete or edit category: It is still being used in existing loans." });
}})


// Add interest range to a loan category (Admin only)
app.post("/api/category-ranges", requireAdmin, async (req, res) => {
  try {
    const data = insertCategoryRangeSchema.parse(req.body);
    // Map interestRate to interestPercent for storage
    const range = await storage.addCategoryRange({
      ...data,
      interestPercent: data.interestRate,
    });

    await storage.logActivity({
      userId: req.session.user.id,
      action: "add_category_range",
      entityType: "category_range",
      entityId: range.id.toString(),
      details: {
        categoryId: [range.categoryId.toString()],
        range: [`${range.fromDays}-${range.toDays} days at ${range.interestPercent}%`],
      },
      ipAddress: req.ip || "",
    });

    res.status(201).json(range);
  } catch (error) {
    console.error("Add category range error:", error);
    res.status(400).json({ message: "Failed to add interest range" });
  }
});

// Get interest ranges for a category
app.get("/api/category-ranges/:categoryId", requireAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const ranges = await storage.getCategoryRanges(categoryId);
    res.json(ranges);
  } catch (error) {
    console.error("Fetch category ranges error:", error);
    res.status(500).json({ message: "Failed to fetch interest ranges" });
  }
});

// Delete an interest range
app.delete("/api/category-ranges/:id", requireAdmin, async (req, res) => {
  try {
    const rangeId = parseInt(req.params.id);
    await storage.deleteCategoryRange(rangeId);

    await storage.logActivity({
      userId: req.session.user.id,
      action: "delete_category_range",
      entityType: "category_range",
      entityId: rangeId.toString(),
      details: { deletedBy: [req.session.user.username] },
      ipAddress: req.ip || "",
    });

    res.json({ message: "Category range deleted" });
  } catch (error) {
    console.error("Delete category range error:", error);
    res.status(400).json({ message: "Failed to delete category range" });
  }
});


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
      
      if (!user  || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      

      // Check if existing user's role matches requested role
      if (user.role !== role) {
        return res.status(401).json({ message: "Invalid role for this user" });
      }

      if (user.isActive === false) {
        return res.status(401).json({message:"Your account is inactive. Please contact the administrator."});
      }
      
      req.session.user = user;
      await storage.logActivity({
        userId: user.id,
        action: "login",
        entityType: "auth",
        entityId: user.id,
        details: { role: [user.role] },
        ipAddress: req.ip || "",
      });
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json(user);
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid credentials" });
    }
  });

  app.get("/api/settings/getgst", requireAdmin, async (req, res) => {
  try {
    const value = await storage.getGstPercentage();
    console.log("GST from DB:", value);
    res.json({ gst: value ?? 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch GST" });
  }
});

app.put("/api/settings/gst", requireAdmin, async (req, res) => {
  try {
    const { gst } = req.body;
    if (isNaN(gst)) {
      return res.status(400).json({ message: "Invalid GST value" });
    }

    await storage.updateGstPercentage(gst);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update GST" });
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

  app.get("/api/session", requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    res.status(200).json(user);
  } catch (error) {
    console.error("Session fetch error:", error);
    res.status(500).json({ message: "Failed to fetch session user" });
  }
});

app.post("/api/verify-password", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const sessionUser = req.session.user;

    // Get fresh user from DB by ID or username
    const user = await storage.getUserByUsername(sessionUser.username);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Password verification error:", error);
    res.status(500).json({ message: "Failed to verify password" });
  }
});


  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const { search } = req.query;
      const customers = await storage.getCustomers(search as string);

      
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

  app.post("/api/create/customer", requireAuth, async (req, res) => {
  try {
    const { phoneNumber, aadhaarNumber } = req.body;

    // 1. Check for existing customer with same phone or Aadhaar
    const existing = await storage.findCustomerByPhoneOrAadhaar(phoneNumber, aadhaarNumber);
    if (existing) {
      return res.status(400).json({ message: "Customer already exists with same Aadhaar or phone number." });
    }

    // 2. Prepare customer data
    const parsedData = {
      ...req.body,
      operatorId: req.session.user.id,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
    };

    const customerData = insertCustomerSchema.parse(parsedData);

    // 3. Create customer
    const customer = await storage.createCustomer(customerData);

    // 4. Log activity
    await storage.logActivity({
      userId: req.session.user.id,
      action: "create_customer",
      entityType: "customer",
      entityId: customer.id.toString(),
      details: { customerName: [customer.fullName] },
      ipAddress: req.ip || "",
    });

    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.flatten());
    } else {
      console.error("Unexpected error:", error);
    }
    res.status(400).json({ message: "Failed to create customer" });
  }
});




 
  


  
  app.get("/api/loans", requireAuth, async (req, res) => {
  try {
    const { status, customerId, search } = req.query;

    let loans = await storage.getLoans({
      status: status as string,
      customerId: customerId ? parseInt(customerId as string) : undefined,
    });

    if (search) {
      const lower = search.toString().toLowerCase();
      loans = loans.filter((loan) => {
        return (
          loan.loanId.toLowerCase().includes(lower) ||
          loan.customer?.fullName.toLowerCase().includes(lower) ||
          loan.customer?.phoneNumber.includes(lower)
        );
      });
    }

    res.json(loans);
  } catch (error) {
    console.error("Get loans error:", error);
    res.status(500).json({ message: "Failed to fetch loans" });
  }
});


app.get("/api/loans/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const loan = await storage.getLoan(id);
    
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }
    
    res.status(200).json(loan);
  } catch (error) {
    console.error("Get loan error:", error);
    res.status(500).json({ message: "Failed to fetch loan" });
  }
});

app.get("/api/loans/due-this-week", requireAuth, async (req, res) => {
  try {
    // Ensure loan statuses are up to date first
    await storage.updateLoanStatuses();

    const dueLoans = await storage.givedueloan();
    

    res.status(200).json(dueLoans);
  } catch (err) {
    console.error("Failed to fetch due loans:", err);
    res.status(500).json({ message: "Failed to get due loans" });
  }
});

// Get total interest amount for a loan
app.get("/api/loans/:id/interest", requireAuth, async (req, res) => {
  try {
    const loanId = req.params.id;

    if (!loanId) {
      return res.status(400).json({ message: "Loan ID is required" });
    }

    const interestAmount = await storage.getInterestAmountForLoan(loanId);

    res.json({ loanId, interestAmount });
  } catch (error) {
    console.error("Error calculating interest:", error);
    res.status(500).json({ message: "Failed to calculate interest" });
  }
});


 app.post("/api/loans", requireAuth, async (req, res) => {
  try {
    // Count existing loans to generate a new loanId
    const loanCount = await storage.getLoans({});

    const categories = await storage.getLoanCategories();

    const categoryId = req.body.loanCategoryId;

    let CatName;

    categories.map((cat)=>{
      if(cat.id===categoryId){
        CatName = cat.name;
      }else{
        CatName = 'GL';
      }
    })
    const loanId = `${CatName}-${new Date().getDate()}${new Date().getMonth() + 1}${new Date().getFullYear()}-${String(loanCount.length + 1).padStart(3, "0")}`;
    // +1 is used because getMonth() returns a zero-based month index (0 for January, 11 for December)
    const startDate = new Date();

    const parsedData = {
      ...req.body,
      loanId,
      operatorId: req.session.user.id,
      loanAmount: req.body.loanAmount.toString(),
      goldWeight: req.body.goldWeight.toString(),
      goldPurity: req.body.goldPurity.toString(),
    };

    const loanData = insertLoanSchema.parse(parsedData);
    const loan = await storage.createLoan(loanData);

    await storage.logActivity({
      userId: req.session.user.id,
      action: "create_loan",
      entityType: "loan",
      entityId: loan.id.toString(),
      details: { loanId: [loan.loanId], amount: [loan.loanAmount] , createdBy:[ `${req.session.user.firstName} ${req.session.user.lastName}`] },
      ipAddress: req.ip || "",
    });

    res.status(201).json(loan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.flatten());
    } else {
      console.error("Unexpected error:", error);
    }
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
        details: { amount: [payment.amount], loanId: [payment.loanId] },
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
      const { username, email, firstName, lastName, permissions ,password} = req.body;

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;


      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.",
        });
}

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const operatorId = `operator_${username}_${Date.now()}`;
      const newOperator = await storage.upsertUser({
        id: operatorId,
        password,
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
        details: { operatorName: [`${firstName} ${lastName}`], username: [username] },
        ipAddress: req.ip || "",
      });
      
      res.status(201).json({ 
        operator: newOperator,
        credentials: {
          username,
          password,
          message: "Operator can login with any password using this username"
        }
      });
    } catch (error) {
      console.error("Error creating operator:", error);
      res.status(500).json({ message: "Failed to create operator" });
    }
  });



  app.get("/api/admin/fetch/operators", requireAdmin, async (req, res) => {
  try {
    const operators = await storage.getOperators();
    res.json(operators);
  } catch (error) {
    console.error("Failed to fetch operators", error);
    res.status(500).json({ message: "Error fetching operators" });
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

    const validPermissions = ["view", "create", "edit", "delete", "all"];
    if (!Array.isArray(permissions) || !permissions.every(p => validPermissions.includes(p))) {
      return res.status(400).json({ message: "Invalid permissions format" });
    }

    const operators = await storage.getOperators();
    const foundOperator = operators.find(o => o.id === id);
    if (!foundOperator) {
      return res.status(404).json({ message: "Operator not found" });
    }

    const updated = await storage.updateOperatorPermissions(id, permissions);

    await storage.logActivity({
      userId: req.session.user.id,
      action: "update_operator_permissions",
      entityType: "operator",
      entityId: id,
      details:{ operatorName:[ `${foundOperator.firstName} ${foundOperator.lastName}`] },
      ipAddress: req.ip || "",
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update operator permissions error:", error);
    return res.status(500).json({ message: "Failed to update operator permissions" });
  }
});


  app.put("/api/operators/deactivate/:id", requireAdmin, async (req: Request, res) => {
    try {
      const { id } = req.params;
      
      const operator = await storage.deactivateOperator(id);

      

      await storage.logActivity({
        userId: req.session.user.id,
        action: "deactivate_operator",
        entityType: "operator",
        entityId: id,
        details: { operatorName: [`${operator.firstName} ${operator.lastName}`] },
        ipAddress: req.ip || "",
      });
      
      res.json({ message: "Operator deactivated successfully" });
    } catch (error) {
      console.error("Deactivate operator error:", error);
      res.status(400).json({ message: "Failed to deactivate operator" });
    }
  });

  app.put("/api/operators/reactivate/:id", requireAdmin, async (req: Request, res) => {
    try {
      const { id } = req.params;
      
      const operator = await storage.reactivateOperator(id);

      

      await storage.logActivity({
        userId: req.session.user.id,
        action: "reactivate_operator",
        entityType: "operator",
        entityId: id,
        details: { operatorName: [`${operator.firstName} ${operator.lastName}`] },
        ipAddress: req.ip || "",
      });
      
      res.json({ message: "Operator reactivated successfully" });
    } catch (error) {
      console.error("Reactivate operator error:", error);
      res.status(400).json({ message: "Failed to reactivate operator" });
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
        details: { fieldName: [field.fieldName], formType: [field.formType ]},
        ipAddress: req.ip || "",
      });
      
      res.status(201).json(field);
    } catch (error) {
      console.error("Create form field error:", error);
      res.status(400).json({ message: "Failed to create form field" });
    }
  });

  // Close a loan (Admin only)
  app.put("/api/loans/:id/close", requireAdmin, async (req, res) => {
    try {
      const loanId = req.params.id
      if (!loanId) {
        return res.status(400).json({ message: "Invalid loan ID" });
      }

      const closedLoan = await storage.closeLoan(loanId, req.session.user.id);

      await storage.logActivity({
        userId: req.session.user.id,
        action: "close_loan",
        entityType: "loan",
        entityId: loanId.toString(),
        details: { closedBy: [`${req.session.user.username}`],loanId:[`${loanId}`] },
        ipAddress: req.ip || "",
      });

      res.json(closedLoan);
    } catch (error) {
      console.error("Close loan error:", error);
      res.status(400).json({ message: "Failed to close loan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
