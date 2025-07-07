document.addEventListener("DOMContentLoaded", () => {
  // Check if admin is logged in
  const isLoggedIn = localStorage.getItem("zeusBank_isLoggedIn")
  const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))

  if (!isLoggedIn || !currentUser || currentUser.role !== "admin") {
    window.location.href = "login.html"
    return
  }

  // Navigation
  const navLinks = document.querySelectorAll(".admin-nav a")
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()

      // Get section id from href
      const sectionId = this.getAttribute("href").substring(1) + "-section"

      // Hide all sections
      document.querySelectorAll(".admin-section").forEach((section) => {
        section.classList.remove("active")
      })

      // Show selected section
      document.getElementById(sectionId).classList.add("active")

      // Update active nav link
      document.querySelectorAll(".admin-nav li").forEach((li) => {
        li.classList.remove("active")
      })
      this.parentElement.classList.add("active")

      // Load section data
      if (sectionId === "dashboard-section") {
        loadDashboardStats()
      } else if (sectionId === "users-section") {
        loadUsers()
      } else if (sectionId === "transactions-section") {
        loadTransactions()
      } else if (sectionId === "fund-section") {
        loadFundingHistory()
      }
    })
  })

  // Load dashboard stats by default
  loadDashboardStats()

  // User status filter
  const userStatusFilter = document.getElementById("userStatusFilter")
  if (userStatusFilter) {
    userStatusFilter.addEventListener("change", function () {
      loadUsers(this.value)
    })
  }

  // Transaction filters
  const transactionTypeFilter = document.getElementById("transactionTypeFilter")
  const transactionStatusFilter = document.getElementById("transactionStatusFilter")

  if (transactionTypeFilter && transactionStatusFilter) {
    transactionTypeFilter.addEventListener("change", function () {
      loadTransactions(this.value, transactionStatusFilter.value)
    })

    transactionStatusFilter.addEventListener("change", function () {
      loadTransactions(transactionTypeFilter.value, this.value)
    })
  }

  // Apply transaction settings
  const applyTransactionSettingsBtn = document.getElementById("applyTransactionSettingsBtn")
  if (applyTransactionSettingsBtn) {
    applyTransactionSettingsBtn.addEventListener("click", () => {
      const interbankTransferStatus = document.querySelector('input[name="interbankTransferStatus"]:checked').value
      const withdrawalStatus = document.querySelector('input[name="withdrawalStatus"]:checked').value

      // Update admin settings
      fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interbankTransferStatus,
          withdrawalStatus,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Transaction settings applied successfully")
            // Reload transactions
            loadTransactions()
          } else {
            alert(data.message || "Error applying settings")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // Update all users button
  const updateAllUsersBtn = document.getElementById("updateAllUsersBtn")
  if (updateAllUsersBtn) {
    updateAllUsersBtn.addEventListener("click", () => {
      const defaultAccountStatus = document.querySelector('input[name="defaultAccountStatus"]:checked').value

      // Update admin settings
      fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ defaultAccountStatus }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("All users updated successfully")
            // Reload users
            loadUsers()
          } else {
            alert(data.message || "Error updating users")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // Save settings button
  const saveSettingsBtn = document.getElementById("saveSettingsBtn")
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      // Get settings values
      const defaultTransactionStatus = document.getElementById("defaultTransactionStatus").checked
        ? "pending"
        : "successful"
      const transactionFee = Number.parseFloat(document.getElementById("transactionFee").value)
      const dailyTransferLimit = Number.parseFloat(document.getElementById("dailyTransferLimit").value)
      const defaultAccountStatus = document.getElementById("defaultAccountStatus").checked ? "pending" : "active"
      const initialBalance = Number.parseFloat(document.getElementById("initialBalance").value)
      const accountNumberPrefix = document.getElementById("accountNumberPrefix").value
      const emailNotifications = document.getElementById("emailNotifications").checked
      const smsNotifications = document.getElementById("smsNotifications").checked
      const adminAlertThreshold = Number.parseFloat(document.getElementById("adminAlertThreshold").value)

      // Update admin settings
      fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultTransactionStatus,
          transactionFee,
          dailyTransferLimit,
          defaultAccountStatus,
          initialBalance,
          accountNumberPrefix,
          emailNotifications,
          smsNotifications,
          adminAlertThreshold,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Settings saved successfully")
          } else {
            alert(data.message || "Error saving settings")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // Reset settings button
  const resetSettingsBtn = document.getElementById("resetSettingsBtn")
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all settings to default?")) {
        // Reset admin settings
        const defaultSettings = {
          interbankTransferStatus: "successful",
          withdrawalStatus: "pending",
          depositStatus: "pending",
          defaultAccountStatus: "pending",
          defaultTransactionStatus: "pending",
          transactionFee: 1.5,
          dailyTransferLimit: 50000,
          initialBalance: 0,
          accountNumberPrefix: "5588",
          emailNotifications: true,
          smsNotifications: false,
          adminAlertThreshold: 10000,
        }

        fetch("/api/admin/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(defaultSettings),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              alert("Settings reset to default")
              // Reload page to update UI
              window.location.reload()
            } else {
              alert(data.message || "Error resetting settings")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            alert("An error occurred. Please try again.")
          })
      }
    })
  }

  // Admin fund form
  const adminFundForm = document.getElementById("adminFundForm")
  if (adminFundForm) {
    adminFundForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const accountNumber = document.getElementById("userAccountNumber").value
      const amount = Number.parseFloat(document.getElementById("fundAmount").value)
      const description = document.getElementById("fundDescription").value

      // Simple validation
      if (!accountNumber || isNaN(amount) || amount <= 0) {
        alert("Please fill in all fields with valid values")
        return
      }

      // Send fund request to server
      fetch("/api/admin/fund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber,
          amount,
          description,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Account funded successfully")
            // Reset form and reload funding history
            adminFundForm.reset()
            loadFundingHistory()
          } else {
            alert(data.message || "Error funding account")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // User modal
  const userModal = document.getElementById("userModal")
  const editUserForm = document.getElementById("editUserForm")

  if (editUserForm) {
    editUserForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const userId = document.getElementById("editUserId").value
      const name = document.getElementById("editUserName").value
      const email = document.getElementById("editUserEmail").value
      const balance = Number.parseFloat(document.getElementById("editUserBalance").value)
      const status = document.getElementById("editUserStatus").value

      // Simple validation
      if (!name || !email || isNaN(balance)) {
        alert("Please fill in all fields with valid values")
        return
      }

      // Update user
      fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          fullName: name,
          email: email,
          balance: balance,
          status: status,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Close modal
            userModal.classList.remove("show")
            // Reload users
            loadUsers()
            alert("User updated successfully")
          } else {
            alert(data.message || "Error updating user")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // Transaction modal
  const transactionModal = document.getElementById("transactionModal")
  const editTransactionForm = document.getElementById("editTransactionForm")

  if (editTransactionForm) {
    editTransactionForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const transactionId = document.getElementById("editTransactionId").value
      const amount = Number.parseFloat(document.getElementById("editTransactionAmount").value)
      const status = document.getElementById("editTransactionStatus").value

      // Simple validation
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount")
        return
      }

      // Update transaction
      fetch("/api/admin/transaction", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: transactionId,
          amount: amount,
          status: status,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Close modal
            transactionModal.classList.remove("show")
            // Reload transactions
            loadTransactions()
            alert("Transaction updated successfully")
          } else {
            alert(data.message || "Error updating transaction")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred. Please try again.")
        })
    })
  }

  // Close modals when clicking on X
  const modalCloseButtons = document.querySelectorAll(".modal-close")
  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal")
      if (modal) {
        modal.classList.remove("show")
      }
    })
  })
})

