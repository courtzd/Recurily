document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const loginContainer = document.getElementById('loginContainer');
  const subscriptionContainer = document.getElementById('subscriptionContainer');
  const errorMessage = document.getElementById('errorMessage');
  const signInButton = document.getElementById('signInButton');
  const signupLink = document.getElementById('signupLink');
  const detectedSubscriptionDiv = document.getElementById('detectedSubscription');
  const subscriptionDetails = document.getElementById('subscriptionDetails');
  const connectGmailButton = document.getElementById('connectGmail');
  const trialCheckbox = document.getElementById('is_trial');

  let saveButton = null;
  let saveButtonListener = null;

  // ✅ Listen for detected subscription data
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SUBSCRIPTION_DETECTED') {
      console.log('🔔 Received detected subscription:', message.data);
      showDetectedSubscription(message.data);  // ✅ Display in the form
    }
  });

  // ✅ Handle Gmail connection
  connectGmailButton.addEventListener('click', async () => {
    try {
      connectGmailButton.disabled = true;
      connectGmailButton.textContent = 'Connecting...';

      chrome.identity.getAuthToken({ interactive: true }, async function (token) {
        if (chrome.runtime.lastError) {
          throw chrome.runtime.lastError;
        }

        console.log('✅ Gmail connected');
        await chrome.storage.local.set({ gmailToken: token });
        chrome.runtime.sendMessage({ type: 'SCAN_GMAIL' });
        connectGmailButton.textContent = 'Gmail Connected';
        connectGmailButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        connectGmailButton.classList.add('bg-green-600', 'hover:bg-green-700');
      });
    } catch (error) {
      console.error('❌ Gmail connection error:', error);
      connectGmailButton.textContent = 'Connect Gmail';
      connectGmailButton.disabled = false;
      errorMessage.textContent = 'Failed to connect Gmail: ' + error.message;
    }
  });

  // ✅ Auto-update Gmail connection status
  chrome.storage.local.get('gmailToken', ({ gmailToken }) => {
    if (gmailToken) {
      connectGmailButton.textContent = 'Gmail Connected';
      connectGmailButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
      connectGmailButton.classList.add('bg-green-600', 'hover:bg-green-700');
    }
  });

  // ✅ Show trial details if checkbox is checked
  if (trialCheckbox) {
    trialCheckbox.addEventListener('change', function () {
      const trialDetails = document.getElementById('trial_details');
      if (trialDetails) {
        trialDetails.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // ✅ Auto-login if session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showSubscriptionContainer();
    }
  } catch (error) {
    console.error('❌ Session error:', error);
    errorMessage.textContent = 'Failed to check authentication status';
  }

  // ✅ Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      signInButton.disabled = true;
      signInButton.textContent = 'Signing in...';
      errorMessage.textContent = '';

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.session) {
        await chrome.storage.local.set({
          'sb-access-token': data.session.access_token,
          'sb-refresh-token': data.session.refresh_token,
          userId: data.session.user.id
        });
        showSubscriptionContainer();
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      errorMessage.textContent = error.message || 'Failed to sign in';
    } finally {
      signInButton.disabled = false;
      signInButton.textContent = 'Sign In';
    }
  });

  // ✅ Redirect to signup page
  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://subscription-guardian.netlify.app/signup' });
  });

  // ✅ Show subscription form after login
  function showSubscriptionContainer() {
    loginContainer.style.display = 'none';
    subscriptionContainer.style.display = 'block';
    checkForDetectedSubscription();  // ✅ Check if data exists
  }

  // ✅ Load detected subscription from storage
  async function checkForDetectedSubscription() {
    try {
      const { detectedSubscription } = await chrome.storage.local.get('detectedSubscription');
      if (detectedSubscription) {
        showDetectedSubscription(detectedSubscription);
      }
    } catch (error) {
      console.error('❌ Error loading subscription:', error);
    }
  }

  // ✅ Populate form with detected subscription
  function showDetectedSubscription(data) {
    console.log('📝 Auto-filling form with detected data:', data);

    document.getElementById('serviceName').value = data.content || '';
    document.getElementById('price').value = data.price || '';
    document.getElementById('billingCycle').value = data.billing_cycle || 'monthly';
    document.getElementById('category').value = data.category || 'other';
    document.getElementById('nextBillingDate').value = data.next_billing_date || '';

    detectedSubscriptionDiv.style.display = 'block';
    subscriptionDetails.textContent = `Detected Subscription: ${data.content}`;
  }
});
