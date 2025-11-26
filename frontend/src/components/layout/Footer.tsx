// src/components/layout/Footer.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Youtube, ArrowUp } from "lucide-react";

export default function Footer() {
  const [showButton, setShowButton] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => setShowButton(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-black text-gray-300 dark:bg-gray-900 dark:text-gray-400 pt-12 pb-6 mt-12 transition-colors duration-500">
      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-wide">DENFiT</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">
            Redefining modern clothing. Premium, sustainable, and designed to empower your style.
          </p>
          <div className="flex gap-4 mt-4">
            {[{
              Icon: Facebook,
              href: 'https://facebook.com/denfit'
            }, {
              Icon: Instagram,
              href: 'https://instagram.com/denfit'
            }, {
              Icon: Twitter,
              href: 'https://twitter.com/denfit'
            }, {
              Icon: Youtube,
              href: 'https://youtube.com/denfit'
            }].map(({ Icon, href }, idx) => (
              <a key={idx} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visit our ${href.split('//')[1].split('.')[0]} page`} className="hover:text-white transition-transform transform hover:scale-110">
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Shop Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Shop</h3>
          <ul className="space-y-2">
            {["men", "women", "kids", "sale"].map((cat) => (
              <li key={cat}>
                <Link to={`/shop?gender=${cat}`} className="hover:text-white transition-colors">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Links */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
          <ul className="space-y-2">
            {[
              { label: "About Us", link: "/about" },
              { label: "Careers", link: "/careers" },
              { label: "Contact", link: "/contact" },
              { label: "Privacy Policy", link: "/privacy" },
            ].map((item) => (
              <li key={item.label}>
                <Link to={item.link} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* --- NEW ENHANCED NEWSLETTER SECTION (REPLACES OLD ONE) --- */}
        <div>
          <section className="bg-black">
            <div>
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 backdrop-blur-xl px-6 py-8">
                <div className="absolute -right-20 -bottom-20 h-52 w-52 rounded-full bg-gradient-to-tr from-rose-500/20 via-amber-400/10 to-emerald-300/0 blur-3xl pointer-events-none" />

                <div className="relative flex flex-col gap-6">
                  <div>
                    <p className="text-[10px] tracking-[0.30em] uppercase text-neutral-200 mb-2">
                      Denfit Circle
                    </p>
                    <h2 className="text-xl font-light tracking-[0.20em] mb-2 text-white">
                      JOIN THE DENFIT FAMILY
                    </h2>
                    <p className="text-xs text-neutral-100 mb-4">
                      Receive early access to drops, private sale invitations, and curated styling stories.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        alert("Thank you for subscribing to DENFiT!");
                      }}
                      className="flex flex-col gap-3"
                    >
                      <input
                        type="email"
                        placeholder="Email address"
                        required
                        className="flex-1 bg-black/40 border border-white/20 px-5 py-3 rounded-full focus:outline-none focus:border-white transition text-sm placeholder:text-neutral-500"
                      />
                      <button
                        type="submit"
                        className="bg-white text-black px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.22em] hover:bg-neutral-200 transition"
                      >
                        Join now
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 my-8"></div>

      {/* Bottom Footer */}
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
        <p>
          © {currentYear} <span className="text-white font-semibold">DENFiT</span>. All rights reserved.
        </p>
        <p className="mt-3 sm:mt-0">Crafted with ❤️ by the DENFiT Team</p>
      </div>

      {/* Floating Back-to-Top Button */}
      {showButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-6 bg-black text-white p-3 rounded-full shadow-lg hover:scale-110 hover:bg-gray-800 transition-transform duration-300"
          aria-label="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </footer>
  );
}
