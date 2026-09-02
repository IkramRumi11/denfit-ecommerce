import { useState, useEffect } from 'react';
import { filtersAPI } from '../api';

export const useCategoryConfigs = (
  category: string,
  subcategory: string,
  attributes: Record<string, string[]> = {},
  onChangeAttributes?: (attrs: Record<string, string[]>) => void
) => {
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);
  const [dynamicFilterGroups, setDynamicFilterGroups] = useState<any[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchSubcategories = async () => {
      setLoading(true);
      try {
        const res: any = await filtersAPI.getConfigs();
        const allConfigs = Array.isArray(res?.data || res) ? (res?.data || res) : [];
        const gender = category || '';
        const matching = allConfigs.filter((c: any) =>
          !c.gender || c.gender === gender || gender === 'sale' || gender === 'accessories'
        );
        const slugs = [...new Set(matching.map((c: any) => c.categorySlug))];
        if (mounted) setAvailableSubcategories(slugs.sort());
      } catch (e) {
        console.error('Failed to load subcategories:', e);
        if (mounted) setAvailableSubcategories([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSubcategories();
    return () => { mounted = false; };
  }, [category]);

  const serializedAttrs = JSON.stringify(attributes || {});

  useEffect(() => {
    let mounted = true;
    if (!subcategory) {
      setDynamicFilterGroups([]);
      setDynamicAttributes({});
      return;
    }
    const fetchFilterGroups = async () => {
      try {
        const res: any = await filtersAPI.getConfig(subcategory, category);
        const config = res?.data || res;
        const groups = config?.filterGroups || config?.groups || [];
        const resolved = groups.map((fg: any) => {
          const group = typeof fg.filterGroup === 'object' ? fg.filterGroup : fg;
          return group;
        }).filter((g: any) => g && g.name);
        if (mounted) {
          setDynamicFilterGroups(resolved);
          let currentAttrs: Record<string, string[]> = {};
          try {
            currentAttrs = JSON.parse(serializedAttrs || '{}');
          } catch (e) {}
          const init: Record<string, string[]> = {};
          resolved.forEach((g: any) => {
            init[g.slug] = currentAttrs[g.slug] || [];
          });
          setDynamicAttributes(init);
        }
      } catch (e) {
        console.error('Failed to load filter config:', e);
        if (mounted) {
          setDynamicFilterGroups([]);
          setDynamicAttributes({});
        }
      }
    };
    fetchFilterGroups();
    return () => { mounted = false; };
  }, [subcategory, category, serializedAttrs]);

  useEffect(() => {
    if (onChangeAttributes) {
      const cleaned: Record<string, string[]> = {};
      Object.entries(dynamicAttributes).forEach(([k, v]) => {
        if (v && v.length > 0) cleaned[k] = v;
      });
      onChangeAttributes(cleaned);
    }
  }, [dynamicAttributes]);

  return {
    availableSubcategories,
    dynamicFilterGroups,
    dynamicAttributes,
    setDynamicAttributes,
    loading
  };
};
