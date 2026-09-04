import React from 'react';
import { 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Package, 
  Mail, 
  MapPin, 
  Camera, 
  Truck, 
  Clock,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const ReturnExchangePolicy = () => {
  const lastUpdated = "June 12, 2026";

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      {/* 1. HERO SECTION */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-800 rounded-full mb-6">
            <RefreshCw className="text-amber-500 mr-2" size={24} />
            <span className="text-gray-300 text-sm tracking-[0.26em] uppercase">Hassle-Free Returns</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.2em] mb-6 uppercase">
            Return & <span className="font-bold text-white">Exchange.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            We want you to love what you wear. If something isn't right, our comprehensive exchange policy ensures a smooth and transparent resolution.
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
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">14-Day Window</h3>
                <p className="text-sm text-gray-600">Request an exchange within 14 days of delivery for eligible items.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Quality Guaranteed</h3>
                <p className="text-sm text-gray-600">Items must be unworn, unwashed, and have original tags attached.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600">
                <XCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">No Cash Refunds</h3>
                <p className="text-sm text-gray-600">We offer exchanges or store credit, but strictly no cash refunds.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* General Policy */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <RefreshCw className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">1. Standard Exchange Policy</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6">
              DENFIT does not offer a "Cash Refund" policy. However, we are happy to offer a flexible exchange if the product doesn't fit or meet your expectations. You may exchange eligible items provided that:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <li className="flex items-center text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <ShieldCheck className="text-amber-500 mr-3 shrink-0" size={20} />
                <span className="text-sm">Requested within 14 days of delivery</span>
              </li>
              <li className="flex items-center text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <ShieldCheck className="text-amber-500 mr-3 shrink-0" size={20} />
                <span className="text-sm">Unused, unwashed, and free of defects</span>
              </li>
              <li className="flex items-center text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <ShieldCheck className="text-amber-500 mr-3 shrink-0" size={20} />
                <span className="text-sm">Original price labels and tags are fully intact</span>
              </li>
              <li className="flex items-center text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <ShieldCheck className="text-amber-500 mr-3 shrink-0" size={20} />
                <span className="text-sm">Original purchase invoice is provided</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 italic">
              * Note: Exchange requests for different sizes are subject to manual stock verification by our admin team. If your desired size is out of stock, you may choose another article of equal value.
            </p>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Strict Exceptions */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <AlertTriangle className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">2. Strict Exceptions</h2>
            </div>
            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-800 text-lg mb-2 flex items-center">
                  Hygiene & Safety Regulations
                </h3>
                <p className="text-red-700 text-sm leading-relaxed">
                  For strict hygiene and safety reasons, <strong>undergarments, underwear, swimwear, and socks cannot be exchanged or returned under any circumstances.</strong> Please review the size chart carefully before purchasing these items.
                </p>
              </div>
              <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                <h3 className="font-bold text-amber-900 text-lg mb-2 flex items-center">
                  Sale & Promotional Items
                </h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Items purchased during a clearance sale, flash sale, or under any promotional discount are considered final sale. Strictly no return or exchange applies to these orders.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Defective Items */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <Camera className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">3. Defective or Incorrect Items</h2>
            </div>
            <div className="prose prose-gray text-gray-600">
              <p className="mb-4">
                We maintain rigorous quality control, but if you receive a damaged, stained, or incorrect item, we will take full responsibility. 
              </p>
              <ul className="list-decimal list-inside space-y-2 mb-6 ml-2">
                <li>Notify us immediately at <span className="font-semibold text-amber-600">denfitcustomercare@gmail.com</span>.</li>
                <li>Attach clear photographs of the defect and the invoice.</li>
                <li>Claims must be made within <strong>7 days</strong> of delivery. Claims made after this period will not be entertained.</li>
              </ul>
              <p className="text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                <strong>Shipping Costs:</strong> If DENFIT delivers an incorrect or faulty item, we will bear the return shipping costs.
              </p>
            </div>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Exchange Process */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <Package className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">4. How to Exchange</h2>
            </div>
            <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">Contact Support</h4>
                  <p>Email our team with your Order ID and the reason for the exchange.</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">Ship the Item Back</h4>
                  <p>Once approved, courier the parcel back to our official address. <span className="font-medium text-gray-800">Please note: The customer is responsible for the courier charges when returning items for a standard size/color exchange.</span></p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">Receive Replacement</h4>
                  <p>After our quality assurance team inspects the returned item, your requested replacement will be dispatched within 5-7 working days (7-9 working days for sale items). Note that delivery timelines may be affected by weather conditions, disasters, local restrictions, or circumstances beyond our control.</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-12" />

          {/* Order Cancellation */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <Truck className="text-gray-900 mr-3" size={28} />
              <h2 className="text-3xl font-bold">5. Order Cancellation</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              You may cancel your order at any time <strong>before it is processed or dispatched</strong> by contacting customer care. Once the order has been shipped, you will receive a tracking confirmation, and the standard Exchange Policy will apply upon delivery. DENFIT reserves the right to cancel orders due to reasons such as items being out of stock or pricing errors.
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-gray-900 text-white p-10 rounded-2xl relative overflow-hidden mt-12">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <HelpCircle className="mr-3 text-amber-500" /> Need Help with an Order?
              </h2>
              <p className="text-gray-300 mb-8 max-w-lg">
                Our customer service team is ready to assist you with tracking, returns, and exchanges.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="text-amber-500 mr-4" size={20} />
                  <a href="mailto:denfitcustomercare@gmail.com" className="hover:text-amber-500 transition-colors">
                    denfitcustomercare@gmail.com
                  </a>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-amber-500 mr-4 mt-1" size={20} />
                  <span>
                    Returns Department<br />
                    Defence Raya Golf & Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </span>
                </div>
              </div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <Package size={300} />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default ReturnExchangePolicy;