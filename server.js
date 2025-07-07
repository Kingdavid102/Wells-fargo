// Zeus Bank Server
const http = require("http")
const fs = require("fs")
const path = require("path")
const url = require("url")

// In-memory data store (would use a database in production)
const data = {
  users: [],
  transactions: [],
  adminSettings: {
    interbankTransferStatus: "successful", // Default setting for interbank transfers
    withdrawalStatus: "pending", // Default setting for withdrawals
    defaultAccountStatus: "pending", // Default status for new accounts
    transactionFee: 1.5,
    dailyTransferLimit: 50000,
    initialBalance: 0,
    accountNumberPrefix: "5588",
    emailNotifications: true,
    smsNotifications: false,
    adminAlertThreshold: 10000,
  },
  fundingHistory: [],
}

// Load data from JSON files if they exist
function loadData() {
  try {
    if (fs.existsSync("data/users.json")) {
      data.users = JSON.parse(fs.readFileSync("data/users.json", "utf8"))
    }
    if (fs.existsSync("data/transactions.json")) {
      data.transactions = JSON.parse(fs.readFileSync("data/transactions.json", "utf8"))
    }
    if (fs.existsSync("data/adminSettings.json")) {
      data.adminSettings = JSON.parse(fs.readFileSync("data/adminSettings.json", "utf8"))
    }
    if (fs.existsSync("data/fundingHistory.json")) {
      data.fundingHistory = JSON.parse(fs.readFileSync("data/fundingHistory.json", "utf8"))
    }
    console.log("Data loaded successfully")
  } catch (err) {
    console.error("Error loading data:", err)
  }
}

// Save data to JSON files
function saveData() {
  try {
    // Create data directory if it doesn't exist
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data")
    }

    fs.writeFileSync("data/users.json", JSON.stringify(data.users, null, 2))
    fs.writeFileSync("data/transactions.json", JSON.stringify(data.transactions, null, 2))
    fs.writeFileSync("data/adminSettings.json", JSON.stringify(data.adminSettings, null, 2))
    fs.writeFileSync("data/fundingHistory.json", JSON.stringify(data.fundingHistory, null, 2))
    console.log("Data saved successfully")
  } catch (err) {
    console.error("Error saving data:", err)
  }
}

// Generate a unique account number
function generateAccountNumber() {
  const prefix = data.adminSettings.accountNumberPrefix || "5588"
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()
  return prefix + randomDigits
}

// Generate a unique transaction ID
function generateTransactionId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString()
}

