console.log('🟢 Background script initialized');

// ✅ Initialize Supabase client
const SUPABASE_URL = 'https://psssrpuoifnppswzcdoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3NycHVvaWZucHBzd3pjZG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NjkyNDYsImV4cCI6MjA1MjE0NTI0Nn0.uzTHNU6gPYXJERRzLQf64cN4LiohG6GIKzT1TYChfOU';

// ✅ Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message);

  if (message.type === 'SUBSCRIPTION_DETECTED') {
    handleSubscriptionDetected(message.data, sender.tab?.id, sendResponse);
    return true;
  }

  if (message.type === 'SUBSCRIPTION_SAVED') {
    handleSubscriptionSaved(sender.tab?.id, sendResponse);
    return true;
  }

  if (message.type === 'SCAN_GMAIL') {
    handleGmailScan(sendResponse);
    return true;
  }

  // ✅ Listen for script injection request
  if (message.type === 'INJECT_SUBSCRIPTION_DETECTOR') {
    injectSubscriptionDetector(sender.tab.id);
    return true;
  }
});

// ✅ Inject subscriptionDetector.js into the page using Chrome's scripting API
function injectSubscriptionDetector(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    files: ['extension/lib/subscriptionDetector.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to inject subscriptionDetector.js:', chrome.runtime.lastError);
    } else {
      console.log('✅ subscriptionDetector.js injected successfully');
    }
  });
}

// ✅ Handle Gmail scanning
async function handleGmailScan(sendResponse) {
  try {
    const { gmailToken } = await chrome.storage.local.get('gmailToken');
    if (!gmailToken) {
      throw new Error('Gmail not connected');
    }

    const scanner = new EmailScanner(gmailToken);
    const subscriptions = await scanner.scanEmails();

    console.log('📧 Found subscriptions:', subscriptions);

    // Store detected subscriptions
    await chrome.storage.local.set({
      emailSubscriptions: subscriptions
    });

    // Update badge
    if (subscriptions.length > 0) {
      await chrome.action.setBadgeText({
        text: subscriptions.length.toString()
      });

      await chrome.action.setBadgeBackgroundColor({
        color: '#4f46e5'
      });
    }

    sendResponse({
      status: 'success',
      message: `Found ${subscriptions.length} subscriptions`
    });
  } catch (error) {
    console.error('❌ Error scanning Gmail:', error);
    sendResponse({
      status: 'error',
      message: error.message
    });
  }
}

// ✅ Handle subscription detection
async function handleSubscriptionDetected(data, tabId, sendResponse) {
  console.log('🔍 Subscription detected:', data);

  try {
    // Store the detected subscription
    await chrome.storage.local.set({ detectedSubscription: data });

    // Update extension icon
    if (tabId) {
      await chrome.action.setBadgeText({
        text: '!',
        tabId: tabId
      });

      await chrome.action.setBadgeBackgroundColor({
        color: '#4f46e5',
        tabId: tabId
      });
    }

    sendResponse({ status: 'success', message: 'Subscription processed' });
  } catch (error) {
    console.error('❌ Error handling subscription:', error);
    sendResponse({ status: 'error', message: error.message });
  }
}

// ✅ Handle successful subscription save
async function handleSubscriptionSaved(tabId, sendResponse) {
  try {
    // Clear badge
    if (tabId) {
      await chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }

    // Clear stored subscription
    await chrome.storage.local.remove('detectedSubscription');

    sendResponse({ status: 'success', message: 'Subscription saved' });
  } catch (error) {
    console.error('❌ Error handling saved subscription:', error);
    sendResponse({ status: 'error', message: error.message });
  }
}
