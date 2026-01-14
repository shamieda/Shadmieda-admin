-- UNIVERSAL REAL-TIME SYNC SETUP
-- This script moves the "Brain" of the task system into the Database.

-- 1. Helper Function: Standardize Position Strings (Trim + Lowercase)
CREATE OR REPLACE FUNCTION normalize_position(pos TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN TRIM(LOWER(pos));
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger Function: When a Template is ADDED
CREATE OR REPLACE FUNCTION on_template_created()
RETURNS TRIGGER AS $$
DECLARE
    target_user RECORD;
    normalized_template_pos TEXT;
BEGIN
    normalized_template_pos := normalize_position(NEW.position);

    -- Loop through all active staff
    FOR target_user IN 
        SELECT id, position FROM users WHERE role = 'staff'
    LOOP
        -- Check if this template applies to this user
        IF normalized_template_pos = 'staff' OR normalized_template_pos = 'semua staff' OR 
           normalize_position(target_user.position) = normalized_template_pos THEN
            
            -- Insert the task for today (if not already exists)
            INSERT INTO tasks (
                assigned_to, 
                title, 
                description, 
                position, 
                created_at, 
                is_completed
            )
            SELECT 
                target_user.id, 
                NEW.title, 
                NEW.description, 
                NEW.position, 
                NOW(), 
                FALSE
            WHERE NOT EXISTS (
                SELECT 1 FROM tasks 
                WHERE assigned_to = target_user.id 
                AND title = NEW.title 
                AND created_at::date = CURRENT_DATE
            );
            
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function: When a Template is DELETED
CREATE OR REPLACE FUNCTION on_template_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all pending tasks for today that match this template's title
    -- (Preserve completed history)
    DELETE FROM tasks
    WHERE title = OLD.title
    AND is_completed = FALSE
    AND created_at::date = CURRENT_DATE;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger Function: When a Template is UPDATED (e.g. Title change)
CREATE OR REPLACE FUNCTION on_template_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- If title changed, update pending tasks
    IF OLD.title <> NEW.title THEN
        UPDATE tasks
        SET title = NEW.title,
            description = NEW.description
        WHERE title = OLD.title
        AND is_completed = FALSE
        AND created_at::date = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5. APPLY TRIGGERS
DROP TRIGGER IF EXISTS trigger_template_created ON task_templates;
CREATE TRIGGER trigger_template_created
AFTER INSERT ON task_templates
FOR EACH ROW EXECUTE FUNCTION on_template_created();

DROP TRIGGER IF EXISTS trigger_template_deleted ON task_templates;
CREATE TRIGGER trigger_template_deleted
AFTER DELETE ON task_templates
FOR EACH ROW EXECUTE FUNCTION on_template_deleted();

DROP TRIGGER IF EXISTS trigger_template_updated ON task_templates;
CREATE TRIGGER trigger_template_updated
AFTER UPDATE ON task_templates
FOR EACH ROW EXECUTE FUNCTION on_template_updated();


-- 6. RPC Function: Generate Daily Tasks (Call this when Staff opens app)
CREATE OR REPLACE FUNCTION generate_daily_tasks_for_user(target_user_id UUID, user_pos TEXT)
RETURNS VOID AS $$
DECLARE
    t_row RECORD;
    norm_pos TEXT;
BEGIN
    norm_pos := normalize_position(user_pos);

    -- Loop through all templates relevant to this user
    FOR t_row IN 
        SELECT * FROM task_templates 
    LOOP
        IF normalize_position(t_row.position) = 'staff' OR normalize_position(t_row.position) = 'semua staff' OR
           normalize_position(t_row.position) = norm_pos THEN
           
            -- Insert if not exists
            INSERT INTO tasks (
                assigned_to, 
                title, 
                description, 
                position, 
                created_at, 
                is_completed
            )
            SELECT 
                target_user_id, 
                t_row.title, 
                t_row.description, 
                t_row.position, 
                NOW(), 
                FALSE
            WHERE NOT EXISTS (
                SELECT 1 FROM tasks 
                WHERE assigned_to = target_user_id 
                AND title = t_row.title 
                AND created_at::date = CURRENT_DATE
            );
            
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger Function: When User Position Changes (Auto-Migrate Tasks)
CREATE OR REPLACE FUNCTION on_user_position_changed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if position actually changed
    IF (OLD.position IS DISTINCT FROM NEW.position) THEN
        
        -- 1. Delete INCOMPLETE tasks for the OLD position (Clean up)
        DELETE FROM tasks
        WHERE assigned_to = NEW.id
        AND is_completed = FALSE
        AND created_at::date = CURRENT_DATE
        AND normalize_position(position) <> 'staff' 
        AND normalize_position(position) <> 'semua staff'; -- Keep generic staff tasks

        -- 2. Generate tasks for the NEW position
        PERFORM generate_daily_tasks_for_user(NEW.id, NEW.position);
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_position_updated ON users;
CREATE TRIGGER trigger_user_position_updated
AFTER UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION on_user_position_changed();
