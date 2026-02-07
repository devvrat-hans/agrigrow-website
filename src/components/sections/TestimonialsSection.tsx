'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface TestimonialCardProps {
  name: string;
  role: string;
  location: string;
  quote: string;
  rating: number;
}

function TestimonialCard({ name, role, location, quote, rating }: TestimonialCardProps) {
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
      {/* Stars */}
      <div className="flex items-center mb-4">
        {[...Array(rating)].map((_, i) => (
          <span key={i} className="text-yellow-400 text-lg">
            ★
          </span>
        ))}
        {[...Array(5 - rating)].map((_, i) => (
          <span key={i} className="text-gray-300 dark:text-gray-600 text-lg">
            ★
          </span>
        ))}
      </div>

      {/* Quote */}
      <p className="text-gray-700 dark:text-gray-300 italic text-lg leading-relaxed mb-6">
        &ldquo;{quote}&rdquo;
      </p>

      {/* User Info */}
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mr-4 font-bold text-white text-lg">
          {name.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white">{name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {role} • {location}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const { translations, t } = useTranslation();

  const testimonials = translations.landing.testimonials.testimonialsList.map((item) => ({
    name: item.name,
    role: item.role,
    location: item.location,
    quote: item.text,
    rating: 5,
  }));

  return (
    <section className="py-20 md:py-32 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-20 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-5"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="mb-6 inline-block">
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-6 py-2 rounded-full text-sm font-semibold border border-green-200 dark:border-green-800">
              {t('landing.testimonials.badge')}
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t('landing.testimonials.title')}<span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{t('landing.testimonials.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            {t('landing.testimonials.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              4.8/5
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t('landing.testimonials.averageRating')}</p>
          </div>
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              50K+
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t('landing.testimonials.happyFarmers')}</p>
          </div>
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              100%
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t('landing.testimonials.recommendAgrigrow')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