// Helper Functions
function loadDashboardStats() {
  // Fetch users
  fetch("/api/admin/users")
    .then((response) => response.json())
    .then((userData) => {
      if (userData.success) {
        const users = userData.users
      }
    })
}

function loadUsers(status = "all") {
  fetch(`/api/admin/users?status=${status}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const users = data.users
        // Render users in the users-section
        renderUsers(users)
      } else {
        alert(data.message || "Error loading users")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      alert("An error occurred. Please try again.")
    })
}

function loadTransactions(type = "all", status = "all") {
  fetch(`/api/admin/transactions?type=${type}&status=${status}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const transactions = data.transactions
        // Render transactions in the transactions-section
        renderTransactions(transactions)
      } else {
        alert(data.message || "Error loading transactions")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      alert("An error occurred. Please try again.")
    })
}

function loadFundingHistory() {
  fetch("/api/admin/fund")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const fundingHistory = data.fundingHistory
        // Render funding history in the fund-section
        renderFundingHistory(fundingHistory)
      } else {
        alert(data.message || "Error loading funding history")
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      alert("An error occurred. Please try again.")
    })
}

function renderUsers(users) {
  const usersTableBody = document.getElementById("usersTableBody")
  if (usersTableBody) {
    // Clear existing rows
    usersTableBody.innerHTML = ""

    users.forEach((user) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.fullName}</td>
        <td>${user.email}</td>
        <td>${user.accountNumber}</td>
        <td>${user.balance}</td>
        <td>${user.status}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-user-btn" data-user-id="${user.id}" data-bs-toggle="modal" data-bs-target="#userModal">Edit</button>
        </td>
      `
      usersTableBody.appendChild(row)
    })

    // Add event listeners to edit buttons
    const editUserButtons = document.querySelectorAll(".edit-user-btn")
    editUserButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const userId = this.dataset.userId
        // Fetch user details and populate the modal
        fetch(`/api/admin/users/${userId}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              const user = data.user
              document.getElementById("editUserId").value = user.id
              document.getElementById("editUserName").value = user.fullName
              document.getElementById("editUserEmail").value = user.email
              document.getElementById("editUserBalance").value = user.balance
              document.getElementById("editUserStatus").value = user.status
            } else {
              alert(data.message || "Error loading user details")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            alert("An error occurred. Please try again.")
          })
      })
    })
  }
}

