import { useEffect, useState } from 'react';
import { contentAPI } from '../api';

export type PageBanner = {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  buttonText?: string;
  isActive?: boolean;
};

export function usePageBanner(placement: string) {
  const [banner, setBanner] = useState<PageBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const res = await contentAPI.getPublicContent();
        const banners = (res as any)?.data?.banners || (res as any)?.banners;
        if (banners && isMounted) {
          const targeted = banners[placement];
          if (targeted && targeted.isActive && targeted.imageUrl) {
            setBanner(targeted);
          } else {
            setBanner(null);
          }
        }
      } catch (e) {
        // Fallback silently to null
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [placement]);

  return { banner, loading };
}
