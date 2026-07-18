import React, { useState, useRef, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  Users, 
  Target, 
  Heart, 
  ArrowUpRight, 
  Sparkles, 
  ChevronRight, 
  Building, 
  Leaf, 
  TrendingUp, 
  Coffee,
  X,
  Send
} from 'lucide-react';

// --- DATA CONFIGURATION ---
const JOBS_DATA = [
  {
    id: 1,
    title: "SENIOR FASHION DESIGNER",
    department: "DESIGN & CREATIVE",
    location: "LAHORE, PK",
    type: "FULL-TIME",
    experience: "5+ YEARS"
  },
  {
    id: 2,
    title: "DIGITAL MARKETING SPECIALIST",
    department: "MARKETING",
    location: "REMOTE",
    type: "FULL-TIME",
    experience: "3+ YEARS"
  },
  {
    id: 3,
    title: "SUSTAINABILITY ANALYST",
    department: "OPERATIONS",
    location: "LAHORE, PK",
    type: "FULL-TIME",
    experience: "2+ YEARS"
  },
  {
    id: 4,
    title: "FRONTEND DEVELOPER",
    department: "TECHNOLOGY",
    location: "REMOTE",
    type: "FULL-TIME",
    experience: "3+ YEARS"
  },
  {
    id: 5,
    title: "RETAIL STORE MANAGER",
    department: "RETAIL",
    location: "LAHORE, PK",
    type: "FULL-TIME",
    experience: "4+ YEARS"
  }
];

