-- UNIVERSAL NOTIFICATIONS SETUP
-- This script enables "Mass Broadcasting" and "Targeted Notifications" via Database Triggers.

-- 1. Create Broadcast Table
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
    category TEXT CHECK (category IN ('attendance', 'advance', 'task', 'system')) DEFAULT 'system',
    target_role TEXT DEFAULT 'staff', -- 'all', 'staff', 'manager', 'admin', 'master'
    target_position TEXT DEFAULT NULL, -- Optional: 'Waiter', 'Barista', etc.
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Broadcast Table
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Only Managers/Admins can manage broadcasts
CREATE POLICY "Managers can manage broadcasts" ON public.broadcast_notifications
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.auth_id = auth.uid()
        AND users.role IN ('admin', 'manager', 'master')
    )
);

-- Everyone can see (though they mostly won't need to as it's a trigger source)
CREATE POLICY "Everyone can see broadcasts" ON public.broadcast_notifications
FOR SELECT USING (true);

-- 2. Trigger Function: Distribute Notification to Users
CREATE OR REPLACE FUNCTION on_broadcast_created()
RETURNS TRIGGER AS $$
DECLARE
    target_user RECORD;
    normalized_target_pos TEXT;
BEGIN
    normalized_target_pos := CASE WHEN NEW.target_position IS NOT NULL THEN LOWER(TRIM(NEW.target_position)) ELSE NULL END;

    -- Loop through users based on filters
    FOR target_user IN 
        SELECT id, role, position FROM public.users 
        WHERE (NEW.target_role = 'all' OR role = NEW.target_role)
        AND (NEW.target_position IS NULL OR LOWER(TRIM(position)) = normalized_target_pos)
    LOOP
        -- Insert into the main notifications table
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            category,
            link,
            is_read,
            created_at
        ) VALUES (
            target_user.id,
            NEW.title,
            NEW.message,
            NEW.type,
            NEW.category,
            NEW.link,
            FALSE,
            NOW()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply Trigger
DROP TRIGGER IF EXISTS trigger_broadcast_created ON public.broadcast_notifications;
CREATE TRIGGER trigger_broadcast_created
AFTER INSERT ON public.broadcast_notifications
FOR EACH ROW EXECUTE FUNCTION on_broadcast_created();

-- 4. Helper Function: Single User Notification (For SQL use)
CREATE OR REPLACE FUNCTION notify_user(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'system',
    p_link TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, category, link)
    VALUES (p_user_id, p_title, p_message, p_type, p_category, p_link);
END;
$$ LANGUAGE plpgsql;

-- 5. Helper Function: Role Broadcast (For SQL use)
CREATE OR REPLACE FUNCTION notify_role(
    p_role TEXT,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_category TEXT DEFAULT 'system',
    p_link TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.broadcast_notifications (target_role, title, message, type, category, link)
    VALUES (p_role, p_title, p_message, p_type, p_category, p_link);
END;
$$ LANGUAGE plpgsql;
