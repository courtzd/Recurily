console.log('🟢 Content script loaded');

let hasDetected = false;  // ✅ Prevent repeated scanning

// ✅ Inject detector code directly into the page context
async function injectDetectorScript() {
  try {
    const scriptUrl = chrome.runtime.getURL('detector.js');
    console.log('📂 Loading detector from:', scriptUrl);

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.type = 'text/javascript';

      // Listen for the custom event
      window.addEventListener('subscriptionDetectorReady', function onReady(event) {
        window.removeEventListener('subscriptionDetectorReady', onReady);
        if (event.detail?.success) {
          console.log('✅ SubscriptionDetector ready event received');
          resolve();
        } else {
          reject(new Error('SubscriptionDetector initialization failed'));
        }
      }, { once: true });

      script.onerror = (error) => {
        console.error('❌ Script load error:', error);
        reject(error);
      };

      // Inject the script
      (document.head || document.documentElement).appendChild(script);

      // Add timeout safety
      setTimeout(() => {
        if (!window.SubscriptionDetector) {
          reject(new Error('SubscriptionDetector initialization timed out'));
        }
      }, 2000);
    });
  } catch (error) {
    console.error('❌ Injection error:', error);
    throw error;
  }
}

// ✅ Initialize detection process
// ✅ Initialize detection process
async function initializeDetection() {
  try {
    await injectDetectorScript();
    
    // More robust verification
    console.log('Verifying SubscriptionDetector...', {
      type: typeof window.SubscriptionDetector,
      available: !!window.SubscriptionDetector
    });

    // Add a small delay and verify again
    await new Promise((resolve) => {
      const checkDetector = () => {
        if (typeof window.SubscriptionDetector === 'function') {
          console.log('✅ SubscriptionDetector verified');
          resolve();
        } else {
          console.log('🔄 Waiting for SubscriptionDetector...');
          setTimeout(checkDetector, 100);
        }
      };
      checkDetector();
    });

    console.log('🔍 Creating detector instance...');
    const detector = new window.SubscriptionDetector(document, window.location.href);
    
    if (!detector) {
      throw new Error('Failed to create detector instance');
    }

    startDetection(detector);
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

// ✅ Start detection and stop after detection
function startDetection(detector) {
  console.log('🔍 Starting detection...');

  if (hasDetected) {
    console.log('⚠️ Detection already completed. Skipping...');
    return;
  }

  try {
    const subscription = detector.detect();
    if (subscription) {
      console.log('✅ Detected subscription:', subscription);
      hasDetected = true;  // ✅ Stop scanning again
      window._lastDetectedSubscription = subscription; // Save for debug
      
      observer.disconnect();  // ✅ Stop observing after detection

      sendDetectionMessage({
        type: 'SUBSCRIPTION_DETECTED',
        data: subscription
      });

      showAutoFillPopup(subscription);  // ✅ Show popup after detection
    } else {
      console.log('❌ No subscription detected');
    }
  } catch (error) {
    console.error('❌ Detection error:', error);
  }
}

// ✅ Notify background script about the detected subscription
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

// ✅ Popup notification for detected subscription
function showAutoFillPopup(subscription) {
  const popup = document.createElement('div');
  popup.innerText = '🔔 Subscription detected: ' + subscription.content + '\nClick to auto-fill.';
  popup.style.position = 'fixed';
  popup.style.bottom = '20px';
  popup.style.right = '20px';
  popup.style.padding = '15px 25px';
  popup.style.backgroundColor = '#4CAF50';
  popup.style.color = 'white';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  popup.style.cursor = 'pointer';
  popup.style.zIndex = '9999';

  popup.onclick = () => {
    autoFillSubscriptionForm(subscription);
    popup.remove();
    alert('✅ Subscription details auto-filled!');
  };

  document.body.appendChild(popup);

  // Auto-hide after 10 seconds
  setTimeout(() => popup.remove(), 10000);
}

// ✅ Auto-fill subscription form fields
function autoFillSubscriptionForm(subscription) {
  console.log('📝 Auto-filling subscription form...');
  
  const nameField = document.querySelector('input[name="subscription_name"]');
  const urlField = document.querySelector('input[name="subscription_url"]');

  if (nameField) {
    nameField.value = subscription.content;
    console.log('✅ Filled subscription name');
  }

  if (urlField) {
    urlField.value = subscription.url;
    console.log('✅ Filled subscription URL');
  }

  if (!nameField && !urlField) {
    console.warn('⚠️ No matching form fields found to auto-fill.');
  }
}

// ✅ MutationObserver to detect dynamic content
const observer = new MutationObserver(debounce(() => {
  console.log('🔄 Page content changed, hasDetected:', hasDetected);
  if (hasDetected) {
    console.log('⏹️ Stopping observer due to previous detection');
    observer.disconnect();
    return;
  }
  
  if (window.SubscriptionDetector && !hasDetected) {
    console.log('🔍 Creating new detector instance after DOM change');
    const detector = new window.SubscriptionDetector(document, window.location.href);
    startDetection(detector);
  }
}, 2000));

// Store observer for debug access
window._subscriptionObserver = observer;

window.addEventListener('load', () => {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
});

// ✅ Debounce helper to reduce scanning frequency
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ✅ Initialize detection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDetection);
} else {
  initializeDetection();
}