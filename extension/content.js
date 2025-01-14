console.log('🟢 Content script loaded');

let hasDetected = false;  // Prevent repeated scanning
let popupShown = false;   // Track if popup is currently shown

// Start detection process
function startDetection() {
    console.log('🔍 Starting detection...');

    if (hasDetected || popupShown) {
        console.log('⚠️ Detection already completed or popup shown. Skipping...');
        return;
    }

    try {
        const detector = new window.SubscriptionDetector(document, window.location.href);
        const subscription = detector.detect();
        
        if (subscription) {
            console.log('✅ Detected subscription:', subscription);
            hasDetected = true;
            
            // Check authentication before showing popup
            chrome.storage.local.get(['sb-access-token'], function(result) {
                if (result['sb-access-token']) {
                    sendDetectionMessage({
                        type: 'SUBSCRIPTION_DETECTED',
                        data: subscription
                    });
                    showAutoFillPopup(subscription);
                } else {
                    showLoginPrompt();
                }
            });
        } else {
            console.log('❌ No subscription detected');
        }
    } catch (error) {
        console.error('❌ Detection error:', error);
    }
}

// Notify background script about detected subscription
function sendDetectionMessage(message) {
    console.log('📨 Sending detection message:', message);

    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Error sending message:', chrome.runtime.lastError);
        } else {
            console.log('✅ Message sent successfully:', response);
        }
    });

    chrome.storage.local.set({ detectedSubscription: message.data }, () => {
        if (chrome.runtime.lastError) {
            console.error('❌ Error storing subscription:', chrome.runtime.lastError);
        } else {
            console.log('✅ Subscription stored in local storage');
        }
    });
}

// Show notification popup
function showAutoFillPopup(subscription) {
    if (popupShown) return;
    popupShown = true;

    // Create form container
    const formContainer = document.createElement('div');
    formContainer.id = 'recurily-popup';
    formContainer.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background-color: white;
            color: #333;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            width: 400px;
            max-width: 90vw;
        ">
            <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600;">
                Save Subscription to Recurily
            </h3>
            
            <form id="subscription-form" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">
                        Service Name
                    </label>
                    <input 
                        type="text" 
                        id="service-name" 
                        value="${subscription.platform || ''}"
                        style="
                            width: 100%;
                            padding: 8px 12px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                        "
                    >
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">
                        Price
                    </label>
                    <input 
                        type="number" 
                        id="price" 
                        step="0.01"
                        placeholder="Enter price"
                        style="
                            width: 100%;
                            padding: 8px 12px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                        "
                    >
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">
                        Billing Cycle
                    </label>
                    <select 
                        id="billing-cycle"
                        style="
                            width: 100%;
                            padding: 8px 12px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                            background-color: white;
                        "
                    >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="quarterly">Quarterly</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 14px;">
                        Category
                    </label>
                    <select 
                        id="category"
                        style="
                            width: 100%;
                            padding: 8px 12px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                            background-color: white;
                        "
                    >
                        <option value="streaming">Streaming</option>
                        <option value="music">Music</option>
                        <option value="productivity">Productivity</option>
                        <option value="gaming">Gaming</option>
                        <option value="cloud">Cloud Storage</option>
                        <option value="software">Software</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button 
                        type="button"
                        id="cancel-button"
                        style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid #ddd;
                            background: white;
                            color: #666;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        "
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        style="
                            flex: 1;
                            padding: 8px;
                            border: none;
                            background: #4f46e5;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        "
                    >
                        Save Subscription
                    </button>
                </div>
            </form>
        </div>
    `;

    // Handle form submission
    const form = formContainer.querySelector('#subscription-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        
        popupShown = false;
        formContainer.remove();

        const formData = {
            service_name: form.querySelector('#service-name').value,
            price: parseFloat(form.querySelector('#price').value),
            billing_cycle: form.querySelector('#billing-cycle').value,
            category: form.querySelector('#category').value,
            url: subscription.url,
            content: subscription.content
        };

        chrome.runtime.sendMessage({
            type: 'SUBSCRIPTION_SAVED',
            data: formData
        }, (response) => {
            if (response?.status === 'success') {
                formContainer.remove();
                showSuccessMessage();
            }
        });
    };

    // Handle cancel button
    const cancelButton = formContainer.querySelector('#cancel-button');
    cancelButton.onclick = () => {
        popupShown = false;
        formContainer.remove();
    };

    document.body.appendChild(formContainer);
}

// Show login prompt
function showLoginPrompt() {
    const prompt = document.createElement('div');
    prompt.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: #4f46e5;
            color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            cursor: pointer;
        ">
            Sign in to Recurily to save this subscription
        </div>
    `;
    
    prompt.onclick = () => {
        chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' });
        prompt.remove();
    };
    
    document.body.appendChild(prompt);
    setTimeout(() => prompt.remove(), 5000);
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 25px;
            background-color: #4CAF50;
            color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
        ">
            ✅ Subscription saved successfully!
        </div>
    `;
    
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
}

// Initialize detection when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDetection);
} else {
    startDetection();
}

// Watch for dynamic content changes
const observer = new MutationObserver(debounce(() => {
    if (!hasDetected && !popupShown) {
        startDetection();
    }
}, 1000));

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
});

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}