document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem("zeusBank_isLoggedIn")
  const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))

  if (!isLoggedIn || !currentUser) {
    window.location.href = "login.html"
    return
  }

  // Update time in status bar
  const timeElement = document.querySelector(".time")
  if (timeElement) {
    const now = new Date()
    timeElement.textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  // Load transactions
  const transactionsList = document.getElementById("transactionsList")
  if (transactionsList) {
    // Fetch transactions from server
    fetch(`/api/transactions?userId=${currentUser.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          loadTransactions(transactionsList, data.transactions)
        } else {
          transactionsList.innerHTML = '<div class="no-transactions">Error loading transactions</div>'
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        transactionsList.innerHTML = '<div class="no-transactions">Error loading transactions</div>'
      })
  }
})

function loadTransactions(container, transactions) {
  // Clear container
  container.innerHTML = ""

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<div class="no-transactions">No transactions found</div>'
    return
  }

  // Sort transactions by date (newest first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Group transactions by date
  const groupedTransactions = groupTransactionsByDate(transactions)

  // Render transactions
  for (const [date, dateTransactions] of Object.entries(groupedTransactions)) {
    // Create date header
    const dateHeader = document.createElement("div")
    dateHeader.className = "transaction-date"
    dateHeader.textContent = formatDate(date)
    container.appendChild(dateHeader)

    // Render transactions for this date
    dateTransactions.forEach((transaction) => {
      const transactionItem = document.createElement("div")
      transactionItem.className = "transaction-item"

      const transactionDetails = document.createElement("div")
      transactionDetails.className = "transaction-details"

      // Account numbers
      const accountElement = document.createElement("div")
      accountElement.className = "transaction-account"

      if (transaction.type === "deposit") {
        accountElement.textContent = `Deposit to ${transaction.toAccount}`
      } else if (transaction.type === "withdrawal") {
        accountElement.textContent = `Withdrawal from ${transaction.fromAccount}`
      } else {
        accountElement.textContent = `Transfer: ${transaction.fromAccount} → ${transaction.toAccount}`
      }

      transactionDetails.appendChild(accountElement)

      // Amount
      const amountElement = document.createElement("div")
      amountElement.className = "transaction-amount"

      // Format amount based on transaction type
      if (transaction.type === "deposit") {
        amountElement.textContent = `+$${transaction.amount.toFixed(2)}`
        amountElement.style.color = "#4CAF50" // Green for deposits
      } else {
        amountElement.textContent = `-$${transaction.amount.toFixed(2)}`
        amountElement.style.color = "#F44336" // Red for withdrawals/transfers
      }

      transactionDetails.appendChild(amountElement)

      transactionItem.appendChild(transactionDetails)

      // Transaction status
      const statusElement = document.createElement("div")
      statusElement.className = `transaction-status ${transaction.status}`

      let transactionTypeText = "Transfer"
      if (transaction.type === "deposit") {
        transactionTypeText = "Deposit"
      } else if (transaction.type === "withdrawal") {
        transactionTypeText = "Withdrawal"
      }

      statusElement.textContent = `${transactionTypeText} - (${transaction.status})`
      transactionItem.appendChild(statusElement)

      // Transaction memo if available
      if (transaction.memo) {
        const memoElement = document.createElement("div")
        memoElement.className = "transaction-memo"
        memoElement.textContent = transaction.memo
        memoElement.style.fontSize = "12px"
        memoElement.style.color = "#666"
        memoElement.style.marginTop = "5px"
        transactionItem.appendChild(memoElement)
      }

      container.appendChild(transactionItem)
    })
  }
}

function groupTransactionsByDate(transactions) {
  const grouped = {}

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date).toLocaleDateString("en-US")

    if (!grouped[date]) {
      grouped[date] = []
    }

    grouped[date].push(transaction)
  })

  return grouped
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