export const Careers = () => {
  // --- STATE MANAGEMENT ---
  const [selectedDept, setSelectedDept] = useState('ALL DEPARTMENTS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applyingFor, setApplyingFor] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastMailto, setLastMailto] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    message: ''
  });

  // Refs for Smooth Scrolling
  const jobsSectionRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    let original = '';
    if (isModalOpen || successOpen) {
      original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
    return () => {};
  }, [isModalOpen, successOpen]);

  // --- HANDLERS ---

  // Scroll to jobs section
  const scrollToJobs = () => {
    jobsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Open Application Modal
  const openApplication = (jobTitle = "General Application") => {
    setApplyingFor(jobTitle);
    setIsModalOpen(true);
  };

  // Handle Form Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Form Submission (Mailto Logic)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct the email body
    const subject = `Application for ${applyingFor} - ${formData.name}`;
    const body = `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
LinkedIn/Portfolio: ${formData.linkedin}
    
Message:
${formData.message}
    `;

    // Prepare mailto href and open user's email client
    const mailto = `mailto:denfitcareers@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setLastMailto(mailto);
    // Attempt to open mail client
    try {
      window.location.href = mailto;
    } catch (e) {
      // fallback: do nothing, user can press button in confirmation modal
    }

    // Show an in-page confirmation modal instead of alert
    setSuccessOpen(true);
    setIsModalOpen(false);
    setFormData({ name: '', email: '', phone: '', linkedin: '', message: '' });
  };

  // Filter Logic
  const filteredJobs = selectedDept === 'ALL DEPARTMENTS' 
    ? JOBS_DATA 
    : JOBS_DATA.filter(job => job.department === selectedDept);

  return (
    <div className="min-h-screen bg-white relative">
      
      {/* --- APPLICATION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-lg shadow-2xl rounded-none border-t-4 border-amber-600 animate-in fade-in zoom-in duration-300">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-light text-gray-900 uppercase tracking-wide">
                  Apply for <span className="text-amber-600 font-normal block text-lg mt-1">{applyingFor}</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    required 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    type="text" 
                    className="w-full border-b border-gray-300 py-2 focus:border-amber-600 focus:outline-none transition-colors" 
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    required 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    type="email" 
                    className="w-full border-b border-gray-300 py-2 focus:border-amber-600 focus:outline-none transition-colors" 
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                    <input 
                      required 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      type="tel" 
                      className="w-full border-b border-gray-300 py-2 focus:border-amber-600 focus:outline-none transition-colors" 
                      placeholder="+92..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">LinkedIn / Portfolio</label>
                    <input 
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      type="text" 
                      className="w-full border-b border-gray-300 py-2 focus:border-amber-600 focus:outline-none transition-colors" 
                      placeholder="URL"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Why You?</label>
                  <textarea 
                    required 
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={3} 
                    className="w-full border-b border-gray-300 py-2 focus:border-amber-600 focus:outline-none transition-colors resize-none" 
                    placeholder="Briefly tell us about your experience..."
                  ></textarea>
                </div>

                <div className="pt-4">
                  <p className="text-xs text-gray-400 mb-4 italic">
                    * Clicking submit will open your email client to send your details to denfitcareers@gmail.com. Please attach your CV there.
                  </p>
                  <button type="submit" className="w-full bg-gray-900 text-white hover:bg-amber-600 py-4 uppercase tracking-[0.26em] text-sm font-bold transition-colors duration-300 flex items-center justify-center gap-2">
                    Submit Application <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBMISSION CONFIRMATION MODAL (IN-PAGE) --- */}
      {successOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md shadow-2xl rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Send className="text-amber-600" size={28} />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-light text-gray-900 mb-2">Drafting email...</h4>
                <p className="text-sm text-gray-600 mb-4">Please attach your resume in the mail client that opens. You can also manually open the mail client if it didn't open automatically.</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { if (lastMailto) window.location.href = lastMailto; }} className="px-4 py-2 bg-amber-600 text-white rounded">Open Mail Client</button>
                  <button onClick={() => setSuccessOpen(false)} className="px-4 py-2 border border-gray-200 rounded">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-50 to-white py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-2/3 mb-12 lg:mb-0">
              <div className="inline-flex items-center px-4 py-2 bg-amber-50 rounded-full mb-8">
                <Sparkles size={16} className="text-amber-600 mr-2" />
                <span className="text-amber-700 text-sm tracking-wide">NOW HIRING IN LAHORE</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-light tracking-[0.2em] mb-8 text-gray-900 uppercase">
                Shape The Future
                <br />
                <span className="text-amber-600 font-thin">Of Fashion</span>
              </h1>
              
              <p className="text-gray-600 text-lg font-light leading-relaxed max-w-2xl mb-10">
                Join a team redefining urban fashion through innovation, sustainability, and exceptional craftsmanship. At DENFIT, we don't just make clothes—we create experiences that empower confidence.
              </p>
              
              <button 
                onClick={scrollToJobs}
                className="group border border-gray-900 hover:bg-gray-900 text-gray-900 hover:text-white font-light py-4 px-8 rounded-none transition-all duration-300 flex items-center"
              >
                <span className="tracking-wider">VIEW OPEN POSITIONS</span>
                <ArrowUpRight className="ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />
              </button>
            </div>
            
            <div className="lg:w-1/3">
              <div className="relative">
                <div className="w-64 h-64 bg-gradient-to-tr from-amber-100 to-transparent"></div>
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="DENFIT Team" 
                  className="absolute top-0 left-0 w-64 h-64 object-cover mix-blend-multiply shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why DENFIT Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-thin tracking-wider mb-6 text-gray-900 uppercase">
              Why Build Your Career
              <br />
              <span className="text-amber-600">With Us</span>
            </h2>
            <p className="text-gray-500 font-light text-lg max-w-2xl mx-auto">
              We cultivate an environment where creativity meets purpose, and every contribution shapes our collective success.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "PURPOSE-DRIVEN WORK",
                description: "Contribute to sustainable fashion initiatives that make a tangible difference in our industry and communities."
              },
              {
                icon: Users,
                title: "COLLABORATIVE CULTURE",
                description: "Work alongside passionate innovators in an environment that values diverse perspectives and collective growth."
              },
              {
                icon: Target,
                title: "IMPACTFUL INNOVATION",
                description: "Push boundaries with cutting-edge design and technology that sets new standards in urban fashion."
              },
              {
                icon: Leaf,
                title: "SUSTAINABLE FUTURE",
                description: "Join our commitment to carbon-neutral operations and ethical practices throughout our supply chain."
              },
              {
                icon: TrendingUp,
                title: "GROWTH OPPORTUNITIES",
                description: "Access continuous learning, mentorship programs, and clear pathways for professional advancement."
              },
              {
                icon: Coffee,
                title: "QUALITY OF LIFE",
                description: "Enjoy flexible arrangements, wellness initiatives, and a balanced approach to work and life."
              }
            ].map((item, index) => (
              <div key={index} className="group p-8 border border-gray-100 hover:border-amber-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-14 h-14 bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center mb-6 transition-colors duration-300">
                  <item.icon className="text-amber-600" size={24} />
                </div>
                <h3 className="text-xl font-light tracking-[0.26em] mb-4 text-gray-900 uppercase">
                  {item.title}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Openings - WITH FUNCTIONAL FILTER & SCROLL */}
      <section ref={jobsSectionRef} className="bg-gray-50 py-20 px-4 scroll-mt-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
            <div>
              <h2 className="text-4xl font-thin tracking-wider mb-4 text-gray-900 uppercase">
                Current Openings
              </h2>
              <p className="text-gray-500 font-light">
                Explore opportunities to join our growing team in Lahore
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 font-light py-3 px-6 appearance-none focus:outline-none focus:border-amber-300 w-64 cursor-pointer"
              >
                <option>ALL DEPARTMENTS</option>
                <option>DESIGN & CREATIVE</option>
                <option>TECHNOLOGY</option>
                <option>MARKETING</option>
                <option>OPERATIONS</option>
                <option>RETAIL</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div 
                  key={job.id} 
                  onClick={() => openApplication(job.title)}
                  className="group bg-white hover:bg-amber-50 border border-gray-100 hover:border-amber-200 p-6 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    <div className="mb-4 lg:mb-0 lg:w-2/3">
                      <h3 className="text-xl font-light tracking-wider mb-2 text-gray-900 group-hover:text-amber-700 transition-colors uppercase">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        <span className="inline-flex items-center text-gray-500 font-light text-sm">
                          <Building size={14} className="mr-1" />
                          {job.department}
                        </span>
                        <span className="inline-flex items-center text-gray-500 font-light text-sm">
                          <MapPin size={14} className="mr-1" />
                          {job.location}
                        </span>
                        <span className="inline-flex items-center text-gray-500 font-light text-sm">
                          <Clock size={14} className="mr-1" />
                          {job.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between lg:justify-end">
                      <span className="text-gray-500 font-light text-sm mr-6">
                        {job.experience}
                      </span>
                      <button className="flex items-center text-amber-600 font-medium text-sm group-hover:translate-x-2 transition-transform duration-300">
                        APPLY <ChevronRight className="ml-1" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 font-light">
                No open positions in this department currently. <br/>
                <button onClick={() => setSelectedDept('ALL DEPARTMENTS')} className="text-amber-600 underline mt-2 hover:text-amber-700">View all jobs</button>
              </div>
            )}
          </div>
          
          <div className="text-center mt-12">
            <button 
              onClick={() => setSelectedDept('ALL DEPARTMENTS')}
              className="text-gray-900 hover:text-amber-700 font-light border-b border-transparent hover:border-amber-700 pb-1 transition-all duration-300 tracking-wider"
            >
              VIEW ALL POSITIONS
            </button>
          </div>
        </div>
      </section>

      {/* Life at DENFIT */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-thin tracking-wider mb-8 text-gray-900 uppercase">
                Life At Denfit
              </h2>
              <p className="text-gray-600 font-light leading-relaxed mb-8 text-lg">
                Our workspace in Lahore is designed to inspire creativity and collaboration. From our sustainable materials lab to our rooftop garden, every space encourages innovation and connection.
              </p>
              <div className="space-y-6">
                {[
                  { id: "01", title: "COLLABORATIVE STUDIOS", desc: "Open-concept design spaces where ideas flow freely between departments." },
                  { id: "02", title: "WELLNESS FOCUS", desc: "Yoga studios, meditation rooms, and comprehensive health benefits." },
                  { id: "03", title: "LEARNING LABS", desc: "Regular workshops, guest lectures, and skill development sessions." }
                ].map((item) => (
                  <div key={item.id} className="flex items-start">
                    <div className="w-10 h-10 bg-amber-50 flex items-center justify-center mr-4 shrink-0">
                      <span className="text-amber-600 font-light">{item.id}</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-light tracking-wider mb-2 text-gray-900 uppercase">
                        {item.title}
                      </h4>
                      <p className="text-gray-500 font-light">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="DENFIT Office Space" 
                className="w-full h-64 object-cover hover:opacity-90 transition-opacity"
              />
              <img 
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Team Collaboration" 
                className="w-full h-64 object-cover mt-8 hover:opacity-90 transition-opacity"
              />
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Design Studio" 
                className="w-full h-64 object-cover hover:opacity-90 transition-opacity"
              />
              <img 
                src="https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Creative Meeting" 
                className="w-full h-64 object-cover mt-8 hover:opacity-90 transition-opacity"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="bg-gray-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-thin tracking-wider mb-16 text-center uppercase">
            Our Application Process
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "APPLICATION REVIEW",
                description: "Our talent team carefully reviews every submission within 5-7 business days."
              },
              {
                step: "02",
                title: "INITIAL CONVERSATION",
                description: "A 30-minute video call to discuss your experience and mutual expectations."
              },
              {
                step: "03",
                title: "SKILL ASSESSMENT",
                description: "A practical task or case study relevant to the position you're applying for."
              },
              {
                step: "04",
                title: "TEAM INTERVIEWS",
                description: "Meetings with potential colleagues and department leaders."
              }
            ].map((process, index) => (
              <div key={index} className="relative group">
                <div className="text-amber-300 text-6xl font-light mb-6 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  {process.step}
                </div>
                <h3 className="text-lg font-light tracking-wider mb-4 uppercase text-amber-500">
                  {process.title}
                </h3>
                <p className="text-gray-300 font-light leading-relaxed text-sm">
                  {process.description}
                </p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-10 right-0 w-8 h-px bg-gray-700"></div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <p className="text-gray-300 font-light mb-8 max-w-2xl mx-auto">
              We value diversity and encourage applications from all qualified individuals regardless of background. At DENFIT, we believe different perspectives make us stronger.
            </p>
            <button 
              onClick={() => openApplication('General Application')}
              className="group border border-white hover:bg-white text-white hover:text-gray-900 font-light py-4 px-12 rounded-none transition-all duration-300"
            >
              <span className="tracking-wider">START YOUR APPLICATION</span>
              <ArrowUpRight className="inline ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;