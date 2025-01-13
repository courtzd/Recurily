console.log('Content script loaded');

// ✅ Dynamically load SubscriptionDetector and expose it globally
function loadScript(url, callback) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(url);
  script.onload = () => {
    console.log(`Loaded script: ${url}`);
    if (callback) callback();
  };
  script.onerror = () => console.error(`Failed to load script: ${url}`);
  document.head.appendChild(script);
}

// ✅ Load the detector and ensure it's globally available
loadScript('lib/subscriptionDetector.js', () => {
  if (typeof window.SubscriptionDetector !== 'undefined') {
    console.log('SubscriptionDetector loaded');
    const detector = new window.SubscriptionDetector(document, window.location.href);
    startDetection(detector);
  } else {
    console.error('SubscriptionDetector is still undefined after loading');
  }
});

// ✅ Start detection with error handling
function startDetection(detector) {
  console.log('Starting detection...');
  try {
    const subscription = detector.detect();
    if (subscription) {
      console.log('Detected subscription:', subscription);
      sendDetectionMessage({
        type: 'SUBSCRIPTION_DETECTED',
        data: subscription
      });
    } else {
      console.log('No subscription detected');
    }
  } catch (error) {
    console.error('Detection error:', error);
  }
}

// ✅ Notification to popup
function sendDetectionMessage(message) {
  console.log('Sending detection message:', message);

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
    } else {
      console.log('Message sent successfully:', response);
    }
  });

  chrome.storage.local.set({ detectedSubscription: message.data }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error storing subscription:', chrome.runtime.lastError);
    } else {
      console.log('Subscription stored in local storage');
    }
  });
}

// ✅ Observer for dynamic content
const observer = new MutationObserver(debounce(() => {
  console.log('Page content changed, re-scanning...');
  startDetection();
}, 1000));

window.addEventListener('load', () => {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// ✅ Debounce helper
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
