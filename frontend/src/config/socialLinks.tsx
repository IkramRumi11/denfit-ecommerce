// src/config/socialLinks.tsx
import React from 'react';
import { Facebook, Instagram, Youtube } from 'lucide-react';

// Official X (formerly Twitter) brand logo
export const XSocialIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    style={{ display: 'block' }}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Official Snapchat ghost icon (inherits currentColor with clean vector silhouette)
export const SnapchatIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    style={{ display: 'block' }}
  >
    <path d="M12.016 2c-3.15 0-5.467 2.23-5.467 5.166 0 .895.23 1.947.615 2.82.164.37.037.6-.29.742-.647.28-1.427.697-1.787 1.487-.27.59-.092 1.25.437 1.62.77.54 1.7.355 2.378.134.338-.11.603.048.47.41-.448 1.22-1.636 2.65-3.372 2.94-.383.064-.6.287-.6.612 0 .428.384.733.916.852 1.343.3 2.768.17 3.993-.377.34-.152.628-.01.765.31.42 1 .98 1.776 2.938 1.776 1.94 0 2.508-.767 2.938-1.775.137-.32.425-.462.765-.31 1.225.547 2.65.677 3.993.377.532-.12.916-.424.916-.852 0-.325-.217-.548-.6-.612-1.736-.29-2.924-1.72-3.372-2.94-.133-.362.132-.52.47-.41.678.22 1.608.406 2.378-.134.53-.37.707-1.03.437-1.62-.36-.79-1.14-1.207-1.787-1.487-.327-.142-.454-.372-.29-.742.385-.873.615-1.925.615-2.82C17.483 4.23 15.166 2 12.016 2z" />
  </svg>
);

// Official Pinterest brand icon
export const PinterestIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    style={{ display: 'block' }}
  >
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.333 1.369-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  </svg>
);

export interface SocialLinkItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  ariaLabel: string;
  contactHoverClass?: string;
}

// Required order: Facebook → Instagram → YouTube → X → Snapchat → Pinterest
export const DENFIT_SOCIAL_LINKS: SocialLinkItem[] = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/17RhiUapmV/",
    icon: ({ size = 20, className = "" }) => <Facebook size={size} className={className} />,
    ariaLabel: "Visit our Facebook page",
    contactHoverClass: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/denfitdesigns?igsh=NnM3MWVza3JudTNn",
    icon: ({ size = 20, className = "" }) => <Instagram size={size} className={className} />,
    ariaLabel: "Visit our Instagram profile",
    contactHoverClass: "hover:bg-pink-600 hover:text-white hover:border-pink-600",
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@denfitcollection?si=23IsLRk3h7Rzmcrl",
    icon: ({ size = 20, className = "" }) => <Youtube size={size} className={className} />,
    ariaLabel: "Visit our YouTube channel",
    contactHoverClass: "hover:bg-red-600 hover:text-white hover:border-red-600",
  },
  {
    name: "X",
    href: "https://x.com/denfitdesigns",
    icon: ({ size = 18, className = "" }) => <XSocialIcon size={size} className={className} />,
    ariaLabel: "Visit our X profile",
    contactHoverClass: "hover:bg-black hover:text-white hover:border-black",
  },
  {
    name: "Snapchat",
    href: "https://www.snapchat.com/add/denfitdesigns?share_id=1bW2smAtGGw&locale=en-US",
    icon: ({ size = 20, className = "" }) => <SnapchatIcon size={size} className={className} />,
    ariaLabel: "Visit our Snapchat",
    contactHoverClass: "hover:bg-yellow-400 hover:text-black hover:border-yellow-400",
  },
  {
    name: "Pinterest",
    href: "https://www.pinterest.com/denfit_/",
    icon: ({ size = 20, className = "" }) => <PinterestIcon size={size} className={className} />,
    ariaLabel: "Visit our Pinterest",
    contactHoverClass: "hover:bg-[#E60023] hover:text-white hover:border-[#E60023]",
  },
];
