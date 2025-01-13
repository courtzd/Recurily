// Utility function to get favicon URL for a domain
export async function getFaviconUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Try Clearbit first
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    const clearbitResponse = await fetch(clearbitUrl, {
      mode: 'cors',
      headers: {
        'Accept': 'image/*'
      }
    });
    if (clearbitResponse.ok) {
      return clearbitUrl;
    }
    
    // Fall back to standard favicon
    const faviconUrl = `https://${domain}/favicon.ico`;
    const faviconResponse = await fetch(faviconUrl, {
      mode: 'no-cors',
      headers: {
        'Accept': 'image/*'
      }
    });
    if (faviconResponse.ok) {
      return faviconUrl;
    }
    
    return null;
  } catch (error) {
    // Silently handle the error and return null
    return null;
  }
}