function renderTransactions(transactions) {
  const transactionsTableBody = document.getElementById("transactionsTableBody")
  if (transactionsTableBody) {
    // Clear existing rows
    transactionsTableBody.innerHTML = ""

    transactions.forEach((transaction) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${transaction.id}</td>
        <td>${transaction.senderAccountNumber}</td>
        <td>${transaction.receiverAccountNumber}</td>
        <td>${transaction.amount}</td>
        <td>${transaction.type}</td>
        <td>${transaction.status}</td>
        <td>
          <button class="btn btn-sm btn-primary edit-transaction-btn" data-transaction-id="${transaction.id}" data-bs-toggle="modal" data-bs-target="#transactionModal">Edit</button>
        </td>
      `
      transactionsTableBody.appendChild(row)
    })

    // Add event listeners to edit buttons
    const editTransactionButtons = document.querySelectorAll(".edit-transaction-btn")
    editTransactionButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const transactionId = this.dataset.transactionId
        // Fetch transaction details and populate the modal
        fetch(`/api/admin/transaction/${transactionId}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              const transaction = data.transaction
              document.getElementById("editTransactionId").value = transaction.id
              document.getElementById("editTransactionAmount").value = transaction.amount
              document.getElementById("editTransactionStatus").value = transaction.status
            } else {
              alert(data.message || "Error loading transaction details")
            }
          })
          .catch((error) => {
            console.error("Error:", error)
            alert("An error occurred. Please try again.")
          })
      })
    })
  }
}

function renderFundingHistory(fundingHistory) {
  const fundingHistoryTableBody = document.getElementById("fundingHistoryTableBody")
  if (fundingHistoryTableBody) {
    // Clear existing rows
    fundingHistoryTableBody.innerHTML = ""

    fundingHistory.forEach((fund) => {
      const row = document.createElement("tr")
      row.innerHTML = `
        <td>${fund.id}</td>
        <td>${fund.accountNumber}</td>
        <td>${fund.amount}</td>
        <td>${fund.description}</td>
        <td>${fund.createdAt}</td>
      `
      fundingHistoryTableBody.appendChild(row)
    })
  }
}
