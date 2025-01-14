console.log("🟢 Subscription Detector Loading");

// Immediately expose to window object
(function() {
  class SubscriptionDetector {
    constructor(document, url) {
      console.log("🔨 Creating SubscriptionDetector instance for:", url);
      this.document = document;
      this.url = url;
      this.hasScanned = false;
      this.lastResult = null;
    }

    detect() {
      if (this.hasScanned) {
        console.log("Already scanned this page");
        return this.lastResult;
      }

      console.log("🔍 Scanning for subscription elements...");

      // Define detection patterns
      const subscriptionKeywords = [
        "subscribe", "membership", "pricing", "plan", "billing",
        "free trial", "subscription", "payment", "sign up", "join now",
        "monthly", "yearly", "annual"
      ];

      const pricePatterns = [
        /\$\d+(\.\d{2})?\s*(per\s*month|monthly|mo)/i,
        /\$\d+(\.\d{2})?\s*(per\s*year|annually|yr)/i,
        /€\d+(\.\d{2})?/i,
        /£\d+(\.\d{2})?/i,
        /US\$\d+(\.\d{2})?/i
      ];

      // Site-specific selectors
      const siteSelectors = {
        common: [
          '.pricing', '.subscription', '.plan-details', '.membership',
          '[class*="pricing"]', '[class*="subscription"]', '[class*="plan"]',
          '[class*="membership"]', '[data-testid*="pricing"]'
        ].join(','),
        forms: [
          'form[action*="subscribe"]',
          'form[action*="payment"]',
          'form[action*="billing"]'
        ].join(',')
      };

      try {
        // Check for site-specific elements first
        const subscriptionElements = this.document.querySelectorAll(siteSelectors.common);
        const subscriptionForms = this.document.querySelectorAll(siteSelectors.forms);

        if (subscriptionElements.length > 0 || subscriptionForms.length > 0) {
          const result = {
            type: "subscription_element",
            content: subscriptionElements.length > 0 ? 
                    subscriptionElements[0].textContent.trim() : 
                    "Subscription form detected",
            url: this.url,
            elements: Array.from(subscriptionElements).map(el => ({
              text: el.textContent.trim(),
              type: el.tagName.toLowerCase()
            }))
          };
          this.lastResult = result;
          this.hasScanned = true;
          return result;
        }

        // Check for subscription keywords
        for (const keyword of subscriptionKeywords) {
          const elements = this.document.querySelectorAll('a, button, div, span, p, h1, h2, h3, h4, h5, h6');
          for (const element of elements) {
            if (element.textContent && element.textContent.toLowerCase().includes(keyword)) {
              console.log(`🔍 Found subscription keyword: "${keyword}" in element:`, element);
              const result = {
                type: "keyword_match",
                content: element.textContent.trim(),
                url: this.url,
                keyword: keyword
              };
              this.lastResult = result;
              this.hasScanned = true;
              return result;
            }
          }
        }

        // Check for pricing patterns
        const bodyText = this.document.body.innerText;
        for (const pattern of pricePatterns) {
          const matches = bodyText.match(pattern);
          if (matches) {
            console.log(`💰 Found price pattern: "${matches[0]}"`);
            const result = {
              type: "price",
              content: matches[0],
              url: this.url
            };
            this.lastResult = result;
            this.hasScanned = true;
            return result;
          }
        }

      } catch (error) {
        console.error('❌ Error during detection:', error);
      }

      console.log('❌ No subscription elements detected');
      this.hasScanned = true;
      return null;
    }
  }

  // Expose to window object
  window.SubscriptionDetector = SubscriptionDetector;
  console.log("✅ SubscriptionDetector attached to window:", typeof window.SubscriptionDetector);
})();