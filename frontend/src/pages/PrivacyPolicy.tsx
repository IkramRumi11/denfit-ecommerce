import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  Check,
  FileText,
  Cookie,
  Server,
  Mail,
  MapPin,
  Truck,
  CreditCard,
  ScrollText,
  ChevronDown,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export const PrivacyPolicy = () => {
  const lastUpdated = "September 2026";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const privacyFaqs = [
    {
      q: "Does DENFIT store my credit/debit card numbers or bank credentials?",
      a: "No. DENFIT never stores your credit card number, debit card PIN, CVV/CVC, or net-banking passwords on our local servers. All digital transactions are securely routed through PCI-DSS Level 1 certified payment gateways that use end-to-end 256-bit SSL/TLS encryption."
    },
    {
      q: "Who receives my delivery address and telephone number?",
      a: "Your delivery address, recipient name, and contact telephone number are strictly shared with our authorized logistics courier partners (e.g., TCS, Leopards Courier, Trax) solely for the purpose of dispatching, delivering, and confirming your parcel. They are legally prohibited from utilizing your information for promotional marketing."
    },
    {
      q: "Will I receive spam SMS or unsolicited telephone calls?",
      a: "Never. We only send SMS or place calls to verify Cash on Delivery (COD) order authenticity, provide real-time parcel dispatch tracking updates, or address urgent customer service queries. Promotional emails are only sent if you explicitly opt-in to our VIP newsletter, and you can unsubscribe at any time with a single click."
    },
    {
      q: "How can I request a copy of my data or request account deletion?",
      a: "You have the right to request a complete export of your personal information or request permanent deletion of your account and customer history under our Right to be Forgotten policy. Simply send an email from your registered address to denfitcustomerservice@gmail.com with the subject line 'Data Deletion Request'."
    },
    {
      q: "How do cookies enhance my shopping experience on DENFIT?",
      a: "Cookies allow our web store to remember items stored in your shopping bag, preserve your active login session, remember your regional currency preferences, and load pages faster on subsequent visits. You can disable non-essential cookies via your browser settings at any time without restricting core checkout functionality."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* HERO */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-800 rounded-full mb-6">
            <Shield className="text-amber-500 mr-2" size={24} />
            <span className="text-gray-300 text-sm tracking-[0.26em] uppercase">Trust &amp; Transparency</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.2em] mb-6 uppercase">
            Your Privacy, <span className="font-bold text-white">Protected.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            At DENFIT, protecting your personal data is as fundamental to us as the quality of our craftsmanship. This policy explains clearly and ethically how your information is safeguarded.
          </p>
          <div className="mt-8 text-sm text-gray-400 font-mono">
            Last Updated: <span className="text-amber-500">{lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* QUICK HIGHLIGHTS */}
      <section className="py-12 px-4 border-b border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">100% Secure Processing</h3>
                <p className="text-sm text-gray-600">All data transmissions are encrypted with enterprise-grade SSL certificates. We never store credit or debit card numbers on our servers.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <Eye size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Zero Data Brokerage</h3>
                <p className="text-sm text-gray-600">We do not sell, rent, monetize, or disclose your personal details to third-party marketing brokers under any circumstances.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <Check size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Customer Autonomy</h3>
                <p className="text-sm text-gray-600">You maintain complete authority over your information: request copies, update profile details, or delete your account at any time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">

          {/* 1. Introduction */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">1.</span> Introduction &amp; Corporate Identity
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Welcome to <strong>DENFIT</strong> (referred to herein as "we", "us", or "our"). Registered and operating from <strong>Defence Raya Golf &amp; Country Club, Phase 6, DHA Lahore, Pakistan</strong>, DENFIT is committed to maintaining the trust of our visitors, customers, and community.
            </p>
            <p className="text-gray-600 leading-relaxed">
              This Privacy Policy explains the nature of personal information gathered when you navigate our website, register an account, interact with our customer care representatives, or place an order for delivery across Pakistan.
            </p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 2. Information We Collect */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">2.</span> Categories of Data Collected
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg mb-2 text-gray-900">A. Personal Data You Provide to Us</h3>
                <p className="text-gray-600 text-sm mb-3">
                  When you create an account, purchase products, or reach out to our support channels, we collect information necessary to fulfill your order safely:
                </p>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1.5 ml-2">
                  <li><strong>Identity &amp; Profile Data:</strong> Full legal name, preferred username, hashed password, and gender preference.</li>
                  <li><strong>Contact Details:</strong> Verified email address, direct telephone number, primary delivery address, city, and province.</li>
                  <li><strong>Transaction Records:</strong> Specific garments purchased, sizes chosen, billing invoices, promo codes applied, and order status histories.</li>
                  <li><strong>Support Communications:</strong> Inquiries, feedback, size exchange notes, and correspondence submitted via email or contact forms.</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg mb-2 text-gray-900">B. Technical &amp; Device Information Collected Automatically</h3>
                <p className="text-gray-600 text-sm mb-3">
                  When you browse our storefront, our systems automatically log essential diagnostic and browsing metrics to optimize performance:
                </p>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1.5 ml-2">
                  <li><strong>Device Metrics:</strong> Internet Protocol (IP) address, browser version, operating system, device screen resolution, and time zone.</li>
                  <li><strong>Navigation Patterns:</strong> Pages visited, product detail impressions, session duration, and referral URLs.</li>
                  <li><strong>Cart Continuity:</strong> Temporary session cookies that preserve items added to your cart between browser page reloads.</li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 3. How We Use Your Information */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">3.</span> Purposes for Processing Your Data
            </h2>
            <p className="text-gray-600 mb-4">
              We process your personal information strictly for legitimate commercial and operational purposes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2.5 ml-2">
              <li><strong>Order Fulfillment &amp; Dispatch:</strong> Verifying order details, arranging courier parcel pickup, generating shipping airway bills, and issuing digital VAT/tax receipts.</li>
              <li><strong>Cash on Delivery (COD) Confirmation:</strong> Contacting buyers via SMS or brief phone calls when required to prevent fraudulent or fictitious bookings.</li>
              <li><strong>Exchange &amp; Customer Support:</strong> Processing requests under our 14-day exchange policy, handling size alterations, and resolving courier inquiries.</li>
              <li><strong>Security &amp; Fraud Prevention:</strong> Protecting our site against automated bot scraping, unauthorized account intrusions, and fraudulent checkout activity.</li>
              <li><strong>Opt-In Marketing:</strong> Keeping subscribed members informed about upcoming seasonal collection releases and limited-edition promotions (opt out anytime).</li>
            </ul>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 4. Third-Party Disclosures */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">4.</span> Authorized Third-Party Disclosures
            </h2>
            <p className="text-gray-600 mb-4">
              We never sell or rent customer data. We only disclose minimal necessary information to vetted operational partners bound by strict confidentiality:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm">
                <h4 className="font-bold text-gray-900 flex items-center mb-2">
                  <Truck size={18} className="mr-2 text-amber-600"/> Courier Logistics
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Nationwide couriers (Leopards, TCS, Trax) receive recipient name, delivery address, and phone number to coordinate parcel drop-off and cash collection.
                </p>
              </div>
              <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm">
                <h4 className="font-bold text-gray-900 flex items-center mb-2">
                  <CreditCard size={18} className="mr-2 text-amber-600"/> Payment Gateways
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Authorized digital banking gateways process card payments over secure tokenized API connections. DENFIT never stores your CVV or PIN credentials.
                </p>
              </div>
              <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm">
                <h4 className="font-bold text-gray-900 flex items-center mb-2">
                  <Server size={18} className="mr-2 text-amber-600"/> Cloud Infrastructure
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Encrypted cloud servers protect website uptime, user authentication tokens, and order database integrity in compliance with global security protocols.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 5. Cookies & Tracking */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">5.</span> Cookies &amp; Browser Tracking
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              Cookies are miniature text files stored by your browser. We utilize essential cookies to retain cart contents, remember your authentication session, and analyze aggregated site traffic patterns.
            </p>
            <p className="text-gray-600 leading-relaxed">
              You can configure your browser preferences to alert you when cookies are placed or reject them entirely. Please note that disabling essential cookies may impact checkout functionality.
            </p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 6. Data Security & Storage */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">6.</span> Security Safeguards &amp; Retention
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We employ administrative, technical, and physical safeguards designed to protect personal data from accidental loss, misuse, or unauthorized modification. All user credentials and passwords are encrypted using modern one-way cryptographic hashing (bcrypt).
            </p>
            <p className="text-gray-600 leading-relaxed">
              We retain transaction records only for the period necessary to comply with legal, taxation, and statutory audit obligations under Pakistani law, after which data is securely anonymized or permanently purged.
            </p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 7. Your Legal Rights */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center text-gray-900">
              <span className="text-amber-600 mr-3">7.</span> Your Individual Rights
            </h2>
            <p className="text-gray-600 mb-4">As a DENFIT customer, you maintain clear and actionable privacy rights:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <strong className="text-gray-900 block mb-1">Right of Access:</strong>
                Request a digital summary of all personal information linked to your profile.
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <strong className="text-gray-900 block mb-1">Right of Rectification:</strong>
                Update or rectify inaccurate shipping addresses, contact numbers, or names.
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <strong className="text-gray-900 block mb-1">Right to Erasure:</strong>
                Request complete account deletion and anonymization of customer records.
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <strong className="text-gray-900 block mb-1">Right to Opt Out:</strong>
                Unsubscribe from all future promotional communications with a single click.
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 8. Interactive Privacy FAQs */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
                Common Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Privacy &amp; Data Security FAQs
              </h2>
            </div>

            <div className="space-y-4">
              {privacyFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div 
                    key={index}
                    className="border border-neutral-200 rounded-xl overflow-hidden transition-colors bg-white shadow-sm"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between bg-neutral-50/60 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 py-4 bg-white border-t border-neutral-100 text-sm text-gray-600 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 9. Contact Section */}
          <div className="bg-gray-900 text-white p-8 sm:p-10 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-3">Privacy &amp; Data Protection Officer</h2>
              <p className="text-gray-300 mb-6 max-w-xl text-sm leading-relaxed">
                If you have questions about our privacy practices, wish to file a data inquiry, or want to exercise your legal rights, please contact our data compliance team:
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="text-amber-500 mr-3 shrink-0" size={18} />
                  <a href="mailto:denfitcustomerservice@gmail.com" className="hover:text-amber-300 transition-colors font-medium">
                    denfitcustomerservice@gmail.com
                  </a>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-amber-500 mr-3 mt-1 shrink-0" size={18} />
                  <div>
                    DENFIT Data Protection Office<br />
                    Defence Raya Golf &amp; Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <Shield size={300} />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;