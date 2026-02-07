'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { MobileBottomNav, PageHeader } from '@/components/common';
import { CropCard, VideoModal, ComingSoonModal } from '@/components/knowledge';
import { Input } from '@/components/ui/input';
import { IconSearch } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  getFeaturedCrops,
  getOtherCrops,
  searchCrops,
  type CropData,
} from '@/constants/knowledge-hub';

export default function KnowledgePage() {
  // State for search, language, and modals
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  const [userLanguage, setUserLanguage] = useState('en');

  // Fetch user's language preference
  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const phone = localStorage.getItem('userPhone');
        if (!phone) return;

        const response = await fetch(`/api/user/me?phone=${phone}`);
        const data = await response.json();

        if (data.success && data.user?.language) {
          setUserLanguage(data.user.language);
        }
      } catch (err) {
        console.error('Error fetching user language:', err);
      }
    };

    fetchLanguage();
  }, []);

  // Get featured and other crops based on user language
  const featuredCrops = useMemo(() => getFeaturedCrops(userLanguage), [userLanguage]);
  const otherCrops = useMemo(() => getOtherCrops(userLanguage), [userLanguage]);

  // Filter crops based on search query
  const filteredCrops = useMemo(() => {
    if (!searchQuery.trim()) {
      return { featured: featuredCrops, other: otherCrops };
    }
    const filtered = searchCrops(searchQuery, userLanguage);
    return {
      featured: filtered.filter(c => c.videoUrl),
      other: filtered.filter(c => !c.videoUrl),
    };
  }, [searchQuery, featuredCrops, otherCrops, userLanguage]);

  // Handle crop card click
  const handleCropClick = useCallback((crop: CropData) => {
    setSelectedCrop(crop);
    if (crop.videoUrl) {
      setIsVideoModalOpen(true);
    } else {
      setIsComingSoonModalOpen(true);
    }
  }, []);

  // Close modals
  const closeVideoModal = useCallback(() => {
    setIsVideoModalOpen(false);
    setSelectedCrop(null);
  }, []);

  const closeComingSoonModal = useCallback(() => {
    setIsComingSoonModalOpen(false);
    setSelectedCrop(null);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-20 md:pb-0">
      {/* Header */}
      <PageHeader />

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-0 pt-4">
        {/* Search Box */}
        <div className="relative mb-3 sm:mb-4">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search crops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'pl-10 pr-4 py-3 h-12',
              'bg-white dark:bg-gray-950',
              'border border-gray-200 dark:border-gray-800',
              'rounded-xl',
              'text-base',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-0'
            )}
          />
        </div>

        {/* Featured Crops Section */}
        {filteredCrops.featured.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Featured Crops
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Video tutorials available)
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {filteredCrops.featured.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  onClick={handleCropClick}
                  hasVideo={true}
                  isSelected={selectedCrop?.id === crop.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Crops Section */}
        {filteredCrops.other.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              All Crops
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {filteredCrops.other.map((crop) => (
                <CropCard
                  key={crop.id}
                  crop={crop}
                  onClick={handleCropClick}
                  hasVideo={false}
                  isSelected={selectedCrop?.id === crop.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state when no crops match search */}
        {filteredCrops.featured.length === 0 && filteredCrops.other.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconSearch className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No crops found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try searching for a different crop name
            </p>
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selectedCrop?.videoUrl && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={closeVideoModal}
          videoUrl={selectedCrop.videoUrl}
          cropName={selectedCrop.name}
        />
      )}

      {/* Coming Soon Modal */}
      {selectedCrop && !selectedCrop.videoUrl && (
        <ComingSoonModal
          isOpen={isComingSoonModalOpen}
          onClose={closeComingSoonModal}
          cropName={selectedCrop.name}
          cropIcon={selectedCrop.icon}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
