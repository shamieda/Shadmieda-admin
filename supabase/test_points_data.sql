-- Test Data for Monthly Points (Gamification System)
-- This script adds sample points data for the current month to test the points badge display

-- First, get the current month in YYYY-MM format
-- Replace 'YYYY-MM' below with your current month (e.g., '2026-01')

-- Insert test points for existing staff
-- You'll need to replace the user_id values with actual staff IDs from your users table

-- Example: Add points for staff members
INSERT INTO public.monthly_points (user_id, month, points, good_deeds_count, bad_deeds_count)
SELECT 
    id as user_id,
    TO_CHAR(NOW(), 'YYYY-MM') as month,
    FLOOR(RANDOM() * 20 + 1)::integer as points, -- Random points between 1-20
    FLOOR(RANDOM() * 15 + 1)::integer as good_deeds_count, -- Random good deeds 1-15
    FLOOR(RANDOM() * 5)::integer as bad_deeds_count -- Random bad deeds 0-4
FROM public.users
WHERE role = 'staff'
ON CONFLICT (user_id, month) 
DO UPDATE SET
    points = EXCLUDED.points,
    good_deeds_count = EXCLUDED.good_deeds_count,
    bad_deeds_count = EXCLUDED.bad_deeds_count;

-- Verify the data was inserted
SELECT 
    u.full_name,
    mp.month,
    mp.points,
    mp.good_deeds_count,
    mp.bad_deeds_count
FROM public.monthly_points mp
JOIN public.users u ON mp.user_id = u.id
WHERE mp.month = TO_CHAR(NOW(), 'YYYY-MM')
ORDER BY mp.points DESC;
