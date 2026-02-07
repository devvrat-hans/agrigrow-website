'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MobileBottomNav,
  PageHeader,
  LoadingSpinner,
  ErrorState,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  ProfileHeader,
  ProfileDetailsCard,
  ProfileMenuList,
  FarmerProfileCards,
  StudentProfileCards,
  BusinessProfileCards,
  MyPostsCard,
} from '@/components/profile';
import {
  IconSettings,
  IconEdit,
  IconLanguage,
  IconLogout,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react';

interface UserData {
  fullName: string;
  phone: string;
  bio?: string;
  role: 'farmer' | 'student' | 'business';
  language: string;
  state?: string;
  district?: string;
  crops?: string[];
  interests?: string[];
  studentDegree?: string;
  collegeName?: string;
  yearOfStudy?: string;
  studentBackground?: string;
  studentInterests?: string[];
  studentPurposes?: string[];
  organizationType?: string;
  businessFocusAreas?: string[];
  createdAt?: string;
  profileImage?: string;
  followersCount?: number;
  followingCount?: number;
  trustScore?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const storedPhone = localStorage.getItem('userPhone');
      
      if (!storedPhone) {
        router.push('/auth/signin');
        return;
      }

      const response = await fetch(`/api/user/me?phone=${storedPhone}`);
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || 'Failed to load profile');
        if (data.error === 'User not found') {
          router.push('/auth/signin');
        }
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userPhone');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.clear();
    }
    router.push('/auth/signin');
  };

  const menuItems = [
    { id: 'edit', icon: IconEdit, label: 'Edit Profile', onClick: () => router.push('/profile/edit') },
    { id: 'feed-preferences', icon: IconAdjustmentsHorizontal, label: 'Feed Preferences', onClick: () => router.push('/feed-preferences') },
    { id: 'language', icon: IconLanguage, label: 'Language Settings', onClick: () => router.push('/profile/language') },
    { id: 'settings', icon: IconSettings, label: 'App Settings', onClick: () => router.push('/profile/settings') },
  ];

  // Loading state
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Error state
  if (error && !user) {
    return (
      <ErrorState
        message={error}
        actionLabel="Sign In Again"
        onAction={() => router.push('/auth/signin')}
        fullScreen
      />
    );
  }

  // No user state
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader
        rightAction={
          <Button variant="ghost" size="sm" className="min-w-[44px] min-h-[44px]">
            <IconSettings className="w-5 h-5" />
          </Button>
        }
      />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
        {/* Profile Header with Follow Stats and Trust Score */}
        <ProfileHeader
          userPhone={user.phone}
          fullName={user.fullName}
          displayPhone={user.phone}
          bio={user.bio}
          role={user.role}
          avatarUrl={user.profileImage}
          isOwnProfile={true}
          followersCount={user.followersCount || 0}
          followingCount={user.followingCount || 0}
          trustScore={user.trustScore || 425}
        />

        {/* Details Card */}
        <ProfileDetailsCard
          state={user.state}
          district={user.district}
          language={user.language}
        />

        {/* Role-specific Cards */}
        {user.role === 'farmer' && (
          <FarmerProfileCards
            crops={user.crops}
            interests={user.interests}
          />
        )}

        {user.role === 'student' && (
          <StudentProfileCards
            degree={user.studentDegree}
            collegeName={user.collegeName}
            yearOfStudy={user.yearOfStudy}
            background={user.studentBackground}
            interests={user.studentInterests}
            purposes={user.studentPurposes}
          />
        )}

        {user.role === 'business' && (
          <BusinessProfileCards
            organizationType={user.organizationType}
            focusAreas={user.businessFocusAreas}
          />
        )}

        {/* My Posts Card */}
        <MyPostsCard userPhone={user.phone} />

        {/* Menu Items */}
        <ProfileMenuList items={menuItems} />

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full min-h-[44px] sm:min-h-[40px] text-destructive hover:text-destructive active:scale-[0.98] transition-transform"
          onClick={handleLogout}
        >
          <IconLogout className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </main>

      <MobileBottomNav />
    </div>
  );
}
