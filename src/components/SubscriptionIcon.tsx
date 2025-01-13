import React from 'react';
import { CreditCard } from 'lucide-react';
import { getFaviconUrl } from '../lib/utils';

interface SubscriptionIconProps {
  url: string | null;
  className?: string;
}

export function SubscriptionIcon({ url, className = "h-5 w-5" }: SubscriptionIconProps) {
  const [iconUrl, setIconUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    async function loadIcon() {
      if (!url) return;
      setError(false);
      try {
        const favicon = await getFaviconUrl(url);
        if (favicon) {
          setIconUrl(favicon);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      }
    }
    loadIcon();

    // Cleanup function to reset state when url changes
    return () => {
      setIconUrl(null);
      setError(false);
    };
  }, [url]);

  if (error || !iconUrl) {
    return <CreditCard className={className} />;
  }

  return (
    <img
      src={iconUrl}
      alt="Service icon"
      className={`${className} object-contain`}
      onError={() => setError(true)}
    />
  );
}