import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Globe, 
  Truck, 
  Shield, 
  Users, 
  Award,
  Heart,
  Star,
  ChevronDown,
  Sparkles,
  Scissors
} from 'lucide-react';

export const About = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Where are DENFIT garments manufactured?",
      a: "All DENFIT designs originate from our creative studio at Defence Raya, Lahore. Our apparel is crafted in close partnership with audited ethical textile mills and specialized craft workshops across Pakistan, celebrating the country's rich heritage in premium denim and knitted cottons."
    },
    {
      q: "How does DENFIT guarantee fabric quality and durability?",
      a: "Every fabric roll undergoes rigorous lab testing for dimensional stability, GSM weight consistency, and colorfastness. Before any batch is cut and stitched, we perform pre-washing and shrinkage trials to ensure your garment looks and feels just as sharp after multiple home washes."
    },
    {
      q: "How do I choose the correct size for DENFIT apparel?",
      a: "Our fits are calibrated for modern South Asian and global sizing standards, offering both tailored regular fits and relaxed oversized streetwear silhouettes. Every product page contains a dedicated Size Guide with exact chest, shoulder, length, and waist measurements in inches. If you're ever between sizes, our customer care team is available to assist."
    },
    {
      q: "What is your approach to sustainable and ethical fashion?",
      a: "We believe the most sustainable garment is the one you keep wearing season after season. We reject throwaway fast fashion in favor of heavy-duty threads, reinforced stress points, minimal-waste pattern engineering, and recyclable packaging mailers."
    },
    {
      q: "Do you offer nationwide delivery across Pakistan?",
      a: "Yes. Through our trusted logistics partners (including TCS, Leopards, and Trax), we deliver to over 50 cities, towns, and regions across Pakistan, offering convenient Cash on Delivery (COD) as well as secure prepaid options."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-900 to-black text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-12 lg:mb-0">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6">
                Urban Elegance &bull; Modern Fit
              </span>
              <h1 className="text-4xl md:text-6xl font-light mb-6 tracking-tight">
                Redefining <span className="text-amber-500 font-normal">Urban</span> Fashion
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg font-light leading-relaxed">
                DENFIT merges premium Pakistani craftsmanship with contemporary streetwear aesthetics, creating garments engineered for confidence and everyday life.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/shop" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3.5 px-8 rounded-full flex items-center transition duration-300 transform hover:scale-105 text-sm uppercase tracking-wider">
                  Explore Collection <ArrowRight className="ml-2" size={18} />
                </Link>
                <Link to="/contact" className="border border-white/30 hover:border-white text-white font-medium py-3.5 px-7 rounded-full transition duration-300 text-sm">
                  Visit Studio
                </Link>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 bg-gradient-to-br from-amber-500 to-transparent rounded-full opacity-30 animate-pulse"></div>
                <img 
                  src="https://images.unsplash.com/photo-1558769132-cb1a40ed0ada?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="DENFIT Premium Clothing" 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 object-cover rounded-full shadow-2xl border-4 border-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-12 lg:mb-0 lg:pr-12">
              <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
                Heritage &amp; Vision
              </span>
              <h2 className="text-3xl md:text-4xl font-light mb-6 text-gray-900 tracking-tight">
                Our <span className="text-amber-500 font-normal">Story</span>
              </h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                DENFIT was founded in Lahore with a clear objective: to challenge the compromise between mass-produced fast fashion and expensive designer luxury. We recognized a genuine need for elevated everyday wear that fits impeccably, feels luxurious on the skin, and withstands continuous daily wear.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                From our design studio at Defence Raya, Lahore, every silhouette begins with thoughtful pattern-making, premium combed cottons, and reinforced seams. What started as an ambitious local concept has grown into a recognized urban brand trusted by fashion enthusiasts nationwide.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center">
                  <Award className="text-amber-500 mr-3 shrink-0" size={20} />
                  <span className="text-sm font-medium text-gray-800">Precision Tailoring</span>
                </div>
                <div className="flex items-center">
                  <Heart className="text-amber-500 mr-3 shrink-0" size={20} />
                  <span className="text-sm font-medium text-gray-800">Ethically Produced</span>
                </div>
                <div className="flex items-center">
                  <Shield className="text-amber-500 mr-3 shrink-0" size={20} />
                  <span className="text-sm font-medium text-gray-800">Shrink-Tested Fabrics</span>
                </div>
                <div className="flex items-center">
                  <Truck className="text-amber-500 mr-3 shrink-0" size={20} />
                  <span className="text-sm font-medium text-gray-800">Nationwide Shipping</span>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="DENFIT Design Studio" 
                className="rounded-2xl shadow-xl w-full h-[420px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The DENFIT Standard (Craftsmanship Pillar) */}
      <section className="bg-neutral-50 py-20 px-4 border-y border-neutral-200/60">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
              Obsessive Attention to Detail
            </span>
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">
              The DENFIT <span className="text-amber-500 font-normal">Standard</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
              Every detail—from fabric weight to button stitch count—is carefully engineered to deliver comfort and enduring style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200/70 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-6">
                <Scissors size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Combed &amp; Pre-Shrunk Cottons</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                We select premium long-staple combed cottons and knit blends that are pre-washed prior to assembly, preventing unexpected shape loss or shrinkage after home laundering.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200/70 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Double-Needle Reinforcements</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                High-stress points such as neck collars, shoulder seams, and pocket hems are reinforced with precision twin stitching for extended life and structural integrity.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200/70 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Independent Piece Inspection</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Every unit is hand-checked by our Quality Assurance specialists before packaging—inspecting stitch tension, color accuracy, zipper alignment, and hardware durability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">
              Mission &amp; <span className="text-amber-500 font-normal">Vision</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Committed to setting genuine standards in contemporary lifestyle apparel
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition duration-300">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="text-amber-600" size={28} />
              </div>
              <h3 className="text-2xl font-light mb-4 text-gray-900">Our Mission</h3>
              <p className="text-gray-700 mb-6 leading-relaxed text-sm sm:text-base">
                To deliver contemporary urban fashion that seamlessly merges luxury aesthetics with everyday durability, providing consumers with thoughtfully crafted pieces they can wear with pride.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Fair manufacturing practices with audited domestic workshops</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Rigorous fabric selection and dimensional stability testing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Transparent customer service and reliable order fulfillment</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition duration-300">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Star className="text-amber-600" size={28} />
              </div>
              <h3 className="text-2xl font-light mb-4 text-gray-900">Our Vision</h3>
              <p className="text-gray-700 mb-6 leading-relaxed text-sm sm:text-base">
                To stand as Pakistan's most trusted contemporary apparel brand—renowned for clean aesthetics, dependable fits, transparent customer satisfaction, and ethical craftsmanship.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Eco-conscious packaging rollouts across all product lines</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Nationwide express logistics and studio experience hubs</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2.5 shrink-0" size={18} />
                  <span>Championing local textile artisans and forward-thinking apparel tech</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-gray-50 py-20 px-4 border-t border-gray-200/70">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">
              Our Core <span className="text-amber-500 font-normal">Values</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
              The foundational principles guiding every stitch, cut, and customer interaction at DENFIT
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Uncompromising Quality", desc: "Every stitch and fabric blend is tested for durability, colorfastness, and hand-feel." },
              { icon: Users, title: "Tailored for Real Life", desc: "Thoughtful pattern engineering designed for everyday movement and diverse body types." },
              { icon: Globe, title: "Sustainable Mindset", desc: "Rejecting fast-fashion disposal by crafting enduring wardrobe staples and utilizing recyclable mailers." },
              { icon: Heart, title: "Ethical Manufacturing", desc: "Safe working conditions, fair wages, and genuine partnerships across our local manufacturing facilities." }
            ].map((value, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition duration-300">
                <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-5">
                  <value.icon className="text-amber-600" size={26} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Realistic Stats Section (Replaced 50K+ and 15+ Countries) */}
      <section className="bg-black text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-5xl font-light mb-2 tracking-tight text-white">5,000+</div>
              <div className="text-gray-400 text-xs md:text-sm uppercase tracking-wider font-medium">Verified Customers</div>
            </div>
            <div>
              <div className="text-3xl md:text-5xl font-light mb-2 tracking-tight text-amber-500">50+</div>
              <div className="text-gray-400 text-xs md:text-sm uppercase tracking-wider font-medium">Cities Nationwide</div>
            </div>
            <div>
              <div className="text-3xl md:text-5xl font-light mb-2 tracking-tight text-white">100%</div>
              <div className="text-gray-400 text-xs md:text-sm uppercase tracking-wider font-medium">Quality Inspected</div>
            </div>
            <div>
              <div className="text-3xl md:text-5xl font-light mb-2 tracking-tight text-amber-500">24/7</div>
              <div className="text-gray-400 text-xs md:text-sm uppercase tracking-wider font-medium">Dedicated Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <span className="text-amber-600 font-semibold text-xs tracking-widest uppercase mb-2 block">
              Clear Answers
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 tracking-tight">
              Frequently Asked <span className="text-amber-500 font-normal">Questions</span>
            </h2>
            <p className="text-gray-600 text-sm mt-3 max-w-lg mx-auto">
              Everything you need to know about our products, production ethos, and order fulfillment.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="border border-neutral-200 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
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
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-neutral-50 border-t border-neutral-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6 text-gray-900 tracking-tight">
            Join the DENFIT <span className="text-amber-500 font-normal">Community</span>
          </h2>
          <p className="text-gray-600 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience premium urban fashion designed for the modern lifestyle. Discover your perfect fit today with nationwide delivery.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/shop" className="bg-black hover:bg-neutral-800 text-white font-medium py-3.5 px-8 rounded-xl transition duration-300 inline-flex items-center justify-center text-sm uppercase tracking-wider">
              Shop Collection
            </Link>
            <Link to="/contact" className="border border-neutral-300 hover:border-black hover:bg-black hover:text-white text-neutral-800 font-medium py-3.5 px-8 rounded-xl transition duration-300 inline-flex items-center justify-center text-sm">
              Contact Customer Care
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;