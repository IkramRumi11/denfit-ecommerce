import React from 'react';
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
  UserX
} from 'lucide-react';

export const TermsOfService = () => {
  const lastUpdated = "June 12, 2026";

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
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Please read these Terms of Service carefully before accessing or using our website. By using our platform, you agree to be bound by these fair and transparent terms.
          </p>
          <div className="mt-8 text-sm text-gray-500 font-mono">
            Last Updated: <span className="text-amber-500">{lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* 2. KEY HIGHLIGHTS (Quick Read) */}
      <section className="py-12 px-4 border-b border-gray-100 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <Scale size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Fair & Transparent</h3>
                <p className="text-sm text-gray-600">Clear rules regarding purchases, pricing, and your rights as a consumer.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Quality Commitment</h3>
                <p className="text-sm text-gray-600">We strive for 100% accuracy in our product descriptions and imagery.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <Gavel size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Local Jurisdiction</h3>
                <p className="text-sm text-gray-600">Operated strictly under the laws of Pakistan, ensuring local compliance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* Overview */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <ScrollText className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">1. Overview</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              This website is operated by <strong>DENFIT</strong>. Throughout the site, the terms "we", "us" and "our" refer to DENFIT. We offer this website, including all information, tools, and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies, and notices stated here.
            </p>
            <p className="text-gray-600 leading-relaxed">
              By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions. These Terms of Service apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.
            </p>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Product Information & Accuracy */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <MonitorSmartphone className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">2. Products, Pricing & Accuracy</h2>
            </div>
            <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-lg mb-2">Display & Color Discrepancies</h4>
                <p>
                  We have made every effort to display as accurately as possible the colors and images of our products that appear at the store. However, we cannot guarantee that your computer monitor's or mobile device's display of any color will be entirely accurate. Slight color variations are normal and do not constitute a defect.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-lg mb-2">Pricing Changes</h4>
                <p>
                  Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension, or discontinuance of the Service.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 text-lg mb-2">Typographical Errors</h4>
                <p>
                  In the event a product is listed at an incorrect price or with incorrect information due to a typographical error, DENFIT shall have the right to refuse or cancel any order placed for such products, whether or not the order has been confirmed and payment has been processed.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Orders & Right to Refuse */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <CreditCard className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">3. Orders & Billing</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household, or per order. These restrictions may include orders placed by or under the same customer account, the same credit card, and/or orders that use the same billing and/or shipping address.
            </p>
            <p className="text-gray-600 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
              In the event that we make a change to or cancel an order, we will attempt to notify you by contacting the email and/or billing address/phone number provided at the time the order was made.
            </p>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Intellectual Property */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <FileWarning className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">4. Intellectual Property</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the exclusive property of <strong>DENFIT</strong> and protected by Pakistani and international copyright and trademark laws. You may not reproduce, duplicate, copy, sell, resell or exploit any portion of the Service, use of the Service, or access to the Service without express written permission by us.
            </p>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Prohibited Uses */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <UserX className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">5. Prohibited Uses</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              In addition to other prohibitions as set forth in the Terms of Service, you are prohibited from using the site or its content:
            </p>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 ml-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts.</li>
              <li>To violate any international, federal, provincial, or local regulations, rules, or laws.</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others.</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability.</li>
              <li>To submit false or misleading information.</li>
              <li>To upload or transmit viruses or any other type of malicious code.</li>
            </ul>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Limitation of Liability & Law */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <AlertOctagon className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">6. Limitation of Liability & Governing Law</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Disclaimer of Warranties</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We do not guarantee, represent or warrant that your use of our service will be uninterrupted, timely, secure, or error-free. You expressly agree that your use of, or inability to use, the service is at your sole risk.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg mb-2">Governing Law</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Lahore, Pakistan.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gray-900 text-white p-10 rounded-2xl relative overflow-hidden mt-12">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4">Questions about our Terms?</h2>
              <p className="text-gray-300 mb-8 max-w-lg">
                If you need clarification regarding any of the terms outlined above, our legal and support team is ready to assist you.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="text-amber-500 mr-4" size={20} />
                  <a href="mailto:denfitcustomerservice@gmail.com" className="hover:text-amber-500 transition-colors">
                    denfitcustomerservice@gmail.com
                  </a>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-amber-500 mr-4 mt-1" size={20} />
                  <span>
                    Legal Department<br />
                    Defence Raya Golf & Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </span>
                </div>
              </div>
            </div>
            
            {/* Background decoration */}
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