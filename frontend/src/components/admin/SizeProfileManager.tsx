import React, { useState, useEffect } from 'react';
import { 
  Save, X, Plus, Trash2, Check, Globe, 
  Users, Shirt, Shoe, Package, Download, Upload 
} from 'lucide-react';

interface SizeProfile {
  id: string;
  name: string;
  categoryGroup: 'Clothing' | 'Footwear' | 'Accessories';
  gender: 'men' | 'women' | 'kids' | 'unisex';
  region: 'US' | 'EU' | 'UK' | 'PK' | 'International';
  sizes: Array<{
    value: string;
    label: string;
    order: number;
    measurements?: {
      chest?: string;
      waist?: string;
      hip?: string;
      length?: string;
      footLength?: string;
    };
  }>;
  isDefault: boolean;
  isActive: boolean;
}

const SizeProfileManager: React.FC = () => {
  const [profiles, setProfiles] = useState<SizeProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SizeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const defaultProfiles: SizeProfile[] = [
    {
      id: 'clothing-men-default',
      name: 'Men Clothing Standard',
      categoryGroup: 'Clothing',
      gender: 'men',
      region: 'International',
      isDefault: true,
      isActive: true,
      sizes: [
        { value: 'XS', label: 'X-Small', order: 1 },
        { value: 'S', label: 'Small', order: 2 },
        { value: 'M', label: 'Medium', order: 3 },
        { value: 'L', label: 'Large', order: 4 },
        { value: 'XL', label: 'X-Large', order: 5 },
        { value: 'XXL', label: 'XX-Large', order: 6 },
        { value: 'XXXL', label: 'XXX-Large', order: 7 }
      ]
    },
    {
      id: 'clothing-women-default',
      name: 'Women Clothing Standard',
      categoryGroup: 'Clothing',
      gender: 'women',
      region: 'International',
      isDefault: true,
      isActive: true,
      sizes: [
        { value: 'XS', label: 'X-Small', order: 1 },
        { value: 'S', label: 'Small', order: 2 },
        { value: 'M', label: 'Medium', order: 3 },
        { value: 'L', label: 'Large', order: 4 },
        { value: 'XL', label: 'X-Large', order: 5 },
        { value: 'XXL', label: 'XX-Large', order: 6 }
      ]
    },
    {
      id: 'footwear-men-eu',
      name: 'Men Shoes EU Sizes',
      categoryGroup: 'Footwear',
      gender: 'men',
      region: 'EU',
      isDefault: true,
      isActive: true,
      sizes: [
        { value: '39', label: '39 EU', order: 1 },
        { value: '40', label: '40 EU', order: 2 },
        { value: '41', label: '41 EU', order: 3 },
        { value: '42', label: '42 EU', order: 4 },
        { value: '43', label: '43 EU', order: 5 },
        { value: '44', label: '44 EU', order: 6 },
        { value: '45', label: '45 EU', order: 7 },
        { value: '46', label: '46 EU', order: 8 }
      ]
    },
    {
      id: 'footwear-women-eu',
      name: 'Women Shoes EU Sizes',
      categoryGroup: 'Footwear',
      gender: 'women',
      region: 'EU',
      isDefault: true,
      isActive: true,
      sizes: [
        { value: '35', label: '35 EU', order: 1 },
        { value: '36', label: '36 EU', order: 2 },
        { value: '37', label: '37 EU', order: 3 },
        { value: '38', label: '38 EU', order: 4 },
        { value: '39', label: '39 EU', order: 5 },
        { value: '40', label: '40 EU', order: 6 },
        { value: '41', label: '41 EU', order: 7 }
      ]
    },
    {
      id: 'accessories-unisex',
      name: 'Accessories Standard',
      categoryGroup: 'Accessories',
      gender: 'unisex',
      region: 'International',
      isDefault: true,
      isActive: true,
      sizes: [
        { value: 'ONE_SIZE', label: 'One Size', order: 1 },
        { value: 'S', label: 'Small', order: 2 },
        { value: 'M', label: 'Medium', order: 3 },
        { value: 'L', label: 'Large', order: 4 }
      ]
    }
  ];

  useEffect(() => {
    setProfiles(defaultProfiles);
  }, []);

  const addNewProfile = () => {
    const newProfile: SizeProfile = {
      id: `custom-${Date.now()}`,
      name: 'New Size Profile',
      categoryGroup: 'Clothing',
      gender: 'unisex',
      region: 'International',
      sizes: [{ value: 'S', label: 'Small', order: 1 }],
      isDefault: false,
      isActive: true
    };
    setProfiles([...profiles, newProfile]);
    setSelectedProfile(newProfile);
    setIsEditing(true);
  };

  const updateProfile = (updatedProfile: SizeProfile) => {
    setProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p));
    setSelectedProfile(updatedProfile);
  };

  const addSizeToProfile = () => {
    if (!selectedProfile) return;
    const newSize = { value: `SIZE_${selectedProfile.sizes.length + 1}`, label: 'New Size', order: selectedProfile.sizes.length + 1 };
    const updated = { ...selectedProfile, sizes: [...selectedProfile.sizes, newSize] };
    updateProfile(updated);
  };

  const removeSizeFromProfile = (index: number) => {
    if (!selectedProfile) return;
    const updatedSizes = selectedProfile.sizes.filter((_, i) => i !== index);
    updateProfile({ ...selectedProfile, sizes: updatedSizes });
  };

  const setAsDefaultForCategory = (profileId: string) => {
    const updatedProfiles = profiles.map(profile => ({ ...profile, isDefault: profile.id === profileId }));
    setProfiles(updatedProfiles);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Size Profile Manager</h2>
          <p className="text-gray-600">Manage size standards for different product categories</p>
        </div>
        <button onClick={addNewProfile} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" />New Profile</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Available Profiles</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {profiles.map(profile => (
                <div key={profile.id} onClick={() => setSelectedProfile(profile)} className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedProfile?.id === profile.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{profile.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">{profile.categoryGroup === 'Clothing' && <Shirt className="w-3 h-3" />}{profile.categoryGroup}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{profile.gender}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{profile.region}</span>
                      </div>
                    </div>
                    {profile.isDefault && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{profile.sizes.length} sizes</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedProfile ? (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{isEditing ? 'Edit Profile' : 'View Profile'}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">{isEditing ? 'Cancel' : 'Edit'}</button>
                  <button onClick={() => setAsDefaultForCategory(selectedProfile.id)} className={`px-4 py-2 rounded-lg ${selectedProfile.isDefault ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{selectedProfile.isDefault ? 'Default Profile' : 'Set as Default'}</button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Profile Name</label>
                      <input type="text" value={selectedProfile.name} onChange={(e) => updateProfile({ ...selectedProfile, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category Group</label>
                      <select value={selectedProfile.categoryGroup} onChange={(e) => updateProfile({ ...selectedProfile, categoryGroup: e.target.value as any })} className="w-full border rounded-lg px-3 py-2"><option value="Clothing">Clothing</option><option value="Footwear">Footwear</option><option value="Accessories">Accessories</option></select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Gender</label>
                      <select value={selectedProfile.gender} onChange={(e) => updateProfile({ ...selectedProfile, gender: e.target.value as any })} className="w-full border rounded-lg px-3 py-2"><option value="men">Men</option><option value="women">Women</option><option value="kids">Kids</option><option value="unisex">Unisex</option></select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Region</label>
                      <select value={selectedProfile.region} onChange={(e) => updateProfile({ ...selectedProfile, region: e.target.value as any })} className="w-full border rounded-lg px-3 py-2"><option value="US">US</option><option value="EU">EU</option><option value="UK">UK</option><option value="PK">PK</option><option value="International">International</option></select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Sizes</h4>
                      <button onClick={addSizeToProfile} className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"><Plus className="w-4 h-4" />Add Size</button>
                    </div>
                    <div className="space-y-3">
                      {selectedProfile.sizes.map((size, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Value</label>
                              <input type="text" value={size.value} onChange={(e) => { const updated = [...selectedProfile.sizes]; updated[index] = { ...size, value: e.target.value }; updateProfile({ ...selectedProfile, sizes: updated }); }} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Label</label>
                              <input type="text" value={size.label} onChange={(e) => { const updated = [...selectedProfile.sizes]; updated[index] = { ...size, label: e.target.value }; updateProfile({ ...selectedProfile, sizes: updated }); }} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                          </div>
                          <button onClick={() => removeSizeFromProfile(index)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="w-5 h-5" />Save Profile</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm text-gray-600">Category</div><div className="font-medium">{selectedProfile.categoryGroup}</div></div>
                    <div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm text-gray-600">Gender</div><div className="font-medium capitalize">{selectedProfile.gender}</div></div>
                    <div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm text-gray-600">Region</div><div className="font-medium">{selectedProfile.region}</div></div>
                    <div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm text-gray-600">Status</div><div className="font-medium">{selectedProfile.isDefault ? 'Default' : 'Custom'}</div></div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Size Preview</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.sizes.map((size, index) => (
                        <div key={index} className="px-4 py-2 border border-gray-300 rounded-lg bg-white"><div className="font-medium">{size.label}</div><div className="text-xs text-gray-500">Value: {size.value}</div></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Shirt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Selected</h3>
              <p className="text-gray-600">Select a profile from the list or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SizeProfileManager;
