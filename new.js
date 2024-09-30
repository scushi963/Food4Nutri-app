
// Script to open and close the sidebar
function w3_open() {
    document.getElementById("mySidebar").style.display = "block";
    document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
    document.getElementById("mySidebar").style.display = "none";
    document.getElementById("myOverlay").style.display = "none";
}

// Form submission handler (optional)
document.getElementById('shareFoodForm').addEventListener('submit', function(event) {
    event.preventDefault();
    document.getElementById('feedback').innerText = "Thank you for sharing food!";
    document.getElementById('feedback').classList.remove('hidden');
    this.reset(); // Clear the form
});

document.getElementById('nutritionForm').addEventListener('submit', function(event) {
    event.preventDefault();
    document.getElementById('nutritionLog').innerText = "Nutrition logged for " + this.date.value + "!";
    this.reset(); // Clear the form
});

document.addEventListener("DOMContentLoaded", function () {
    // Function to open the sidebar
    window.w3_open = function() {
        document.getElementById("mySidebar").style.display = "block";
        document.getElementById("myOverlay").style.display = "block";
    };

    // Function to close the sidebar
    window.w3_close = function() {
        document.getElementById("mySidebar").style.display = "none";
        document.getElementById("myOverlay").style.display = "none";
    };

    // Food Sharing form submission
    document.getElementById("shareFoodForm").addEventListener("submit", function(event) {
        event.preventDefault();
        const foodItem = document.getElementById("foodItem").value;
        const quantity = document.getElementById("quantity").value;
        const location = document.getElementById("location").value;

        document.getElementById("feedback").innerHTML = `Successfully shared ${quantity} of ${foodItem} at ${location}.`;
        document.getElementById("feedback").classList.remove("hidden");
        this.reset(); // Reset form
    });

    // Nutrition Tracking form submission
    document.getElementById("nutritionForm").addEventListener("submit", function(event) {
        event.preventDefault();
        const date = document.getElementById("date").value;
        const meal = document.getElementById("meal").value;
        const calories = document.getElementById("calories").value;

        const logEntry = document.createElement("p");
        logEntry.textContent = `${date}: ${meal} - ${calories} calories`;
        document.getElementById("nutritionLog").appendChild(logEntry);
        this.reset(); // Reset form
    });
});

function logout() {
    // Clear the user session data (this may vary based on your implementation)
    // Example: Clear stored tokens
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // or however you manage authentication tokens
        }
    })
    .then(response => {
        if (response.ok) {
            // Optionally, remove the token from local storage or handle session clearing
            localStorage.removeItem('token'); // Clear token from local storage
            // Redirect to the login page or homepage
            window.location.href = '#login'; // Redirect to your login page
        } else {
            console.error('Logout failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
