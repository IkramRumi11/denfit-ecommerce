// src/components/layout/MegaMenu.tsx
// No default React import required here (using modern JSX transform)
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { megaMenuData } from "../../data/megaMenuData";
import { slugify } from '../../utils/productHelpers';

type Props = {
  activeCategory: string | null;
  onClose: () => void;
};

const backdropVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariant = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

export default function MegaMenu({ activeCategory, onClose }: Props) {
  if (!activeCategory) return null;
  const data = (megaMenuData as any)[activeCategory];
  if (!data) return null;

  // Use react-router `Link` in callers for SPA navigation; no absolute URL needed here.

  return (
    <AnimatePresence>
      {/* Backdrop (blur + dim) */}
      <motion.div
        key="mega-backdrop"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={backdropVariant}
        transition={{ duration: 0.18 }}
        className="absolute inset-x-0 top-full z-40 pointer-events-auto"
        style={{ top: "4rem" }} // make sure menu sits below header (header height = h-16)
        onClick={onClose}
      >
        {/* backdrop that blurs the content under the menu */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
      </motion.div>

      {/* Panel */}
      <motion.div
        key={`mega-panel-${activeCategory}`}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={panelVariant}
        transition={{ duration: 0.20 }}
        className="absolute left-0 right-0 top-full z-50"
        onMouseLeave={onClose}
      >
        <div className="max-w-7xl mx-auto px-6 py-8 bg-white shadow-md rounded-b-md">
          <div className="grid grid-cols-4 gap-8">
            {/* columns of categories */}
            {Object.entries(data.categories).map(([section, items]) => (
              <div key={section}>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{section}</h4>
                <ul className="space-y-2">
                  {(items as string[]).map((item) => {
                    const sectionSlug = String(slugify(section || ''))?.toLowerCase();
                    // If the section is an explicit gender (Men/Women/Kids), use that as gender param
                    const genderForLink = ['men', 'women', 'kids'].includes(sectionSlug) ? sectionSlug : String(activeCategory);
                    return (
                      <li key={item}>
                        <Link
                          to={`/shop?gender=${genderForLink}&type=${encodeURIComponent(slugify(item))}`}
                          className="text-gray-600 hover:text-black transition-colors"
                          onClick={onClose}
                        >
                          {item}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* featured card */}
            <div className="col-span-1 flex flex-col items-center justify-center text-center border-l pl-6">
              <img
                src={data.featured.image}
                alt={data.featured.title}
                className="w-full rounded-lg object-cover mb-4 h-40"
              />
              <h5 className="font-semibold text-gray-800 mb-2">{data.featured.title}</h5>
              <Link
                to={String(data.featured.link || '/')}
                onClick={onClose}
                className="inline-block px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-900 transition"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
