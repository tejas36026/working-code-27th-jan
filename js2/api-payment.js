// api-payment.js
const urlParams = new URLSearchParams(window.location.search);

// Update the payment success handler
if (urlParams.get('payment_status') === 'success') {
    // Get the plan from localStorage (saved before redirect)
    const planType = localStorage.getItem('selectedPlan');
    
    // Add credits/tokens based on plan and check the payment link used
    let creditAmount = 10; // Default fallback
    const paymentSource = urlParams.get('payment_source') || '';
    
    if (paymentSource.includes('pdX51NlsWQG0xc14FX9AM')) {
        // This was the $29 plan (200 API calls)
        creditAmount = 200;
    } else {
        // This was the $299 plan (100 million tokens)
        creditAmount = 100000000; // 100 million tokens
    }
    
    // Get current credits and add new ones
    const currentCredits = parseInt(localStorage.getItem('credits') || '0');
    const newCredits = currentCredits + creditAmount;
    
    // Update credits/tokens
    localStorage.setItem('credits', newCredits);
    
    // Update UI display based on plan
    if (planType === 'pro') {
        document.getElementById('creditCount').textContent = `${newCredits.toLocaleString()} tokens`;
    } else {
        document.getElementById('creditCount').textContent = `${newCredits} credits`;
    }
    
    // Show success message
    if (planType === 'pro') {
        alert('Payment successful! 100 million tokens added to your account.');
    } else {
        alert('Payment successful! 200 credits added to your account.');
    }
    
    // Clear the payment status from URL to prevent duplicate credits
    window.history.replaceState({}, document.title, window.location.pathname);
}

if (urlParams.get('payment_status') === 'failed') {
    alert('Payment failed. Please try again or contact support.');
    // Clear the payment status from URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// API Key Modal event listeners
const apiKeyModal = document.getElementById('apiKeyModal');
const closeModalBtn = document.getElementById('closeModal');

closeModalBtn.addEventListener('click', function() {
    apiKeyModal.style.display = 'none';
});


function deductTokensOnGenerate() {
    // Get the magicBtn (generate button)
    const magicBtn = document.getElementById('magicBtn');
    const jsDeepseekBtn = document.getElementById('jsDeepseekBtn');
    
    // Add event listener for the generate button
    [magicBtn, jsDeepseekBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                // Get current token/credit count
                const currentCredits = parseInt(localStorage.getItem('credits') || '0');
                
                // Check if user has tokens/credits
                if (currentCredits <= 0) {
                    alert('You have no credits remaining. Please purchase a plan to continue using the API.');
                    creditsModal.style.display = 'flex'; // Show payment modal
                    return;
                }
                
                // Determine amount to deduct based on plan
                const userPlan = localStorage.getItem('selectedPlan') || 'basic';
                let deductAmount = 1; // Default for basic plan (1 credit per call)
                
                if (userPlan === 'pro') {
                    // For pro plan, deduct 1000 tokens
                    deductAmount = 1000;
                }
                
                // Update credits
                const newCredits = currentCredits - deductAmount;
                localStorage.setItem('credits', newCredits);
                deductTokensOnGenerate();

                // Update UI
                const creditCountElement = document.getElementById('creditCount');
                if (creditCountElement) {
                    if (userPlan === 'pro') {
                        // For pro plan, show tokens remaining
                        creditCountElement.textContent = `${newCredits.toLocaleString()} tokens`;
                    } else {
                        // For basic plan, show credits
                        creditCountElement.textContent = `${newCredits} credits`;
                    }
                }
                
                // Proceed with API call...
                // Your existing code to call the API goes here
            });
        }
    });
}


// Credits Modal event listeners
const buyCreditsBtn = document.getElementById('buyCreditsBtn');
const creditsModal = document.getElementById('creditsModal');
const closeCreditsModalBtn = document.getElementById('closeCreditsModal');
const cancelCreditsBtn = document.getElementById('cancelCredits');
const purchaseCreditsBtn = document.getElementById('purchaseCredits');
const paymentPlans = document.querySelectorAll('.payment-plan');

buyCreditsBtn.addEventListener('click', function() {
    creditsModal.style.display = 'flex';
});

closeCreditsModalBtn.addEventListener('click', function() {
    creditsModal.style.display = 'none';
});

cancelCreditsBtn.addEventListener('click', function() {
    creditsModal.style.display = 'none';
});

purchaseCreditsBtn.addEventListener('click', function() {
    const selectedPlan = document.querySelector('.payment-plan.selected');
    if (selectedPlan) {
        const planType = selectedPlan.getAttribute('data-plan');
        // Save selected plan to localStorage before redirect
        localStorage.setItem('selectedPlan', planType);
        
        // Choose payment link based on plan
        let paymentUrl;
        if (planType === 'basic') {
            // $29 monthly plan
            paymentUrl = 'https://checkout.dodopayments.com/buy/pdt_pdX51NlsWQG0xc14FX9AM?quantity=1';
        } else {
            // $299 monthly plan
            paymentUrl = 'https://checkout.dodopayments.com/buy/pdt_QIW8J9Jozxx65k9awTQOe?quantity=1';
        }
        
        // Redirect to appropriate Dodo Payments checkout
        window.location.href = paymentUrl;
    } else {
        alert('Please select a plan');
    }
});

// Add event listeners to payment plans for selection
paymentPlans.forEach(plan => {
    plan.addEventListener('click', function() {
        paymentPlans.forEach(p => p.classList.remove('selected'));
        this.classList.add('selected');
    });
});