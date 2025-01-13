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

  // Handle Gmail connection
  connectGmailButton.addEventListener('click', async () => {
    try {
      connectGmailButton.disabled = true;
      connectGmailButton.textContent = 'Connecting...';

      chrome.identity.getAuthToken({ interactive: true }, async function(token) {
        if (chrome.runtime.lastError) {
          throw chrome.runtime.lastError;
        }

        console.log('Gmail connected successfully');
        await chrome.storage.local.set({ gmailToken: token });
        
        // Start email scanning
        chrome.runtime.sendMessage({ type: 'SCAN_GMAIL' });
        
        connectGmailButton.textContent = 'Gmail Connected';
        connectGmailButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        connectGmailButton.classList.add('bg-green-600', 'hover:bg-green-700');
      });
    } catch (error) {
      console.error('Gmail connection error:', error);
      connectGmailButton.textContent = 'Connect Gmail';
      connectGmailButton.disabled = false;
      errorMessage.textContent = 'Failed to connect Gmail: ' + error.message;
    }
  });

  // Check Gmail connection status
  chrome.storage.local.get('gmailToken', ({ gmailToken }) => {
    if (gmailToken) {
      connectGmailButton.textContent = 'Gmail Connected';
      connectGmailButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
      connectGmailButton.classList.add('bg-green-600', 'hover:bg-green-700');
    }
  });
  // Handle trial checkbox change
  if (trialCheckbox) {
    trialCheckbox.addEventListener('change', function() {
      const trialDetails = document.getElementById('trial_details');
      if (trialDetails) {
        trialDetails.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // Check if user is already logged in
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showSubscriptionContainer();
    }
  } catch (error) {
    console.error('Session error:', error);
    errorMessage.textContent = 'Failed to check authentication status';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      signInButton.disabled = true;
      signInButton.textContent = 'Signing in...';
      errorMessage.textContent = '';
      
      console.log('Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Sign in response:', { data, error });
      if (error) throw error;

      if (data?.session) {
        console.log('Setting storage tokens...');
        await chrome.storage.local.set({ 
          'sb-access-token': data.session.access_token,
          'sb-refresh-token': data.session.refresh_token,
          userId: data.session.user.id
        });
        console.log('Showing subscription container...');
        showSubscriptionContainer();
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      errorMessage.textContent = error.message || 'Failed to sign in';
    } finally {
      signInButton.disabled = false;
      signInButton.textContent = 'Sign In';
    }
  });

  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://subscription-guardian.netlify.app/signup' });
  });

  function showSubscriptionContainer() {
    loginContainer.style.display = 'none';
    subscriptionContainer.style.display = 'block';
    checkForDetectedSubscription();
  }

  async function checkForDetectedSubscription() {
    try {
      const { detectedSubscription } = await chrome.storage.local.get('detectedSubscription');
      if (detectedSubscription) {
        showDetectedSubscription(detectedSubscription);
      }
    } catch (error) {
      console.error('Error checking for detected subscription:', error);
    }
  }

  function showDetectedSubscription(subscription) {
    detectedSubscriptionDiv.style.display = 'block';
    
    // Create subscription form
    const formHtml = `
      <div class="subscription-edit-form">
        <div class="form-group">
          <label for="serviceName">Service Name</label>
          <input type="text" id="serviceName" class="edit-input" value="${subscription.service || ''}" required>
        </div>
        <div class="form-group">
          <label for="price">Price</label>
          <input type="number" id="price" class="edit-input" value="${subscription.price?.replace(/[^0-9.]/g, '') || ''}" step="0.01" min="0" required>
        </div>
        <div class="form-group">
          <label for="billingCycle">Billing Cycle</label>
          <select id="billingCycle" class="edit-input" required>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div class="form-group">
          <label for="category">Category</label>
          <select id="category" class="edit-input" required>
            <option value="streaming">Streaming</option>
            <option value="music">Music</option>
            <option value="productivity">Productivity</option>
            <option value="gaming">Gaming</option>
            <option value="cloud">Cloud Storage</option>
            <option value="software">Software</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="nextBillingDate">Next Billing Date</label>
          <input type="date" id="nextBillingDate" class="edit-input" required>
        </div>
      </div>
    `;

    subscriptionDetails.innerHTML = formHtml;

    // Set default values
    if (subscription.trial) {
      const trialHtml = `
        <div class="trial-info">
          <span class="trial-badge">Free Trial</span>
          <p class="trial-details">
            ${subscription.trial.isDuration 
              ? `${subscription.trial.duration} days trial period` 
              : `Trial ends on ${new Date(subscription.trial.endDate).toLocaleDateString()}`}
          </p>
        </div>
      `;
      subscriptionDetails.insertAdjacentHTML('afterbegin', trialHtml);
    }

    // Set the next billing date
    const nextBillingInput = document.getElementById('nextBillingDate');
    if (subscription.next_billing_date) {
      nextBillingInput.value = subscription.next_billing_date.split('T')[0];
    } else if (subscription.trial?.endDate) {
      nextBillingInput.value = new Date(subscription.trial.endDate).toISOString().split('T')[0];
    } else {
      // Default to one month from now
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      nextBillingInput.value = defaultDate.toISOString().split('T')[0];
    }

    // Add save button if not already added
    if (!saveButton) {
      saveButton = document.getElementById('saveSubscription');
      
      if (saveButtonListener) {
        saveButton.removeEventListener('click', saveButtonListener);
      }

      saveButtonListener = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Please sign in to save subscriptions');
          }

          saveButton.disabled = true;
          saveButton.textContent = 'Saving...';

          // Get form data safely
          const subscriptionData = {
            service_name: document.getElementById('serviceName').value,
            price: parseFloat(document.getElementById('price').value),
            category: document.getElementById('category').value,
            billing_cycle: document.getElementById('billingCycle').value,
            next_billing_date: document.getElementById('nextBillingDate').value,
            is_trial: subscription.trial ? true : false,
            trial_duration: subscription.trial?.duration || null,
            trial_start_date: subscription.trial ? new Date().toISOString() : null,
            trial_end_date: subscription.trial?.endDate || null,
            status: 'active',
            url: subscription.url,
            user_id: session.user.id
          };

          console.log('Saving subscription data:', subscriptionData);

          const { error } = await supabase
            .from('subscriptions')
            .insert([subscriptionData]);

          if (error) throw error;

          // Clear storage and badge
          await chrome.storage.local.remove('detectedSubscription');
          await chrome.action.setBadgeText({ text: '' });

          // Notify background script
          chrome.runtime.sendMessage({
            type: 'SUBSCRIPTION_SAVED',
            data: subscriptionData
          });

          // Close popup after short delay
          setTimeout(() => window.close(), 1000);
        } catch (error) {
          console.error('Error saving subscription:', error);
          errorMessage.textContent = error.message || 'Failed to save subscription';
          saveButton.disabled = false;
          saveButton.textContent = 'Save Subscription';
        }
      };

      saveButton.addEventListener('click', saveButtonListener);
    }
  }
});