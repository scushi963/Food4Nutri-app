// Script to open and close the sidebar
function w3_open() {
    document.getElementById("mySidebar").style.display = "block";
    document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
    document.getElementById("mySidebar").style.display = "none";
    document.getElementById("myOverlay").style.display = "none";
}

function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('#content > section');
    sections.forEach(section => {
        section.classList.add('hidden'); // Use class to hide
    });

    // Show the clicked section
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden'); // Use class to show
    }
}

// Optional: Show the home section by default when the page loads
document.addEventListener("DOMContentLoaded", () => {
    showSection('home');
});

// Ensure to set event listeners after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const footerLinks = document.querySelectorAll('.footer-column a.nav-link');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default anchor behavior
            const targetId = link.getAttribute('href').substring(1); // Get section id
            showSection(targetId); // Show the corresponding section
        });
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const shareFoodForm = document.getElementById("shareFoodForm");
    const nutritionForm = document.getElementById("nutritionForm");
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const logNutritionForm = document.getElementById('logNutritionForm');
    const mealPlanForm = document.getElementById('mealPlanForm');
    
    // Function to show feedback messages
    const showFeedback = (message, isSuccess = true) => {
        const feedbackDiv = document.getElementById('feedback'); // Get the feedback element here
        if (feedbackDiv) {
            feedbackDiv.textContent = message;
            feedbackDiv.className = isSuccess ? 'success' : 'error'; 
            feedbackDiv.classList.remove('hidden'); // Make sure to show it
        } else {
            console.error('Feedback element not found in the DOM.');
        }
    };
    
    

    // Function to check if the user is authenticated
    const checkUserAuth = async () => {
        try {
            const response = await fetch('/api/auth/check-token', {
                method: 'GET',
                credentials: 'include',
            });

            const data = await response.json();
            if (response.ok && data.isAuthenticated) {
                return true;
            } else {
                showFeedback("You must be logged in to access this feature.", false);
                window.location.href = '/login.html';
                return false;
            }
        } catch (error) {
            console.error('Error checking user authentication:', error);
            showFeedback("Authentication error. Please log in.", false);
            window.location.href = '/login.html';
            return false;
        }
    };

    const withAuthCheck = (callback) => {
        return async (e) => {
            if (await checkUserAuth()) {
                callback(e);
            }
        };
    };
    
    // Use the higher-order function for form submissions
    shareFoodForm?.addEventListener("submit", withAuthCheck(shareFood));
    nutritionForm?.addEventListener("submit", withAuthCheck(logNutrition));
    mealPlanForm?.addEventListener("submit", withAuthCheck(mealPlan));
    

    // Generic form handling function for POST requests (with authentication check)
    const handleFormSubmit = async (form, url, data) => {
        if (await checkUserAuth()) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();
                if (response.ok) {
                    showFeedback(result.message || "Operation successful!");
                    return result; // Return result for confirmation message
                } else {
                    showFeedback("Error: " + result.message, false);
                }
            } catch (error) {
                console.error("Error:", error);
                showFeedback("An error occurred while processing your request.", false);
            }
        }
    };

    

    // Validate registration input
    const validateRegistrationInput = (username, email, password) => {
        if (!username || !email || !password) {
            showFeedback("All fields are required.", false);
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            showFeedback("Please enter a valid email address.", false);
            return false;
        }
        return true;
    };

    // User registration
    const registerUser = async (e) => {
        e.preventDefault(); // Prevent default form submission
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!validateRegistrationInput(username, email, password)) return; // Validate inputs

        const data = { username, email, password };
        const result = await handleFormSubmit(registerForm, '/api/auth/register', data); // Ensure registerForm is defined

        if (result) {
            showFeedback(`Registration successful! Welcome, ${username}. Please log in to continue.`);
            loginForm.style.display = 'block'; // Show login form
            registerForm.style.display = 'none'; // Hide registration form
        }
    };

    // User login
    const loginUser = async (e) => {
        e.preventDefault(); // Prevent default form submission
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        const data = { username, password };
        const result = await handleFormSubmit(loginForm, '/api/auth/login', data); 

        if (result) {
            showFeedback('Login successful! Redirecting to the homepage...');
            setTimeout(() => {
                window.location.href = '/index.html'; // Redirect after 2 seconds
            }, 2000);
        }
    };

    // Food sharing form submission
    const shareFood = async (e) => {
        e.preventDefault();
        if (await checkUserAuth()) {
            const foodItem = shareFoodForm.foodItem.value;
            const quantity = shareFoodForm.quantity.value;
            const location = shareFoodForm.location.value;

            const data = { foodItem, quantity, location };
            const result = await handleFormSubmit(shareFoodForm, '/api/food/share', data);
            if (result) {
                showFeedback(`Thank you for sharing ${quantity} of ${foodItem} from ${location}!`);
                shareFoodForm.reset();
            }
        }
    };

    // Nutrition Tracking form submission
    const logNutrition = async (e) => {
        e.preventDefault();
        if (await checkUserAuth()) {
            const date = document.getElementById('nutrition-date').value;
            const meal = document.getElementById('meal').value;
            const calories = document.getElementById('calories').value;

            const data = { date, meal, calories };
            const result = await handleFormSubmit(logNutritionForm, '/api/nutrition/log', data);
            if (result) {
                showFeedback(`Nutrition logged: ${meal} on ${date} with ${calories} calories.`);
            }
        }
    };

    // Meal planning form submission
    const mealPlan = async (event) => {
        event.preventDefault();
        if (await checkUserAuth()) {
            const mealDate = mealPlanForm.mealDate.value;
            const mealType = mealPlanForm.mealType.value;
            const mealPlan = mealPlanForm.mealPlan.value;

            const planEntry = document.createElement('p');
            planEntry.textContent = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} - ${mealPlan} on ${mealDate}`;
            document.getElementById('mealPlanList').appendChild(planEntry);
            mealPlanForm.reset();
            showFeedback(`Meal plan added: ${mealType} - ${mealPlan} on ${mealDate}`);
        }
    };

    // Attach event listeners
    shareFoodForm?.addEventListener("submit", shareFood);
    nutritionForm?.addEventListener("submit", logNutrition);
    mealPlanForm?.addEventListener("submit", mealPlan);
    registerForm?.addEventListener('submit', registerUser);
    loginForm?.addEventListener('submit', loginUser);


    
    // Logout function
    window.logout = function() {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Make sure to provide the correct token here
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Replace with appropriate method to get token
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = 'login.html'; // Redirect to the login page
            } else {
                return response.json().then(data => {
                    console.error('Logout failed:', data.message);
                });
            }
        })
        .catch(error => {
            console.error('Error during logout:', error);
        });
    };

    // Handle section visibility for footer links
    const sections = document.querySelectorAll('section.hidden');
    const hideAllSections = () => {
        sections.forEach(section => {
            section.classList.add('hidden');
        });
    };

    const showSection = (sectionId) => {
        hideAllSections();
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.classList.remove('hidden');
        }
    };

    const footerLinks = document.querySelectorAll('.footer-column a.nav-link');
    footerLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default anchor behavior
            const targetId = link.getAttribute('href').substring(1); // Get section id
            showSection(targetId); // Show the corresponding section
        });
    });
});
