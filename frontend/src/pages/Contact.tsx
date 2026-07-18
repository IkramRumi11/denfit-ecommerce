import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Send,
  AlertCircle,
  CheckCircle2,
  Instagram,
  Facebook,
  Twitter
} from 'lucide-react';

export const Contact = () => {
  // --- STATE MANAGEMENT ---
  const [formState, setFormState] = useState('idle'); // idle, submitting, success
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderNumber: '',
    subject: 'General Inquiry',
    message: ''
  });

  // --- HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    
    // 1. Define where the email goes based on the Topic selected
    // If it's a complaint, we send to the care email. Otherwise, the service email.
    const targetEmail = formData.subject === 'Product Complaint' || formData.subject === 'Returns & Exchanges'
      ? 'denfitcustomercare@gmail.com'
      : 'denfitcustomerservice@gmail.com';

    // 2. Construct the Email Body
    const emailSubject = `[Web Inquiry] ${formData.subject}: ${formData.orderNumber || 'No Order #'}`;
    const emailBody = `
Name: ${formData.name}
Email: ${formData.email}
Order Number: ${formData.orderNumber || 'N/A'}
Topic: ${formData.subject}

Message:
${formData.message}
    `;

    // 3. Open the user's default email client
    // encodeURIComponent ensures special characters don't break the link
    window.location.href = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // 4. Show success state in the UI
    setTimeout(() => {
      setFormState('success');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-[40vh] md:h-[50vh] bg-gray-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="DENFIT Customer Care" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <span className="text-amber-500 font-semibold tracking-[0.26em] uppercase text-sm mb-4 block">
            24/7 Support
          </span>
          <h1 className="text-4xl md:text-6xl font-thin text-white mb-6 uppercase tracking-[0.2em]">
            Get In <span className="font-bold text-white">Touch</span>
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto font-light text-lg">
            Whether you have a question about sizing, materials, or your order, our team is ready to assist you.
          </p>
        </div>
      </section>

      {/* 2. CONTACT INFO GRID */}
      <section className="py-16 md:py-24 px-4 -mt-20 relative z-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: General Support */}
            <div className="bg-white p-8 shadow-xl border-t-4 border-amber-500 transform hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="text-amber-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Service</h3>
              <p className="text-gray-500 text-sm mb-6">For general inquiries, sizing help, and order status.</p>
              <a href="mailto:denfitcustomerservice@gmail.com" className="flex items-center text-gray-900 font-semibold hover:text-amber-600 transition-colors">
                <Mail size={16} className="mr-2" />
                denfitcustomerservice@gmail.com
              </a>
            </div>

            {/* Card 2: Complaints (Highlighted) */}
            <div className="bg-gray-900 p-8 shadow-xl border-t-4 border-red-500 transform hover:-translate-y-1 transition-all duration-300 text-white">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Resolutions & Care</h3>
              <p className="text-gray-400 text-sm mb-6">Dedicated line for complaints, returns, and escalations.</p>
              <a href="mailto:denfitcustomercare@gmail.com" className="flex items-center text-white font-semibold hover:text-red-400 transition-colors">
                <Mail size={16} className="mr-2" />
                denfitcustomercare@gmail.com
              </a>
            </div>

            {/* Card 3: Phone & WhatsApp */}
            <div className="bg-white p-8 shadow-xl border-t-4 border-amber-500 transform hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <Phone className="text-amber-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-gray-500 text-sm mb-6">Mon-Sat from 10am to 7pm (PKT).</p>
              <a href="tel:+923323331346" className="flex items-center text-gray-900 font-semibold hover:text-amber-600 transition-colors text-lg">
                <Phone size={18} className="mr-2" />
                +92 332 333 1346
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* 3. FORM & HQ SECTION */}
      <section className="py-12 px-4 pb-24">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-16">
            
            {/* Left: Contact Form */}
            <div className="lg:w-3/5">
              <div className="mb-8">
                <h2 className="text-3xl font-thin uppercase tracking-[0.2em] text-gray-900 mb-2">Send a Message</h2>
                <div className="w-16 h-1 bg-amber-500"></div>
              </div>
              
              {formState === 'success' ? (
                <div className="bg-green-50 border border-green-200 p-8 text-center rounded-lg animate-in fade-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent Successfully!</h3>
                  <p className="text-gray-600">Thank you for contacting DENFIT. Our team will review your message and get back to you within 24 hours.</p>
                  <button 
                    onClick={() => setFormState('idle')}
                    className="mt-6 text-sm font-bold text-green-700 hover:text-green-800 underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                      <input 
                        type="text" 
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 p-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                      <input 
                        type="email" 
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 p-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order # (Optional)</label>
                      <input 
                        type="text" 
                        name="orderNumber"
                        value={formData.orderNumber}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 p-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                        placeholder="ORD-1234"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topic</label>
                      <select 
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border border-gray-200 p-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors appearance-none"
                      >
                        <option>General Inquiry</option>
                        <option>Order Status</option>
                        <option>Returns & Exchanges</option>
                        <option>Product Complaint</option>
                        <option>Collaboration</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</label>
                    <textarea 
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50 border border-gray-200 p-4 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors resize-none"
                      placeholder="How can we help you today?"
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={formState === 'submitting'}
                    className={`bg-gray-900 text-white px-10 py-4 font-bold tracking-[0.26em] uppercase hover:bg-amber-600 transition-colors duration-300 flex items-center ${formState === 'submitting' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {formState === 'submitting' ? 'Sending...' : 'Send Message'}
                    {!formState === 'submitting' && <Send size={18} className="ml-3" />}
                  </button>
                </form>
              )}
            </div>

            {/* Right: HQ Info & Map Overlay */}
            <div className="lg:w-2/5">
              <div className="bg-gray-50 p-8 h-full">
                <h3 className="text-xl font-bold uppercase tracking-wide text-gray-900 mb-6 flex items-center">
                  <MapPin className="text-amber-600 mr-2" size={24} />
                  Headquarters
                </h3>
                
                <div className="space-y-6 mb-8">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-gray-800 leading-relaxed font-medium">
                      Defence Raya Golf & Country Club,<br/>
                      Phase 6, DHA<br/>
                      Lahore, Pakistan
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Operating Hours</p>
                    <div className="flex items-start text-gray-600 text-sm">
                      <Clock size={16} className="mt-1 mr-2 text-amber-600" />
                      <div>
                        <p>Monday - Friday: 10:00 AM - 11:00 PM</p>
                        <p>Saturday: 10:00 AM - 9:00 PM</p>
                        <p className="text-red-500">Sunday: Closed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Styled Map Container */}
                <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 shadow-inner relative group">
                  {/* Actual Google Map Embed */}
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3403.468729598864!2d74.43719881514757!3d31.456345981390886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391908f9c5555555%3A0x6b8c8d0d8e8e8e8e!2sDefence%20Raya%20Golf%20%26%20Country%20Club!5e0!3m2!1sen!2s!4v1625680000000!5m2!1sen!2s" 
                    width="100%" 
                    height="100%" 
                    style={{border:0, filter: 'grayscale(100%) contrast(1.2)'}} 
                    allowFullScreen={true} 
                    loading="lazy"
                    className="group-hover:filter-none transition-all duration-500"
                    title="Defence Raya Map"
                  ></iframe>
                  
                  <div className="absolute bottom-4 left-4">
                     <a 
                      href="https://goo.gl/maps/YOUR_LINK_HERE" 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-white text-xs font-bold px-4 py-2 rounded shadow-lg hover:bg-gray-100 transition-colors flex items-center"
                    >
                      Open in Maps <ArrowRight size={12} className="ml-1" />
                    </a>
                  </div>
                </div>

                {/* Social Links (aligned with Footer) */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Follow Us</p>
                  <div className="flex space-x-4 items-center">
                    {/* Snapchat */}
                    <a href="https://www.snapchat.com/add/denfitdesigns?share_id=1bW2smAtGGw&locale=en-US" target="_blank" rel="noopener noreferrer" aria-label="Visit our Snapchat" className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-600 transition-all duration-300 rounded-full hover:scale-110">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C9.613 2 7.5 3.343 6.282 5.293 5.623 6.459 4.333 7 3 7v1c1.333 0 2.01.54 2.665 1.707C6.953 11.657 9.08 12.5 12 12.5c2.92 0 5.047-.843 6.335-2.793C18.99 8.54 19.667 8 21 8V7c-1.333 0-2.623-.541-3.282-1.707C16.5 3.343 14.387 2 12 2zM7.5 17.1c.9-.4 2.2-.9 4.5-.9 2.3 0 3.6.5 4.5.9.3.1.5.3.5.6v.5c0 .3-.2.6-.5.7-.9.5-2.2 1.1-4.5 1.1-2.3 0-3.6-.6-4.5-1.1-.3-.1-.5-.4-.5-.7v-.5c0-.3.2-.5.5-.6z" fill="currentColor"/>
                      </svg>
                    </a>

                    {/* Facebook */}
                    <a href="https://www.facebook.com/share/17RhiUapmV/" target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page" className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 rounded-full">
                      <Facebook size={18} />
                    </a>

                    {/* Instagram */}
                    <a href="https://www.instagram.com/denfitdesigns?igsh=NnM3MWVza3JudTNn" target="_blank" rel="noopener noreferrer" aria-label="Visit our Instagram" className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all duration-300 rounded-full">
                      <Instagram size={18} />
                    </a>

                    {/* Twitter / X */}
                    <a href="https://x.com/denfitdesigns" target="_blank" rel="noopener noreferrer" aria-label="Visit our Twitter" className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black transition-all duration-300 rounded-full">
                      <Twitter size={18} />
                    </a>

                    {/* YouTube (optional - footer has it) */}
                    <a href="https://youtube.com/@denfitcollection?si=23IsLRk3h7Rzmcrl" target="_blank" rel="noopener noreferrer" aria-label="Visit our YouTube channel" className="w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 rounded-full">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1-2.9-.2-7.2-.2-7.2-.2h-.1s-4.3 0-7.2.2c-.4.1-1.3.1-2.1 1-.6.7-.8 2.3-.8 2.3S2 7.9 2 9.6v1.7c0 1.7.4 3.4.4 3.4s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.7.2 7.1.2 7.1.2s4.3 0 7.2-.2c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.4-1.7.4-3.4V9.6c0-1.7-.4-3.4-.4-3.4z" fill="currentColor"/>
                        <path d="M9.8 15.1v-6.2l5.6 3.1-5.6 3.1z" fill="#fff"/>
                      </svg>
                    </a>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;