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

  // Populate profile form with user data
  populateProfileForm(currentUser)

  // Handle avatar upload
  const profileAvatar = document.querySelector(".profile-avatar")
  const avatarUpload = document.getElementById("avatarUpload")
  const changeAvatarBtn = document.getElementById("changeAvatarBtn")

  if (profileAvatar && avatarUpload) {
    profileAvatar.addEventListener("click", () => {
      avatarUpload.click()
    })

    changeAvatarBtn.addEventListener("click", () => {
      avatarUpload.click()
    })

    avatarUpload.addEventListener("change", handleAvatarUpload)
  }

  // Handle profile form submission
  const profileForm = document.getElementById("profileForm")
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate)
  }

  // Handle logout
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("zeusBank_isLoggedIn")
      localStorage.removeItem("zeusBank_currentUser")
      window.location.href = "login.html"
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
})

function populateProfileForm(user) {
  // Set account information
  document.getElementById("profileAccountNumber").textContent = user.accountNumber || "N/A"
  document.getElementById("profileAccountStatus").textContent = capitalizeFirstLetter(user.status) || "N/A"

  // Format date for member since
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"
  document.getElementById("profileMemberSince").textContent = memberSince

  // Set form fields
  document.getElementById("profileFullName").value = user.fullName || ""
  document.getElementById("profileEmail").value = user.email || ""
  document.getElementById("profilePhone").value = user.phone || ""
  document.getElementById("profileUsername").value = user.username || ""

  // Set profile image if available
  const profileImage = document.getElementById("profileImage")
  if (profileImage && user.profileImage) {
    profileImage.src = user.profileImage
  }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // Check file type
  if (!file.type.match("image.*")) {
    alert("Please select an image file")
    return
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size should be less than 5MB")
    return
  }

  // Create a FormData object
  const formData = new FormData()
  formData.append("avatar", file)
  formData.append("userId", JSON.parse(localStorage.getItem("zeusBank_currentUser")).id)

  // In a real app, you would send this to the server
  // For now, we'll just update the UI and simulate a successful upload
  const reader = new FileReader()
  reader.onload = (e) => {
    // Update avatar preview
    document.getElementById("profileImage").src = e.target.result

    // Update user data in localStorage
    const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))
    currentUser.profileImage = e.target.result
    localStorage.setItem("zeusBank_currentUser", JSON.stringify(currentUser))

    // Show success message
    alert("Profile picture updated successfully!")
  }
  reader.readAsDataURL(file)
}

function handleProfileUpdate(event) {
  event.preventDefault()

  const fullName = document.getElementById("profileFullName").value
  const email = document.getElementById("profileEmail").value
  const phone = document.getElementById("profilePhone").value
  const username = document.getElementById("profileUsername").value
  const currentPassword = document.getElementById("currentPassword").value
  const newPassword = document.getElementById("newPassword").value
  const confirmNewPassword = document.getElementById("confirmNewPassword").value

  // Basic validation
  if (!fullName || !email || !phone || !username) {
    alert("Please fill in all required fields")
    return
  }

  // Validate password change if attempted
  if (currentPassword || newPassword || confirmNewPassword) {
    const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))

    if (!currentPassword) {
      alert("Please enter your current password")
      return
    }

    if (currentPassword !== currentUser.password) {
      alert("Current password is incorrect")
      return
    }

    if (!newPassword) {
      alert("Please enter a new password")
      return
    }

    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match")
      return
    }
  }

  // In a real app, you would send this to the server
  // For now, we'll just update the user data in localStorage
  const currentUser = JSON.parse(localStorage.getItem("zeusBank_currentUser"))

  // Update user data
  currentUser.fullName = fullName
  currentUser.email = email
  currentUser.phone = phone
  currentUser.username = username

  // Update password if changed
  if (currentPassword && newPassword) {
    currentUser.password = newPassword
  }

  // Save updated user data
  localStorage.setItem("zeusBank_currentUser", JSON.stringify(currentUser))

  // Show success modal
  const successModal = document.getElementById("successModal")
  if (successModal) {
    successModal.classList.add("show")
  } else {
    alert("Profile updated successfully!")
  }

  // Clear password fields
  document.getElementById("currentPassword").value = ""
  document.getElementById("newPassword").value = ""
  document.getElementById("confirmNewPassword").value = ""
}

function capitalizeFirstLetter(string) {
  if (!string) return ""
  return string.charAt(0).toUpperCase() + string.slice(1)
}
