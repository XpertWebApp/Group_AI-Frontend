'use client';

import { cn } from '@/lib/utils/cn';

interface StarRatingProps {
    rating: number;
    size?: number;
    className?: string;
    maxStars?: number;
}

/**
 * Renders a star rating with support for half-stars using SVG gradients.
 */
export function StarRating({ rating, size = 16, className, maxStars = 5 }: StarRatingProps) {
    // Coerce to number and handle NaN
    const numericRating = isNaN(Number(rating)) ? 0 : Number(rating);

    // Unique ID for the gradient to avoid collisions
    const gradientId = `star-gradient-${numericRating.toString().replace('.', '-')}`;

    const fullStars = Math.floor(numericRating);
    const hasHalfStar = (numericRating % 1) >= 0.5;
    const emptyStars = Math.max(0, maxStars - fullStars - (hasHalfStar ? 1 : 0));

    const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

    return (
        <div className={cn('flex items-center gap-0.5', className)} title={`${numericRating} stars`}>
            {/* Full Stars */}
            {Array.from({ length: fullStars }).map((_, i) => (
                <svg key={`full-${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#AAC737" className="shrink-0">
                    <path d={starPath} />
                </svg>
            ))}

            {/* Half Star */}
            {hasHalfStar && (
                <svg key="half" width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
                    <defs>
                        <linearGradient id={gradientId}>
                            <stop offset="50%" stopColor="#AAC737" />
                            <stop offset="50%" stopColor="#D1D1D1" />
                        </linearGradient>
                    </defs>
                    <path d={starPath} fill={`url(#${gradientId})`} />
                </svg>
            )}

            {/* Empty Stars */}
            {Array.from({ length: emptyStars }).map((_, i) => (
                <svg key={`empty-${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#D1D1D1" className="shrink-0">
                    <path d={starPath} />
                </svg>
            ))}
        </div>
    );
}
