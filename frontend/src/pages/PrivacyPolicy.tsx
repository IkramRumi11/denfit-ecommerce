import React from 'react';
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
  ScrollText
} from 'lucide-react';

export const PrivacyPolicy = () => {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* HERO */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-800 rounded-full mb-6">
            <Shield className="text-amber-500 mr-2" size={24} />
            <span className="text-gray-300 text-sm tracking-[0.26em] uppercase">Trust & Transparency</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.2em] mb-6 uppercase">
            Your Privacy, <span className="font-bold text-white">Protected.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            At DENFIT, we respect your style and your data. This policy outlines exactly how we collect, use, and guard your personal information.
          </p>
          <div className="mt-8 text-sm text-gray-500 font-mono">
            Last Updated: <span className="text-amber-500">{lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* QUICK HIGHLIGHTS */}
      <section className="py-12 px-4 border-b border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">100% Secure</h3>
                <p className="text-sm text-gray-600">Your payments are processed via encrypted gateways (SSL). We never store your credit card details on our local servers.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <Eye size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">No Data Selling</h3>
                <p className="text-sm text-gray-600">We do not sell, trade, or rent your personal identification information to third parties.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <Check size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">You Are In Control</h3>
                <p className="text-sm text-gray-600">You can unsubscribe from marketing, request data deletion, or update your personal information at any time.</p>
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
            <h2 className="text-3xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              Welcome to DENFIT. Operating from <strong>Defence Raya Golf & Country Club, Phase 6, DHA Lahore, Pakistan</strong>, we are committed to protecting your personal information and your right to privacy. This Privacy Policy strictly governs how we handle the data you provide when you visit our website, use our services, or make a purchase.
            </p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 2. Information We Collect */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">2. Information We Collect</h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg mb-2">A. Personal Information You Disclose</h3>
                <p className="text-gray-600 text-sm mb-3">We collect personal data that you voluntarily provide to us when registering an account, placing an order, or contacting customer service.</p>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
                  <li><strong>Identity Data:</strong> First and last name.</li>
                  <li><strong>Contact Data:</strong> Email address, billing address, delivery address, and phone number.</li>
                  <li><strong>Profile Data:</strong> Account username, password, order history, and manual size/preference management data stored securely to personalize your future visits.</li>
                  <li><strong>Financial Data:</strong> Payment details (securely processed and encrypted by our third-party payment gateways; we do not retain full card numbers).</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg mb-2">B. Information Automatically Collected</h3>
                <p className="text-gray-600 text-sm mb-3">When you navigate our website, we automatically collect certain technical information.</p>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-2">
                  <li><strong>Device &amp; Usage Data:</strong> IP address, browser type, operating system, and device type (mobile or desktop).</li>
                  <li><strong>Interaction Data:</strong> Pages viewed, time spent on pages, and referring website addresses.</li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 3. How We Use Your Information */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
              <li><strong>To Fulfill Orders:</strong> Processing transactions, arranging shipping through our courier partners, and sending order confirmations.</li>
              <li><strong>To Improve UI/UX:</strong> Analyzing site traffic and interaction data to optimize our website's layout and functionality.</li>
              <li><strong>Customer Support:</strong> Responding to your inquiries, handling returns, and resolving disputes.</li>
              <li><strong>Marketing &amp; Promotions:</strong> Sending you newsletters, exclusive offers, and updates (only if you have opted in). You may opt out at any time.</li>
              <li><strong>Fraud Prevention:</strong> Screening transactions to protect against fraudulent, unauthorized, or illegal activity.</li>
            </ul>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 4. How We Share Your Information */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">4. How We Share Your Information</h2>
            <p className="text-gray-600 mb-4">We only share your information with trusted third parties essential to our business operations:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 flex items-center"><Truck size={16} className="mr-2"/> Logistics Partners</h4>
                <p className="text-xs text-gray-500 mt-1">Couriers (e.g., Leopard, TCS, Trax) require your name, phone number, and address to deliver your order.</p>
              </div>
              <div className="border p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 flex items-center"><CreditCard size={16} className="mr-2"/> Payment Processors</h4>
                <p className="text-xs text-gray-500 mt-1">Secure gateways require your billing details to authorize transactions.</p>
              </div>
              <div className="border p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 flex items-center"><Eye size={16} className="mr-2"/> Analytics &amp; Advertising</h4>
                <p className="text-xs text-gray-500 mt-1">We use tools (such as Google Analytics or Meta Pixel) to understand customer behavior and deliver relevant advertising. These tools use anonymized tracking data.</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 5. Cookies & Tracking */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">5. Cookies &amp; Tracking Technologies</h2>
            <p className="text-gray-600 leading-relaxed">We use cookies to enhance your shopping experience, such as keeping items in your cart between visits and remembering your login details. You can instruct your browser to refuse all cookies, but this may limit your ability to use certain features of our website.</p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 6. Data Security */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">We implement robust, industry-standard security measures to protect your personal information. All sensitive data exchanged between your browser and our website happens over an SSL-secured communication channel, encrypted and protected with digital signatures.</p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 7. Data Retention */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, including satisfying any legal, accounting, or tax reporting requirements.</p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 8. Children’s Privacy */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">8. Children’s Privacy</h2>
            <p className="text-gray-600 leading-relaxed">DENFIT does not knowingly collect personal information from children under the age of 13. If we become aware that we have inadvertently received personal data from a visitor under the age of 13, we will delete the information from our records immediately.</p>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 9. Your Privacy Rights */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">9. Your Privacy Rights</h2>
            <p className="text-gray-600 mb-4">Depending on your location, you have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> Request that we delete your personal data ("Right to be Forgotten").</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from our marketing communications at any time by clicking the "unsubscribe" link at the bottom of our emails.</li>
            </ul>
          </div>

          <hr className="border-gray-100 my-8" />

          {/* 10. Contact Us */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4">10. Contact Us</h2>
            <p className="text-gray-600 mb-4">If you have questions about how we handle your data, or if you wish to exercise your privacy rights, please contact our Data Protection Team:</p>

            <div className="bg-gray-900 text-white p-8 rounded-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center mb-4">
                  <Mail className="text-amber-500 mr-3" size={18} />
                  <a href="mailto:denfitcustomerservice@gmail.com" className="hover:text-amber-300 transition-colors">denfitcustomerservice@gmail.com</a>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-amber-500 mr-3 mt-1" size={18} />
                  <div>
                    Defence Raya Golf &amp; Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                <Shield size={300} />
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;