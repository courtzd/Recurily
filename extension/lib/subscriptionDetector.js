console.log("🟢 Subscription Detector Loading");

class SubscriptionDetector {
    constructor(document, url) {
        console.log("🔨 Creating SubscriptionDetector instance for:", url);
        this.document = document;
        this.url = url;
        this.hasScanned = false;
    }

    detect() {
        if (this.hasScanned) {
            return null;
        }

        console.log("🔍 Scanning for subscription elements...");

        // Netflix-specific detection
        if (this.url.includes('netflix.com')) {
            console.log("🎬 Detecting Netflix subscription...");
            const netflixSelectors = [
                '.account-section',
                '.profile-hub',
                '.membership-section',
                '[data-uia*="plan"]',
                '[data-uia*="subscription"]',
                '.plan-label',
                '.plan-price'
            ];
            
            for (const selector of netflixSelectors) {
                const element = this.document.querySelector(selector);
                if (element) {
                    console.log(`Found Netflix element: ${selector}`, element);
                    element.style.border = "2px solid red";
                    element.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
                    
                    this.hasScanned = true;
                    return {
                        type: "subscription",
                        platform: "Netflix",
                        content: element.textContent.trim(),
                        url: this.url
                    };
                }
            }
        }

        // General subscription detection
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
            /USD\s*\d+(\.\d{2})?/i
        ];

        try {
            // Check for subscription keywords
            const elements = this.document.querySelectorAll('a, button, div, span, p, h1, h2, h3, h4, h5, h6');
            
            for (const element of elements) {
                if (!element.textContent) continue;
                
                const text = element.textContent.toLowerCase();
                const matchedKeyword = subscriptionKeywords.find(keyword => text.includes(keyword));
                
                if (matchedKeyword) {
                    console.log(`Found subscription keyword: "${matchedKeyword}" in:`, element);
                    element.style.border = "2px solid red";
                    element.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
                    
                    this.hasScanned = true;
                    return {
                        type: "subscription",
                        content: element.textContent.trim(),
                        keyword: matchedKeyword,
                        url: this.url
                    };
                }
            }

            // Check for price patterns
            const bodyText = this.document.body.innerText;
            for (const pattern of pricePatterns) {
                const matches = bodyText.match(pattern);
                if (matches) {
                    console.log(`Found price pattern: "${matches[0]}"`);
                    this.hasScanned = true;
                    return {
                        type: "price",
                        content: matches[0],
                        url: this.url
                    };
                }
            }

        } catch (error) {
            console.error('Error during detection:', error);
        }

        this.hasScanned = true;
        return null;
    }
}

// Expose to window object
window.SubscriptionDetector = SubscriptionDetector;
console.log("✅ SubscriptionDetector attached to window:", typeof window.SubscriptionDetector);