import React, { useState } from 'react';
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
  HelpCircle,
  ChevronDown,
  Check,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReturnExchangePolicy = () => {
  const lastUpdated = "September 2026";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const returnFaqs = [
    {
      q: "Can I exchange an item for a different size or color?",
      a: "Yes! If an article doesn't fit as desired or you prefer another colorway, you may exchange it within 14 days of delivery. The item must be in its original unworn condition with all tags attached. If your desired size is out of stock, you can select any alternate item of equal value or receive a store credit coupon."
    },
    {
      q: "Who is responsible for the courier shipping charges during an exchange?",
      a: "If DENFIT sends an incorrect, defective, or damaged item, DENFIT bears 100% of all return and replacement shipping costs. For voluntary customer exchanges (e.g., standard size preference or color change), the customer arranges and pays for the return courier to our Lahore studio, and DENFIT covers the shipping of your new replacement parcel back to you."
    },
    {
      q: "What should I do if my parcel arrives damaged, stained, or defective?",
      a: "We maintain strict individual quality inspections, but in the rare instance you receive a damaged or stained piece, please notify us within 7 days of delivery at denfitcustomercare@gmail.com with your Order ID and clear photographs of the defect. We will immediately dispatch a priority replacement without any extra charge."
    },
    {
      q: "Why does DENFIT operate an exchange policy rather than a cash refund policy?",
      a: "As an urban designer label operating limited batch productions, we provide dedicated size exchanges, product replacements, or lifetime-valid store credits instead of cash refunds. This allows us to guarantee high textile standards, preserve inventory freshness, and keep prices accessible."
    },
    {
      q: "Are items bought on Clearance or Flash Sale eligible for return?",
      a: "Articles purchased under special clearance sales or flash discounts marked as 'Final Sale' are not eligible for size or preference exchange, except in the event of an unwearable manufacturing defect reported within 7 days."
    },
    {
      q: "Can I drop off an exchange in person at your studio in Lahore?",
      a: "Yes. Customers in Lahore may arrange an in-person exchange at our studio in Defence Raya Golf & Country Club, Phase 6, DHA Lahore during operational hours (Monday–Friday 10:00 AM – 7:00 PM) by coordinating in advance with our customer care team."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      {/* 1. HERO SECTION */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center justify-center p-3 bg-gray-800 rounded-full mb-6">
            <RefreshCw className="text-amber-500 mr-2" size={24} />
            <span className="text-gray-300 text-sm tracking-[0.26em] uppercase">Hassle-Free Exchanges</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.2em] mb-6 uppercase">
            Return &amp; <span className="font-bold text-white">Exchange.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            We are dedicated to ensuring your complete satisfaction with every fit. If an article doesn't match your expectations, our transparent exchange policy has you covered.
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
                <Clock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">14-Day Exchange Window</h3>
                <p className="text-sm text-gray-600">Submit an exchange request within 14 calendar days of parcel delivery for all regular-priced merchandise.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Original Condition Intact</h3>
                <p className="text-sm text-gray-600">Garments must be unworn, unwashed, free of perfume scents, and with all original brand tags and polybags attached.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white p-3 rounded-lg shadow-sm mr-4 text-amber-600 shrink-0">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Store Credit or Replacement</h3>
                <p className="text-sm text-gray-600">We offer straightforward size exchanges or store credit vouchers valid across our entire catalog (no cash refunds).</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* 1. General Policy */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <RefreshCw className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">1. Standard Exchange Guidelines</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6 text-sm sm:text-base">
              DENFIT maintains an <strong>Exchange &amp; Store Credit Only</strong> policy. We want you to feel completely confident in your garments. If your order does not fit or you wish to switch colorways, you may request an exchange under the following mandatory criteria:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                <Check className="text-green-600 mr-3 shrink-0" size={20} />
                <span className="text-sm">Initiated within 14 calendar days from delivery date</span>
              </div>
              <div className="flex items-center text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                <Check className="text-green-600 mr-3 shrink-0" size={20} />
                <span className="text-sm">Completely unworn, unwashed, and free of odors or marks</span>
              </div>
              <div className="flex items-center text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                <Check className="text-green-600 mr-3 shrink-0" size={20} />
                <span className="text-sm">All original DENFIT swing tags &amp; labels firmly attached</span>
              </div>
              <div className="flex items-center text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                <Check className="text-green-600 mr-3 shrink-0" size={20} />
                <span className="text-sm">Returned in original protective polybag packaging</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 italic bg-amber-50/70 p-3.5 rounded-lg border border-amber-200/60">
              * Note: In case the exact requested replacement size is out of stock, you may choose any alternate article from our collection (paying any price difference, or receiving a store credit coupon for any remainder).
            </p>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 2. Step-by-Step Exchange Workflow */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <Package className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">2. How to Process Your Exchange</h2>
            </div>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed">
              Exchanging your DENFIT apparel is seamless and straightforward. Please follow these four simple steps:
            </p>

            <div className="space-y-6 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm mr-4 shrink-0 shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">Submit Your Request</h4>
                  <p className="leading-relaxed">
                    Email our care team at <a href="mailto:denfitcustomercare@gmail.com" className="text-amber-600 font-medium underline">denfitcustomercare@gmail.com</a> or WhatsApp <a href="tel:+923323331346" className="text-gray-900 font-semibold">+92 332 333 1346</a>. Specify your <strong>Order ID</strong>, current item size, and the desired replacement size or style.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm mr-4 shrink-0 shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">Receive Authorization &amp; Studio Address</h4>
                  <p className="leading-relaxed">
                    Our team will verify available replacement inventory within 24 hours and supply you with an Exchange Authorization Number and our studio dispatch address in Lahore.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm mr-4 shrink-0 shadow-sm">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">Courier the Item Back</h4>
                  <p className="leading-relaxed">
                    Pack the unworn item securely in its original packaging. Hand it over to any reliable courier of your choice (TCS, Leopards, M&amp;P, Trax) destined for our Lahore studio. Share the return courier tracking number with our team.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm mr-4 shrink-0 shadow-sm">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">Quality Inspection &amp; Replacement Dispatch</h4>
                  <p className="leading-relaxed">
                    Upon arrival, our Quality Control team verifies that tags, fabric, and seams are untouched. Your replacement item is then dispatched within <strong>5–7 working days</strong> (7–9 working days during promotional sales periods) with a new tracking code.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 3. Shipping Costs Allocation */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <Truck className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">3. Shipping Cost Allocation</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200/80">
                <h4 className="font-bold text-gray-900 text-base mb-2">Standard Size / Color Exchange</h4>
                <p className="text-gray-600 leading-relaxed mb-3">
                  For voluntary exchanges resulting from personal size preference or aesthetic changes:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">&bull;</span>
                    <span>Customer covers courier cost to send parcel to our Lahore studio.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-gray-900 mr-2">&bull;</span>
                    <span>DENFIT covers the cost of shipping the replacement size back to you.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50/60 p-6 rounded-xl border border-amber-200/80">
                <h4 className="font-bold text-amber-950 text-base mb-2">Defective or Incorrect Dispatches</h4>
                <p className="text-amber-900 leading-relaxed mb-3">
                  If our team mistakenly ships an incorrect item, wrong size, or article with a manufacturing flaw:
                </p>
                <ul className="space-y-2 text-amber-900 font-medium">
                  <li className="flex items-start">
                    <Check size={16} className="text-amber-700 mr-2 mt-0.5 shrink-0" />
                    <span>DENFIT bears 100% of return courier charges.</span>
                  </li>
                  <li className="flex items-start">
                    <Check size={16} className="text-amber-700 mr-2 mt-0.5 shrink-0" />
                    <span>Replacement is expedited with complimentary express dispatch.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 4. Strict Exceptions */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">4. Non-Exchangeable Articles</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-red-50 p-6 rounded-xl border border-red-200/70">
                <h3 className="font-bold text-red-900 text-base mb-2 flex items-center">
                  <XCircle size={18} className="mr-2 text-red-600 shrink-0" />
                  Intimate Garments &amp; Hygiene Items
                </h3>
                <p className="text-red-800 text-sm leading-relaxed">
                  For strict sanitary and dermatological reasons, <strong>undergarments, boxer briefs, innerwear, bodysuits, and socks cannot be exchanged or returned under any circumstances.</strong> Please consult our exact size chart before placing your order.
                </p>
              </div>

              <div className="bg-amber-50 p-6 rounded-xl border border-amber-200/70">
                <h3 className="font-bold text-amber-950 text-base mb-2 flex items-center">
                  <AlertTriangle size={18} className="mr-2 text-amber-700 shrink-0" />
                  Clearance &amp; Final Sale Items
                </h3>
                <p className="text-amber-900 text-sm leading-relaxed">
                  Items purchased from our Clearance, Warehouse Sale, or special promotional flash deals are final sale and non-exchangeable unless an unwearable physical defect is demonstrated upon initial arrival.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 5. Defective Item Claims */}
          <div className="mb-14">
            <div className="flex items-center mb-4">
              <Camera className="text-amber-600 mr-3 shrink-0" size={26} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">5. Defective or Damaged Claims</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base mb-4">
              If an item is damaged upon opening, you must file a claim within <strong>7 calendar days</strong> of courier delivery. To file:
            </p>
            <ul className="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2 mb-4">
              <li>Photograph the defective area under clear natural light showing the flaw in detail.</li>
              <li>Include a photo of the garment with all brand swing tags intact.</li>
              <li>Email the photos with your Order ID to <span className="font-semibold text-gray-900">denfitcustomercare@gmail.com</span>.</li>
            </ul>
            <p className="text-xs text-gray-500 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
              Claims submitted after the 7-day window or garments showing signs of wear, machine washing, or alterations will not be accepted.
            </p>
          </div>

          <hr className="border-gray-100 my-10" />

          {/* 6. Returns FAQs */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
                Frequently Asked Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Return &amp; Exchange FAQs
              </h2>
            </div>

            <div className="space-y-4">
              {returnFaqs.map((faq, index) => {
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

          {/* 7. Need Help Section */}
          <div className="bg-gray-900 text-white p-8 sm:p-10 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-3 flex items-center">
                <HelpCircle className="mr-3 text-amber-500" size={24} />
                Need Assistance with an Exchange?
              </h2>
              <p className="text-gray-300 mb-6 max-w-xl text-sm leading-relaxed">
                Our customer care representatives are dedicated to making your exchange quick and worry-free. Get in touch with our team directly:
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="text-amber-500 mr-3 shrink-0" size={18} />
                  <a href="mailto:denfitcustomercare@gmail.com" className="hover:text-amber-300 transition-colors font-medium">
                    denfitcustomercare@gmail.com
                  </a>
                </div>
                <div className="flex items-start">
                  <MapPin className="text-amber-500 mr-3 mt-1 shrink-0" size={18} />
                  <div>
                    DENFIT Returns &amp; Exchange Studio<br />
                    Defence Raya Golf &amp; Country Club,<br />
                    Phase 6, DHA Lahore, Pakistan
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-800 flex flex-wrap gap-4">
                <Link to="/shop" className="inline-flex items-center px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors">
                  <span>Browse Shop Collection</span>
                  <ArrowRight size={14} className="ml-1.5" />
                </Link>
                <Link to="/contact" className="inline-flex items-center px-5 py-2.5 border border-gray-700 hover:border-gray-500 text-white text-xs font-medium rounded-lg transition-colors">
                  Contact Support Desk
                </Link>
              </div>
            </div>
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