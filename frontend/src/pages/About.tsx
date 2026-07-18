import React from 'react';
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
  Star
} from 'lucide-react';

export const About = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-900 to-black text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 mb-12 lg:mb-0">
              <h1 className="text-4xl md:text-6xl font-light mb-6">
                Redefining <span className="text-amber-500">Urban</span> Fashion
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-lg">
                DENFIT merges premium craftsmanship with contemporary design, creating clothing that empowers confidence in every urban setting.
              </p>
              <Link to="/shop" className="bg-amber-500 hover:bg-amber-600 text-black font-normal py-3 px-8 rounded-full flex items-center transition duration-300 transform hover:scale-105">
                Explore Collection <ArrowRight className="ml-2" size={20} />
              </Link>
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
              <h2 className="text-3xl md:text-4xl font-light mb-6 text-gray-900">
                Our <span className="text-amber-500">Story</span>
              </h2>
              <p className="text-gray-700 mb-6">
                Founded in 2015, DENFIT emerged from a simple vision: to create clothing that bridges the gap between luxury comfort and everyday functionality. Our journey began in a small studio with three passionate designers determined to challenge fast fashion norms.
              </p>
              <p className="text-gray-700 mb-6">
                Today, we've grown into an internationally recognized brand, but our core values remain unchanged. Each DENFIT garment is thoughtfully designed, ethically produced, and crafted to withstand trends and time.
              </p>
              <div className="flex items-center mt-8">
                <div className="flex items-center mr-8">
                  <Award className="text-amber-500 mr-2" />
                  <span className="font-normal">Premium Quality</span>
                </div>
                <div className="flex items-center">
                  <Heart className="text-amber-500 mr-2" />
                  <span className="font-normal">Ethically Made</span>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="DENFIT Design Studio" 
                className="rounded-lg shadow-2xl w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">
              Mission & <span className="text-amber-500">Vision</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're committed to shaping the future of fashion with purpose and innovation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <Globe className="text-amber-600" size={28} />
              </div>
              <h3 className="text-2xl font-light mb-4">Our Mission</h3>
              <p className="text-gray-700 mb-4">
                To redefine urban fashion by creating sustainable, high-quality clothing that empowers individuals to express their unique identity while minimizing environmental impact.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Ethical production practices</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Premium sustainable materials</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Innovative design technology</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <Star className="text-amber-600" size={28} />
              </div>
              <h3 className="text-2xl font-light mb-4">Our Vision</h3>
              <p className="text-gray-700 mb-4">
                To become the world's most respected urban fashion brand, recognized for setting new standards in sustainable luxury and innovative design that transcends generations.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Carbon-neutral operations by 2025</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Global retail expansion</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="text-green-500 mr-2" size={18} />
                  <span>Revolutionary fabric technology</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">
              Our Core <span className="text-amber-500">Values</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The principles that guide every decision we make at DENFIT
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: "Quality Craftsmanship", desc: "Every stitch matters. We use premium materials and meticulous attention to detail." },
              { icon: Users, title: "Community Focused", desc: "We design for real people, creating inclusive sizing and styles for diverse urban lifestyles." },
              { icon: Globe, title: "Sustainable Future", desc: "From sourcing to shipping, we prioritize eco-friendly practices at every step." },
              { icon: Heart, title: "Ethical Production", desc: "Fair wages, safe working conditions, and transparency throughout our supply chain." }
            ].map((value, index) => (
              <div key={index} className="text-center p-6 hover:bg-gray-50 rounded-xl transition duration-300">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="text-amber-600" size={32} />
                </div>
                <h3 className="text-xl font-light mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">50K+</div>
              <div className="text-gray-400">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">15+</div>
              <div className="text-gray-400">Countries</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">100%</div>
              <div className="text-gray-400">Ethically Sourced</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-light mb-2">24/7</div>
              <div className="text-gray-400">Customer Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6 text-gray-900">
            Join the DENFIT <span className="text-amber-500">Movement</span>
          </h2>
          <p className="text-gray-700 text-xl mb-10 max-w-2xl mx-auto">
            Experience premium urban fashion designed for the modern lifestyle. Discover your perfect fit today.
          </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/shop" className="bg-black hover:bg-gray-800 text-white font-normal py-3 px-8 rounded-full transition duration-300 inline-flex items-center justify-center">
              Shop Collection
            </Link>
            <Link to="/contact" className="border-2 border-black hover:bg-black hover:text-white font-normal py-3 px-8 rounded-full transition duration-300 inline-flex items-center justify-center">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;