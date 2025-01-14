console.log("🟢 Subscription Detector Loading");

// Add debug logging for context
console.log('Current window context:', {
    hasWindow: !!window,
    hasDocument: !!document,
    location: window.location.href
});

// Explicitly attach to window without IIFE
window.SubscriptionDetector = class {
    constructor(document, url) {
        console.log("🔨 Creating SubscriptionDetector instance");
        this.document = document;
        this.url = url;
        this.hasScanned = false;
        this.lastResult = null;
    }

    detect() {
        if (this.hasScanned) {
            return this.lastResult;
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
                '[data-uia*="subscription"]'
            ];
            
            for (const selector of netflixSelectors) {
                const element = this.document.querySelector(selector);
                if (element) {
                    console.log(`Found Netflix element: ${selector}`);
                    this.lastResult = {
                        type: "subscription",
                        platform: "Netflix",
                        content: element.textContent.trim(),
                        url: this.url
                    };
                    this.hasScanned = true;
                    return this.lastResult;
                }
            }
        }

        const subscriptionKeywords = [
            "subscribe", "membership", "pricing", "plan", "billing",
            "free trial", "subscription", "payment", "sign up", "join now",
            "monthly", "yearly", "annual"
        ];

        try {
            const elements = this.document.querySelectorAll('a, button, div, span, p, h1, h2, h3, h4, h5, h6');
            
            for (const element of elements) {
                if (!element.textContent) continue;
                
                const text = element.textContent.toLowerCase();
                const matchedKeyword = subscriptionKeywords.find(keyword => text.includes(keyword));
                
                if (matchedKeyword) {
                    console.log(`Found subscription keyword: "${matchedKeyword}"`);
                    this.lastResult = {
                        type: "subscription",
                        content: element.textContent.trim(),
                        keyword: matchedKeyword,
                        url: this.url
                    };
                    this.hasScanned = true;
                    return this.lastResult;
                }
            }

        } catch (error) {
            console.error('Error during detection:', error);
        }

        this.hasScanned = true;
        return null;
    }
};

// Verify initialization and dispatch event
if (typeof window.SubscriptionDetector === 'function') {
    console.log("✅ SubscriptionDetector successfully attached to window");
    window.dispatchEvent(new CustomEvent('subscriptionDetectorReady', {
        detail: { success: true }
    }));
} else {
    console.error("❌ Failed to attach SubscriptionDetector");
    window.dispatchEvent(new CustomEvent('subscriptionDetectorReady', {
        detail: { success: false }
    }));
}