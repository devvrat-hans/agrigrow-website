'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  MobileBottomNav,
  PageHeader,
  LoadingSpinner,
  ErrorState,
} from '@/components/common';
import {
  ProfileHeader,
  ProfileDetailsCard,
  FarmerProfileCards,
  StudentProfileCards,
  BusinessProfileCards,
  MyPostsCard,
} from '@/components/profile';

interface UserProfile {
  _id: string;
  phone: string;
  fullName: string;
  profileImage?: string;
  role: 'farmer' | 'student' | 'business';
  bio?: string;
  state?: string;
  district?: string;
  experienceLevel?: string;
  language?: string;
  // Farmer-specific
  crops?: string[];
  interests?: string[];
  // Student-specific
  studentDegree?: string;
  collegeName?: string;
  yearOfStudy?: string;
  studentBackground?: string;
  studentInterests?: string[];
  studentPurposes?: string[];
  // Business-specific
  organizationType?: string;
  businessFocusAreas?: string[];
  // Meta
  createdAt?: string;
  followersCount?: number;
  followingCount?: number;
  trustScore?: number;
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { userId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const storedPhone = localStorage.getItem('userPhone');
      
      if (!storedPhone) {
        router.push('/auth/signin');
        return;
      }

      const response = await fetch(`/api/user/${userId}`, {
        headers: {
          'x-user-phone': storedPhone,
        },
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        
        // Check if this is the current user's own profile
        const meResponse = await fetch(`/api/user/me?phone=${storedPhone}`);
        const meData = await meResponse.json();
        if (meData.success && meData.user?.id === userId) {
          setIsOwnProfile(true);
        }
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to own profile page if viewing own profile
  useEffect(() => {
    if (isOwnProfile) {
      router.replace('/profile');
    }
  }, [isOwnProfile, router]);

  // Loading state
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Error state
  if (error && !user) {
    return (
      <ErrorState
        message={error}
        actionLabel="Go Back"
        onAction={() => router.back()}
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
        showBackButton
        title={user.fullName}
      />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
        {/* Profile Header with Follow Integration */}
        <ProfileHeader
          userId={user._id || userId}
          userPhone={user.phone || userId}
          fullName={user.fullName}
          bio={user.bio}
          role={user.role}
          avatarUrl={user.profileImage}
          isOwnProfile={false}
          followersCount={user.followersCount || 0}
          followingCount={user.followingCount || 0}
          trustScore={user.trustScore || 0}
          onFollowChange={() => {
            // Delay re-fetch to allow DB follower counts to settle,
            // preventing stale data from overwriting the optimistic count update
            setTimeout(() => fetchUserProfile(), 1000);
          }}
        />

        {/* Details Card */}
        <ProfileDetailsCard
          state={user.state}
          district={user.district}
          language={user.language || ''}
        />

        {/* Experience Level */}
        {user.experienceLevel && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Experience Level
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">
              {user.experienceLevel}
            </p>
          </div>
        )}

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

        {/* User's Posts */}
        {user.phone && (
          <MyPostsCard userPhone={user.phone} isOwnProfile={false} />
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