// API Routes
const apiRoutes = {
  // User authentication
  "/api/login": (req, res) => {
    if (req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const { username, password } = JSON.parse(body)

          // Check if it's the admin
          if (username === "admincbl" && password === "admin123cbl$") {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                success: true,
                user: { username: "admin", role: "admin" },
                message: "Admin login successful",
              }),
            )
            return
          }

          // Check regular users
          const user = data.users.find((u) => u.username === username && u.password === password)

          if (user) {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                success: true,
                user: { ...user, password: undefined }, // Don't send password back
                message: "Login successful",
              }),
            )
          } else {
            res.writeHead(401, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Invalid username or password" }))
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  "/api/register": (req, res) => {
    if (req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const userData = JSON.parse(body)

          // Validate required fields
          if (!userData.fullName || !userData.email || !userData.username || !userData.password) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Missing required fields" }))
            return
          }

          // Check if username already exists
          if (data.users.some((u) => u.username === userData.username)) {
            res.writeHead(409, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Username already exists" }))
            return
          }

          // Generate account number
          const accountNumber = generateAccountNumber()

          // Create new user
          const newUser = {
            id: Date.now().toString(),
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone || "",
            username: userData.username,
            password: userData.password, // In a real app, this would be hashed
            accountNumber: accountNumber,
            balance: data.adminSettings.initialBalance || 0,
            status: data.adminSettings.defaultAccountStatus || "pending",
            transactions: [],
            createdAt: new Date().toISOString(),
          }

          // Add user to data store
          data.users.push(newUser)
          saveData()

          // Return success response
          res.writeHead(201, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              user: { ...newUser, password: undefined }, // Don't send password back
              message: "Account created successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // User operations
  "/api/user": (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const userId = parsedUrl.query.id

    if (req.method === "GET") {
      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "User ID is required" }))
        return
      }

      const user = data.users.find((u) => u.id === userId)

      if (user) {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(
          JSON.stringify({
            success: true,
            user: { ...user, password: undefined }, // Don't send password back
          }),
        )
      } else {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "User not found" }))
      }
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // Transfer money
  "/api/transfer": (req, res) => {
    if (req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const transferData = JSON.parse(body)

          // Validate required fields
          if (!transferData.fromAccount || !transferData.toAccount || !transferData.amount) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Missing required fields" }))
            return
          }

          // Find sender
          const senderIndex = data.users.findIndex((u) => u.accountNumber === transferData.fromAccount)

          if (senderIndex === -1) {
            res.writeHead(404, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Sender account not found" }))
            return
          }

          const sender = data.users[senderIndex]
          const amount = Number.parseFloat(transferData.amount)

          // Check if sender has enough balance
          if (sender.balance < amount) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Insufficient funds" }))
            return
          }

          // Find recipient
          const recipientIndex = data.users.findIndex((u) => u.accountNumber === transferData.toAccount)

          // Determine transaction type and status
          let transactionType = "transfer"
          let transactionStatus = "pending"

          if (recipientIndex !== -1) {
            // Interbank transfer
            transactionStatus = data.adminSettings.interbankTransferStatus
          } else {
            // External transfer (withdrawal)
            transactionType = "withdrawal"
            transactionStatus = data.adminSettings.withdrawalStatus
          }

          // Create transaction
          const transactionId = generateTransactionId()
          const transaction = {
            id: transactionId,
            fromAccount: transferData.fromAccount,
            toAccount: transferData.toAccount,
            amount: amount,
            type: transactionType,
            status: transactionStatus,
            memo: transferData.memo || "",
            date: new Date().toISOString(),
          }

          // Add transaction to sender's transactions
          sender.transactions.push(transaction)

          // Update balances if transaction is successful
          if (transactionStatus === "successful") {
            sender.balance -= amount

            if (recipientIndex !== -1) {
              const recipient = data.users[recipientIndex]
              recipient.balance += amount

              // Add transaction to recipient's transactions
              recipient.transactions.push({
                id: transactionId,
                fromAccount: transferData.fromAccount,
                toAccount: transferData.toAccount,
                amount: amount,
                type: "deposit",
                status: "successful",
                memo: transferData.memo || "",
                date: new Date().toISOString(),
              })

              // Update recipient in data store
              data.users[recipientIndex] = recipient
            }
          }

          // Update sender in data store
          data.users[senderIndex] = sender

          // Add transaction to global transactions
          data.transactions.push(transaction)

          // Save data
          saveData()

          // Return response
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              transaction: transaction,
              message:
                transactionStatus === "successful"
                  ? "Transaction completed successfully"
                  : "Transaction is pending approval",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // Get user transactions
  "/api/transactions": (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const userId = parsedUrl.query.userId
    const accountNumber = parsedUrl.query.accountNumber

    if (req.method === "GET") {
      let userTransactions = []

      if (userId) {
        // Get transactions for specific user
        const user = data.users.find((u) => u.id === userId)

        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "User not found" }))
          return
        }

        userTransactions = user.transactions
      } else if (accountNumber) {
        // Get transactions for specific account
        const user = data.users.find((u) => u.accountNumber === accountNumber)

        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Account not found" }))
          return
        }

        userTransactions = user.transactions
      } else {
        // Get all transactions (admin only)
        userTransactions = data.transactions
      }

      // Sort transactions by date (newest first)
      userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          transactions: userTransactions,
        }),
      )
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // Admin routes
  "/api/admin/users": (req, res) => {
    if (req.method === "GET") {
      // Return all users (without passwords)
      const usersWithoutPasswords = data.users.map((user) => {
        const { password, ...userWithoutPassword } = user
        return userWithoutPassword
      })

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          users: usersWithoutPasswords,
        }),
      )
    } else if (req.method === "PUT") {
      // Update user
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const userData = JSON.parse(body)

          if (!userData.id) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "User ID is required" }))
            return
          }

          const userIndex = data.users.findIndex((u) => u.id === userData.id)

          if (userIndex === -1) {
            res.writeHead(404, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "User not found" }))
            return
          }

          // Update user fields
          const user = data.users[userIndex]

          if (userData.fullName) user.fullName = userData.fullName
          if (userData.email) user.email = userData.email
          if (userData.phone) user.phone = userData.phone
          if (userData.status) user.status = userData.status
          if (userData.balance !== undefined) user.balance = Number.parseFloat(userData.balance)

          // Update user in data store
          data.users[userIndex] = user
          saveData()

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              user: { ...user, password: undefined },
              message: "User updated successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else if (req.method === "DELETE") {
      const parsedUrl = url.parse(req.url, true)
      const userId = parsedUrl.query.id

      if (!userId) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "User ID is required" }))
        return
      }

      const userIndex = data.users.findIndex((u) => u.id === userId)

      if (userIndex === -1) {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "User not found" }))
        return
      }

      // Remove user
      data.users.splice(userIndex, 1)
      saveData()

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          message: "User deleted successfully",
        }),
      )
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  "/api/admin/settings": (req, res) => {
    if (req.method === "GET") {
      // Return admin settings
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          settings: data.adminSettings,
        }),
      )
    } else if (req.method === "PUT") {
      // Update admin settings
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const newSettings = JSON.parse(body)

          // Update settings
          data.adminSettings = { ...data.adminSettings, ...newSettings }
          saveData()

          // Apply settings to existing transactions if needed
          if (newSettings.interbankTransferStatus !== undefined || newSettings.withdrawalStatus !== undefined) {
            updateAllTransactionsStatus(newSettings.interbankTransferStatus, newSettings.withdrawalStatus)
          }

          // Apply settings to existing users if needed
          if (newSettings.defaultAccountStatus !== undefined) {
            updateAllUsersStatus(newSettings.defaultAccountStatus)
          }

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              settings: data.adminSettings,
              message: "Settings updated successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  "/api/admin/fund": (req, res) => {
    if (req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const fundData = JSON.parse(body)

          // Validate required fields
          if (!fundData.accountNumber || !fundData.amount) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Missing required fields" }))
            return
          }

          // Find user
          const userIndex = data.users.findIndex((u) => u.accountNumber === fundData.accountNumber)

          if (userIndex === -1) {
            res.writeHead(404, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "User not found" }))
            return
          }

          const user = data.users[userIndex]
          const amount = Number.parseFloat(fundData.amount)

          // Create transaction
          const transactionId = generateTransactionId()
          const transaction = {
            id: transactionId,
            fromAccount: "ADMIN",
            toAccount: fundData.accountNumber,
            amount: amount,
            type: "deposit",
            status: "successful", // Admin deposits are always successful
            memo: fundData.description || "Admin deposit",
            date: new Date().toISOString(),
          }

          // Add transaction to user's transactions
          user.transactions.push(transaction)

          // Update user's balance
          user.balance += amount

          // Update user in data store
          data.users[userIndex] = user

          // Add transaction to global transactions
          data.transactions.push(transaction)

          // Add to funding history
          data.fundingHistory.push({
            date: new Date().toISOString(),
            accountNumber: fundData.accountNumber,
            amount: amount,
            description: fundData.description || "Admin deposit",
          })

          // Save data
          saveData()

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              transaction: transaction,
              message: "Account funded successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  "/api/admin/funding-history": (req, res) => {
    if (req.method === "GET") {
      // Return funding history
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          fundingHistory: data.fundingHistory,
        }),
      )
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  "/api/admin/transaction": (req, res) => {
    if (req.method === "PUT") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const transactionData = JSON.parse(body)

          // Validate required fields
          if (!transactionData.id) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Transaction ID is required" }))
            return
          }

          // Find transaction in global transactions
          const transactionIndex = data.transactions.findIndex((t) => t.id === transactionData.id)

          if (transactionIndex === -1) {
            res.writeHead(404, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "Transaction not found" }))
            return
          }

          const transaction = data.transactions[transactionIndex]
          const oldStatus = transaction.status
          const oldAmount = transaction.amount

          // Update transaction fields
          if (transactionData.amount !== undefined) transaction.amount = Number.parseFloat(transactionData.amount)
          if (transactionData.status !== undefined) transaction.status = transactionData.status

          // Update transaction in global transactions
          data.transactions[transactionIndex] = transaction

          // Find transaction in user's transactions and update it
          let updated = false

          for (let i = 0; i < data.users.length; i++) {
            const user = data.users[i]
            const userTransactionIndex = user.transactions.findIndex((t) => t.id === transactionData.id)

            if (userTransactionIndex !== -1) {
              // Update transaction in user's transactions
              user.transactions[userTransactionIndex] = { ...transaction }

              // Update user's balance if status changed
              if (oldStatus !== transaction.status) {
                if (oldStatus === "pending" && transaction.status === "successful") {
                  // Transaction now successful
                  if (transaction.type === "deposit") {
                    user.balance += transaction.amount
                  } else if (transaction.type === "withdrawal" || transaction.type === "transfer") {
                    user.balance -= transaction.amount

                    // If transfer, update recipient balance
                    if (transaction.type === "transfer") {
                      const recipientIndex = data.users.findIndex((u) => u.accountNumber === transaction.toAccount)
                      if (recipientIndex !== -1) {
                        data.users[recipientIndex].balance += transaction.amount
                      }
                    }
                  }
                } else if (oldStatus === "successful" && transaction.status === "pending") {
                  // Transaction now pending
                  if (transaction.type === "deposit") {
                    user.balance -= oldAmount
                  } else if (transaction.type === "withdrawal" || transaction.type === "transfer") {
                    user.balance += oldAmount

                    // If transfer, update recipient balance
                    if (transaction.type === "transfer") {
                      const recipientIndex = data.users.findIndex((u) => u.accountNumber === transaction.toAccount)
                      if (recipientIndex !== -1) {
                        data.users[recipientIndex].balance -= oldAmount
                      }
                    }
                  }
                }
              } else if (transaction.status === "successful" && oldAmount !== transaction.amount) {
                // Amount changed for successful transaction
                if (transaction.type === "deposit") {
                  user.balance = user.balance - oldAmount + transaction.amount
                } else if (transaction.type === "withdrawal" || transaction.type === "transfer") {
                  user.balance = user.balance + oldAmount - transaction.amount

                  // If transfer, update recipient balance
                  if (transaction.type === "transfer") {
                    const recipientIndex = data.users.findIndex((u) => u.accountNumber === transaction.toAccount)
                    if (recipientIndex !== -1) {
                      data.users[recipientIndex].balance =
                        data.users[recipientIndex].balance - oldAmount + transaction.amount
                    }
                  }
                }
              }

              // Update user in data store
              data.users[i] = user
              updated = true
            }
          }

          // Save data
          saveData()

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              transaction: transaction,
              message: "Transaction updated successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else if (req.method === "DELETE") {
      const parsedUrl = url.parse(req.url, true)
      const transactionId = parsedUrl.query.id

      if (!transactionId) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "Transaction ID is required" }))
        return
      }

      // Find transaction in global transactions
      const transactionIndex = data.transactions.findIndex((t) => t.id === transactionId)

      if (transactionIndex === -1) {
        res.writeHead(404, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: false, message: "Transaction not found" }))
        return
      }

      const transaction = data.transactions[transactionIndex]

      // Remove transaction from global transactions
      data.transactions.splice(transactionIndex, 1)

      // Remove transaction from user's transactions
      for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i]
        const userTransactionIndex = user.transactions.findIndex((t) => t.id === transactionId)

        if (userTransactionIndex !== -1) {
          // Remove transaction from user's transactions
          user.transactions.splice(userTransactionIndex, 1)

          // Update user's balance if transaction was successful
          if (transaction.status === "successful") {
            if (transaction.type === "deposit") {
              user.balance -= transaction.amount
            } else if (transaction.type === "withdrawal" || transaction.type === "transfer") {
              user.balance += transaction.amount
            }
          }

          // Update user in data store
          data.users[i] = user
        }
      }

      // Save data
      saveData()

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          message: "Transaction deleted successfully",
        }),
      )
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // Handle profile image upload
  "/api/upload-profile-image": (req, res) => {
    if (req.method === "POST") {
      // In a real implementation, this would handle file uploads
      // For now, we'll just simulate a successful upload
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify({
          success: true,
          message: "Profile image uploaded successfully",
          imageUrl: "/uploads/profile-image.jpg", // This would be the actual path in a real implementation
        }),
      )
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },

  // Update user profile
  "/api/update-profile": (req, res) => {
    if (req.method === "PUT") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      req.on("end", () => {
        try {
          const profileData = JSON.parse(body)

          // Validate required fields
          if (!profileData.id) {
            res.writeHead(400, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "User ID is required" }))
            return
          }

          // Find user
          const userIndex = data.users.findIndex((u) => u.id === profileData.id)

          if (userIndex === -1) {
            res.writeHead(404, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ success: false, message: "User not found" }))
            return
          }

          const user = data.users[userIndex]

          // Update user fields
          if (profileData.fullName) user.fullName = profileData.fullName
          if (profileData.email) user.email = profileData.email
          if (profileData.phone) user.phone = profileData.phone
          if (profileData.username) user.username = profileData.username

          // Update password if provided
          if (profileData.currentPassword && profileData.newPassword) {
            if (user.password !== profileData.currentPassword) {
              res.writeHead(401, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ success: false, message: "Current password is incorrect" }))
              return
            }

            user.password = profileData.newPassword
          }

          // Update user in data store
          data.users[userIndex] = user
          saveData()

          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(
            JSON.stringify({
              success: true,
              user: { ...user, password: undefined },
              message: "Profile updated successfully",
            }),
          )
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ success: false, message: "Invalid request format" }))
        }
      })
    } else {
      res.writeHead(405, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "Method not allowed" }))
    }
  },
}

