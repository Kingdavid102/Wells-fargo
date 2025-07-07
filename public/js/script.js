// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem("zeusBank_isLoggedIn")
  const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))

  // Update time in status bar
  const timeElement = document.querySelector(".time")
  if (timeElement) {
    const now = new Date()
    timeElement.textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // Login Form Handling
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    // Show/hide password functionality
    const showPasswordBtn = document.querySelector(".show-password")
    const passwordInput = document.getElementById("password")

    if (showPasswordBtn && passwordInput) {
      showPasswordBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
          passwordInput.type = "text"
          showPasswordBtn.textContent = "Hide"
        } else {
          passwordInput.type = "password"
          showPasswordBtn.textContent = "Show"
        }
      })
    }
    // Show/hide password functionality for register page
    const registerForm = document.getElementById("registerForm")
    if (registerForm) {
      const showPasswordBtn = document.querySelector(".show-password")
      const passwordInput = document.getElementById("password")

      if (showPasswordBtn && passwordInput) {
        showPasswordBtn.addEventListener("click", () => {
          if (passwordInput.type === "password") {
            passwordInput.type = "text"
            showPasswordBtn.textContent = "Hide"
          } else {
            passwordInput.type = "password"
            showPasswordBtn.textContent = "Show"
          }
        })
      }
    }

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const username = document.getElementById("username").value
      const password = document.getElementById("password").value

      // Simple validation
      if (!username || !password) {
        alert("Please enter both username and password")
        return
      }

      // Send login request to server
      fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Set logged in status
            localStorage.setItem("zeusBank_isLoggedIn", "true")
            localStorage.setItem("zeusBank_currentUser", JSON.stringify(data.user))

            // Redirect based on role
            if (data.user.role === "admin") {
              window.location.href = "admin.html"
            } else {
              window.location.href = "dashboard.html"
            }
          } else {
            alert(data.message || "Invalid username or password")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred during login. Please try again.")
        })
    })
  }

  // Register Form Handling
  const registerForm = document.getElementById("registerForm")
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const fullName = document.getElementById("fullName").value
      const email = document.getElementById("email").value
      const phone = document.getElementById("phone").value
      const username = document.getElementById("username").value
      const password = document.getElementById("password").value
      const confirmPassword = document.getElementById("confirmPassword").value

      // Simple validation
      if (!fullName || !email || !phone || !username || !password) {
        alert("Please fill in all fields")
        return
      }

      if (password !== confirmPassword) {
        alert("Passwords do not match")
        return
      }

      // Send register request to server
      fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName, email, phone, username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Set logged in status
            localStorage.setItem("zeusBank_isLoggedIn", "true")
            localStorage.setItem("zeusBank_currentUser", JSON.stringify(data.user))

            // Show account number and redirect
            alert("Account created successfully! Your account number is: " + data.user.accountNumber)
            window.location.href = "dashboard.html"
          } else {
            alert(data.message || "Error creating account")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred during registration. Please try again.")
        })
    })
  }

  // Dashboard Page
  if (document.querySelector(".dashboard-page")) {
    // Redirect if not logged in
    if (!isLoggedIn) {
      window.location.href = "login.html"
      return
    }

    // Update user greeting
    const userGreeting = document.getElementById("userGreeting")
    if (userGreeting && currentUser) {
      userGreeting.textContent = currentUser.fullName
    }

    // Update account information
    const accountNumber = document.getElementById("accountNumber")
    const primaryBalance = document.getElementById("primaryBalance")

    if (accountNumber && primaryBalance && currentUser) {
      accountNumber.textContent = currentUser.accountNumber.slice(-4) // Show last 4 digits
      primaryBalance.textContent = formatCurrency(currentUser.balance)
    }

    // Update user avatar if custom profile image exists
    const userAvatar = document.querySelector(".avatar-img")
    if (userAvatar && currentUser && currentUser.profileImage) {
      userAvatar.src = currentUser.profileImage
    }

    // Update date for credit score
    const scoreDate = document.getElementById("scoreDate")
    if (scoreDate) {
      scoreDate.textContent = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
  }

  // Transfer Form Handling
  const transferForm = document.getElementById("transferForm")
  if (transferForm) {
    // Redirect if not logged in
    if (!isLoggedIn) {
      window.location.href = "login.html"
      return
    }

    // Set current date
    const transferDate = document.getElementById("transferDate")
    if (transferDate) {
      transferDate.value = new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    }

    transferForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const fromAccount = currentUser.accountNumber
      const toAccountNumber = document.getElementById("toAccountNumber").value
      const amount = Number.parseFloat(document.getElementById("amount").value)
      const memo = document.getElementById("memo").value

      // Simple validation
      if (!fromAccount || !toAccountNumber || isNaN(amount) || amount <= 0) {
        alert("Please fill in all fields with valid values")
        return
      }

      // Send transfer request to server
      fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAccount,
          toAccount: toAccountNumber,
          amount,
          memo,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Update current user with new balance
            fetch(`/api/user?id=${currentUser.id}`)
              .then((response) => response.json())
              .then((userData) => {
                if (userData.success) {
                  localStorage.setItem("zeusBank_currentUser", JSON.stringify(userData.user))
                }
              })
              .catch((error) => console.error("Error updating user data:", error))

            // Show success or pending message
            if (data.transaction.status === "successful") {
              alert("Transaction completed successfully")
            } else {
              // Show error modal for pending transactions
              const errorModal = document.getElementById("transferErrorModal")
              if (errorModal) {
                errorModal.classList.add("show")

                // Close modal when close button is clicked
                const closeBtn = errorModal.querySelector(".modal-close")
                if (closeBtn) {
                  closeBtn.addEventListener("click", () => {
                    errorModal.classList.remove("show")
                  })
                }
              } else {
                alert("Transaction is pending approval")
              }
            }

            // Reset form
            transferForm.reset()
          } else {
            alert(data.message || "Error processing transfer")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred during transfer. Please try again.")
        })
    })
  }

  // Withdraw Form Handling
  const withdrawForm = document.getElementById("withdrawForm")
  if (withdrawForm) {
    // Redirect if not logged in
    if (!isLoggedIn) {
      window.location.href = "login.html"
      return
    }

    // Populate account dropdown
    const withdrawAccount = document.getElementById("withdrawAccount")
    if (withdrawAccount && currentUser) {
      const option = document.createElement("option")
      option.value = currentUser.accountNumber
      option.textContent = `${currentUser.accountNumber} - ${currentUser.fullName}`
      withdrawAccount.appendChild(option)
    }

    withdrawForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const accountNumber = document.getElementById("withdrawAccount").value
      const amount = Number.parseFloat(document.getElementById("withdrawAmount").value)
      const method = document.getElementById("withdrawMethod").value
      const description = document.getElementById("withdrawDescription").value

      // Simple validation
      if (!accountNumber || isNaN(amount) || amount <= 0) {
        alert("Please fill in all fields with valid values")
        return
      }

      // Send withdrawal request to server
      fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAccount: accountNumber,
          toAccount: "EXTERNAL",
          amount,
          memo: description || `Withdrawal via ${method}`,
          type: "withdrawal",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // Update current user with new balance
            fetch(`/api/user?id=${currentUser.id}`)
              .then((response) => response.json())
              .then((userData) => {
                if (userData.success) {
                  localStorage.setItem("zeusBank_currentUser", JSON.stringify(userData.user))
                }
              })
              .catch((error) => console.error("Error updating user data:", error))

            // Show success or pending message
            if (data.transaction.status === "successful") {
              alert("Withdrawal completed successfully")
            } else {
              // Show error modal for pending transactions
              const errorModal = document.getElementById("withdrawErrorModal")
              if (errorModal) {
                errorModal.classList.add("show")

                // Close modal when close button is clicked
                const closeBtn = errorModal.querySelector(".modal-close")
                if (closeBtn) {
                  closeBtn.addEventListener("click", () => {
                    errorModal.classList.remove("show")
                  })
                }
              } else {
                alert("Withdrawal is pending approval")
              }
            }

            // Reset form
            withdrawForm.reset()
          } else {
            alert(data.message || "Error processing withdrawal")
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("An error occurred during withdrawal. Please try again.")
        })
    })
  }

  // Fund Account Form Handling
  const fundForm = document.getElementById("fundForm")
  if (fundForm) {
    // Redirect if not logged in
    if (!isLoggedIn) {
      window.location.href = "login.html"
      return
    }

    // Populate account dropdown
    const accountToFund = document.getElementById("accountToFund")
    if (accountToFund && currentUser) {
      const option = document.createElement("option")
      option.value = currentUser.accountNumber
      option.textContent = `${currentUser.accountNumber} - ${currentUser.fullName}`
      accountToFund.appendChild(option)
    }

    fundForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const accountNumber = document.getElementById("accountToFund").value
      const amount = Number.parseFloat(document.getElementById("fundAmount").value)
      const description = document.getElementById("fundDescription").value

      // Simple validation
      if (!accountNumber || isNaN(amount) || amount <= 0) {
        alert("Please fill in all fields with valid values")
        return
      }

      // Send fund request to server (this would typically go to a payment processor)
      alert("Funding request submitted. Please wait for approval.")
      fundForm.reset()
    })
  }

  // Initialize modal close buttons
  const modalCloseButtons = document.querySelectorAll(".modal-close")
  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal")
      if (modal) {
        modal.classList.remove("show")
      }
    })
  })

  // Logout functionality
  const logoutLinks = document.querySelectorAll("a[href='#logout']")
  logoutLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("zeusBank_isLoggedIn")
      localStorage.removeItem("zeusBank_currentUser")
      window.location.href = "login.html"
    })
  })
})

// Helper Functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
