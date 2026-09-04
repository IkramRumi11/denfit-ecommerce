import React, { useState } from 'react';
import { 
  ScrollText, 
  Scale, 
  MonitorSmartphone, 
  CreditCard, 
  AlertOctagon, 
  Gavel, 
  Mail, 
  MapPin, 
  CheckCircle, 
  FileWarning, 
  UserX,
  ChevronDown,
  ShieldAlert,
  Truck,
  HelpCircle
} from 'lucide-react';

export const TermsOfService = () => {
  const lastUpdated = "September 2026";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const termsFaqs = [
    {
      q: "Can I cancel or alter my order after checkout?",
      a: "Yes, you can request order cancellation or address adjustments at any point before your parcel is processed and dispatched by our fulfillment center. Once an airway bill is generated and the package is handed over to the courier, the order cannot be halted, and our standard 14-day Exchange Policy applies upon receipt."
    },
    {
      q: "What happens if a product is listed with an incorrect price or description?",
      a: "While we strive for meticulous catalog accuracy, occasional typographic or system errors may occur. In the event an item is mistakenly displayed at an incorrect price, DENFIT reserves the right to decline or cancel orders placed at the erroneous price. If your card was already charged, a full refund will be processed immediately."
    },
    {
      q: "Can promotional discount codes be combined or applied to sale items?",
      a: "Promotional voucher codes are limited to one per transaction and cannot be combined or stacked with other offers unless explicitly stated. Promotional codes generally apply exclusively to regular-priced merchandise and exclude already-discounted clearance or flash sale items."
    },
    {
      q: "What are the rules regarding Cash on Delivery (COD) orders?",
      a: "For Cash on Delivery orders, customers are required to provide a valid, accessible Pakistani mobile phone number. DENFIT reserves the right to place a verbal confirmation call before dispatch. Parcels will only be handed over by the courier upon complete cash payment; couriers are not authorized to allow opening or inspecting the package prior to payment collection."
    },
    {
      q: "What delivery timeline should I expect for my order?",
      a: "Standard delivery across Pakistan is 5–7 business days (7–9 business days during peak promotional campaigns). Please note that deliveries may occasionally be affected by adverse weather conditions, natural occurrences, local regulatory restrictions, courier hub constraints, or unforeseen circumstances beyond our reasonable control."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      {/* 1. HERO SECTION */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-800 rounded-full mb-6">
            <ScrollText className="text-amber-500 mr-2" size={24} />
            <span className="text-gray-300 text-sm tracking-[0.26em] uppercase">Legal Agreement</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.2em] mb-6 uppercase">
            Terms of <span className="font-bold text-white">Service.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Please review these Terms of Service carefully. By visiting our store or placing an order, you agree to be bound by these transparent and ethical commercial terms.
          </p>
          <div className="mt-8 text-sm text-gray-400 font-mono">
            Last Updated: <span className="text-amber-500">{lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* 2. KEY HIGHLIGHTS */}
      <section className="py-12 px-4 border-b border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <Scale size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Fair &amp; Ethical Trading</h3>
                <p className="text-sm text-gray-600">Clear guidelines governing order fulfillment, accurate pricing, and consumer protections across Pakistan.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Authentic Quality</h3>
                <p className="text-sm text-gray-600">All garments are inspected for fabric integrity, sizing precision, and double-stitched durability before dispatch.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <Gavel size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Pakistani Jurisdiction</h3>
                <p className="text-sm text-gray-600">Operated strictly under the statutory laws of the Islamic Republic of Pakistan, with dispute resolution in Lahore.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* 1. Overview */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <ScrollText className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">1. Overview &amp; Acceptance</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              This website is operated by <strong>DENFIT</strong>. Throughout the site, the terms "we", "us", and "our" refer to DENFIT. We provide this online storefront, including all product listings, tools, and fulfillment services, conditioned upon your acceptance of all terms, conditions, and notices stated here.
            </p>
            <p className="text-gray-600 leading-relaxed">
              By accessing our site, browsing merchandise, or completing a purchase, you engage in our "Service" and agree to comply with these Terms of Service. These terms apply equally to all site visitors, registered account holders, shoppers, and content contributors.
            </p>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 2. Product Information & Pricing */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <MonitorSmartphone className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">2. Products, Pricing &amp; Color Accuracy</h2>
            </div>
            <div className="space-y-5 text-gray-600 text-sm leading-relaxed">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-base mb-2">Display Calibration &amp; Color Fidelity</h4>
                <p>
                  We present our apparel through professional studio photography to reflect genuine colors, cuts, and textures. However, because device displays, contrast settings, and lighting environments vary, minor color shifts may be perceptible between your monitor and the physical fabric. Such variations do not constitute product defects.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-base mb-2">Dynamic Pricing &amp; Modifications</h4>
                <p>
                  Prices for our items are quoted in Pakistani Rupees (PKR) and are subject to adjustment without prior notice. We reserve the right to alter or discontinue products, colorways, or seasonal collections at our discretion without liability.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-base mb-2">Typographical Corrections</h4>
                <p>
                  In the event an item is inadvertently listed with an incorrect price or specifications due to system error, DENFIT reserves the right to reject or cancel any order placed at the erroneous amount, even if an initial automated order confirmation email was issued.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 3. Orders, Verification & Delivery */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <CreditCard className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">3. Orders, COD Verification &amp; Shipping</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm sm:text-base">
              To safeguard our customers and operations against fraudulent checkouts, we reserve the right to verify, limit, or refuse orders placed with us.
            </p>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/70">
                <h4 className="font-semibold text-amber-950 mb-1">Cash on Delivery (COD) Phone Verification</h4>
                <p>
                  Our team may initiate an automated SMS confirmation or a prompt phone call to confirm delivery address details prior to dispatch. If a customer cannot be reached after multiple reasonable attempts, DENFIT reserves the right to pause or cancel the order.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                <h4 className="font-semibold text-gray-900 mb-1">Standard &amp; Sale Delivery Timelines</h4>
                <p>
                  Standard deliveries across Pakistan are fulfilled within <strong>5–7 business days</strong> (and <strong>7–9 business days</strong> for high-volume sale events). Deliveries may be subject to delays caused by adverse weather conditions, natural disasters, courier logistical restrictions, civil disruptions, or circumstances beyond our control.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 4. Intellectual Property */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <FileWarning className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">4. Intellectual Property &amp; Brand Rights</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              All proprietary brand assets—including but not limited to the DENFIT name, registered logo, lookbook photography, video campaigns, garment patterns, website design, UI code, and written copy—are the exclusive intellectual property of <strong>DENFIT</strong> and protected under Pakistani and international copyright and trademark legislation. Reproduction, distribution, or commercial exploitation without prior written consent is strictly prohibited.
            </p>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 5. User Conduct & Prohibited Uses */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <UserX className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">5. Prohibited Conduct</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm">
              You are explicitly prohibited from using our site, infrastructure, or services:
            </p>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 ml-2">
              <li>To submit fabricated customer information, invalid telephone numbers, or unverified shipping addresses.</li>
              <li>To attempt automated scraping, database crawling, or malicious denial-of-service disruptions.</li>
              <li>To abuse promotional coupons, initiate unauthorized chargebacks, or engage in counterfeit re-selling.</li>
              <li>To harass, defame, or abuse customer service personnel via phone, email, or social media channels.</li>
            </ul>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 6. Limitation of Liability & Law */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <AlertOctagon className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">6. Limitation of Liability &amp; Governing Law</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
              <p>
                In no event shall DENFIT, its directors, officers, employees, affiliates, or logistics agents be liable for any indirect, incidental, punitive, or consequential damages arising from the use of our services or the purchase of our products beyond the total monetary value paid for the specific order in question.
              </p>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <strong className="text-gray-900 block mb-1">Governing Jurisdiction:</strong>
                These Terms of Service and any separate transactional agreements shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any legal dispute shall be subject to the exclusive jurisdiction of the competent courts of Lahore, Pakistan.
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 7. Terms of Service FAQs */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
                Clarity &amp; Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Terms of Service FAQs
              </h2>
            </div>

            <div className="space-y-4">
              {termsFaqs.map((faq, index) => {
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

          {/* 8. Contact Section */}
          <div className="bg-gray-900 text-white p-8 sm:p-10 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-3">Questions Regarding Our Terms?</h2>
              <p className="text-gray-300 mb-6 max-w-xl text-sm leading-relaxed">
                If you require clarification on any legal aspect of these terms, order policies, or commercial conditions, please connect with our legal compliance desk:
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
                    DENFIT Legal &amp; Compliance Office<br />
                    Defence Raya Golf &amp; Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <Gavel size={300} />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default TermsOfService;