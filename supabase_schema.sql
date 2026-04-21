-- 1. Create Roles Enum safely
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'student' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Create Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES public.profiles(id) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  thumbnail_url TEXT,
  promo_video_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL
);

-- 5. Create Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('document', 'image')),
  content TEXT, -- Markdown or text content
  duration TEXT, -- e.g. "12:30"
  "order" INTEGER NOT NULL,
  is_free BOOLEAN DEFAULT FALSE NOT NULL
);

-- 6. Create Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, course_id)
);

-- 7. Create Earnings/Income table
CREATE TABLE IF NOT EXISTS public.instructor_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES public.profiles(id) NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Discussions table
CREATE TABLE IF NOT EXISTS public.course_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.course_discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_discussions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- POLICIES (Handled safely with DROP/CREATE)
-- ---------------------------------------------------------

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Categories Policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courses Policies
DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
CREATE POLICY "Published courses are viewable by everyone" ON public.courses
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Instructors can manage their own courses" ON public.courses;
CREATE POLICY "Instructors can manage their own courses" ON public.courses
  FOR ALL USING (
    auth.uid() = instructor_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Modules Policies
DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.modules;
CREATE POLICY "Modules are viewable by everyone" ON public.modules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Instructors can manage their own modules" ON public.modules;
CREATE POLICY "Instructors can manage their own modules" ON public.modules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = public.modules.course_id AND courses.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_id AND courses.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lessons Policies
DROP POLICY IF EXISTS "Lessons are viewable by enrolled students or if free" ON public.lessons;
CREATE POLICY "Lessons are viewable by enrolled students or if free" ON public.lessons
  FOR SELECT USING (
    is_free = true OR
    EXISTS (
      SELECT 1 FROM public.enrollments 
      JOIN public.modules ON enrollments.course_id = modules.course_id
      WHERE enrollments.user_id = auth.uid() AND modules.id = public.lessons.module_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.courses 
      JOIN public.modules ON courses.id = modules.course_id
      WHERE courses.instructor_id = auth.uid() AND modules.id = public.lessons.module_id
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Instructors can manage their own lessons" ON public.lessons;
CREATE POLICY "Instructors can manage their own lessons" ON public.lessons
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      JOIN public.modules ON courses.id = modules.course_id
      WHERE modules.id = public.lessons.module_id AND courses.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      JOIN public.modules ON courses.id = modules.course_id
      WHERE modules.id = module_id AND courses.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enrollments Policies
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
CREATE POLICY "Users can enroll themselves" ON public.enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Earnings Policies
DROP POLICY IF EXISTS "Instructors can view their own earnings" ON public.instructor_earnings;
CREATE POLICY "Instructors can view their own earnings" ON public.instructor_earnings
  FOR SELECT USING (
    auth.uid() = instructor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SET search_path = public
AS $$
DECLARE
  role_name text;
BEGIN
  -- Get role from metadata, default to 'student'
  role_name := COALESCE(new.raw_user_meta_data->>'role', 'student');
  
  -- Ensure role is valid for our enum
  IF role_name NOT IN ('admin', 'instructor', 'student') THEN
    role_name := 'student';
  END IF;

  -- Insert profile, or update it if it somehow already exists (prevents "Database error" on retry)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url', 
    role_name::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe trigger handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Storage Buckets Setup
-- Note: This requires the storage extension to be enabled
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-assets', 'course-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for course-assets
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'course-assets');

DROP POLICY IF EXISTS "Instructors can upload assets" ON storage.objects;
CREATE POLICY "Instructors can upload assets" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'course-assets' AND 
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role::text = 'instructor' OR role::text = 'admin'))
);

DROP POLICY IF EXISTS "Instructors can update their own assets" ON storage.objects;
CREATE POLICY "Instructors can update their own assets" 
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-assets' AND 
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role::text = 'instructor' OR role::text = 'admin'))
);

DROP POLICY IF EXISTS "Instructors can delete their own assets" ON storage.objects;
CREATE POLICY "Instructors can delete their own assets" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-assets' AND 
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role::text = 'instructor' OR role::text = 'admin'))
);

-- Discussion Policies
DROP POLICY IF EXISTS "Discussions are viewable by everyone" ON public.course_discussions;
CREATE POLICY "Discussions are viewable by everyone" ON public.course_discussions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can post discussions" ON public.course_discussions;
CREATE POLICY "Authenticated users can post discussions" ON public.course_discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own discussions" ON public.course_discussions;
CREATE POLICY "Users can update their own discussions" ON public.course_discussions
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Assignments Policies
DROP POLICY IF EXISTS "Assignments are viewable by everyone" ON public.assignments;
CREATE POLICY "Assignments are viewable by everyone" ON public.assignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Instructors can manage their own assignments" ON public.assignments;
CREATE POLICY "Instructors can manage their own assignments" ON public.assignments
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = public.assignments.course_id AND courses.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Private messages table
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) NOT NULL,
  course_id UUID REFERENCES public.courses(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for private messages
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Policies for private messages
DROP POLICY IF EXISTS "Users can view their own private messages" ON public.private_messages;
CREATE POLICY "Users can view their own private messages" ON public.private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send private messages" ON public.private_messages;
CREATE POLICY "Users can send private messages" ON public.private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.private_messages;
CREATE POLICY "Receivers can mark messages as read" ON public.private_messages
  FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