// Helper functions
function updateAllTransactionsStatus(interbankTransferStatus, withdrawalStatus) {
  if (!interbankTransferStatus && !withdrawalStatus) return

  // Update global transactions
  data.transactions.forEach((transaction) => {
    if (transaction.type === "transfer" && interbankTransferStatus) {
      transaction.status = interbankTransferStatus
    } else if (transaction.type === "withdrawal" && withdrawalStatus) {
      transaction.status = withdrawalStatus
    }
  })

  // Update user transactions
  data.users.forEach((user) => {
    user.transactions.forEach((transaction) => {
      if (transaction.type === "transfer" && interbankTransferStatus) {
        transaction.status = interbankTransferStatus
      } else if (transaction.type === "withdrawal" && withdrawalStatus) {
        transaction.status = withdrawalStatus
      }
    })
  })

  // Save data
  saveData()
}

function updateAllUsersStatus(status) {
  if (!status) return

  // Update all users
  data.users.forEach((user) => {
    user.status = status
  })

  // Save data
  saveData()
}

// Static file server
function serveStaticFile(req, res) {
  const parsedUrl = url.parse(req.url)
  const filePath = path.join(__dirname, "public", parsedUrl.pathname === "/" ? "index.html" : parsedUrl.pathname)

  const extname = path.extname(filePath)
  let contentType = "text/html"

  switch (extname) {
    case ".js":
      contentType = "text/javascript"
      break
    case ".css":
      contentType = "text/css"
      break
    case ".json":
      contentType = "application/json"
      break
    case ".png":
      contentType = "image/png"
      break
    case ".jpg":
      contentType = "image/jpg"
      break
    case ".svg":
      contentType = "image/svg+xml"
      break
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Page not found
        fs.readFile(path.join(__dirname, "public", "404.html"), (err, content) => {
          res.writeHead(404, { "Content-Type": "text/html" })
          res.end(content, "utf8")
        })
      } else {
        // Server error
        res.writeHead(500)
        res.end(`Server Error: ${err.code}`)
      }
    } else {
      // Success
      res.writeHead(200, { "Content-Type": contentType })
      res.end(content, "utf8")
    }
  })
}

// Create server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.writeHead(200)
    res.end()
    return
  }

  // Parse URL
  const parsedUrl = url.parse(req.url)
  const pathname = parsedUrl.pathname

  // Check if request is for API
  if (pathname.startsWith("/api/")) {
    // Find matching API route
    const route = Object.keys(apiRoutes).find((route) => pathname.startsWith(route))

    if (route) {
      apiRoutes[route](req, res)
    } else {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: false, message: "API endpoint not found" }))
    }
  } else {
    // Serve static files
    serveStaticFile(req, res)
  }
})

// Load data on startup
loadData()

// Start server
const PORT = process.env.PORT || 7860
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
