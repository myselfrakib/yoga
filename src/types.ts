export interface CourseVideo {
  title: string;
  url: string;
}

export interface Course {
  id: string;
  title: string;
  duration: string;
  tag: string;
  features: string[];
  popular: boolean;
  price: number; // in INR
  imageUrl?: string;
  description?: string;
  demoVideoUrl?: string;
  videos?: CourseVideo[];
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  purchasedCourses?: Record<string, boolean>;
  createdAt: string;
}

export interface Booking {
  id: string;
  name: string;
  phone: string;
  email?: string;
  program: string;
  date?: string;
  time?: string;
  message?: string;
  timestamp: string;
  userId?: string;
  attemptId?: string;
}

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  date?: string;
  message?: string;
  timestamp: string;
  userId?: string;
  attemptId?: string;
}

export interface Purchase {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  amount: number;
  paymentId: string;
  timestamp: string;
}

export interface SiteImages {
  logoUrl?: string;
  heroUrl?: string;
  aboutUrl1?: string;
  aboutUrl2?: string;
  vedantaUrl?: string;
  contactUrl?: string;
}

export interface GalleryItem {
  id: string;
  cat: string;
  photo: string;
  label: string;
  span: 'normal' | 'wide' | 'tall';
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  text: string;
  photo: string;
}

export interface EnquiryAttempt {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  status: 'opened' | 'typing' | 'abandoned' | 'submitted';
  formData?: {
    name?: string;
    phone?: string;
    email?: string;
    program?: string;
    time?: string;
    message?: string;
  };
  timestamp: string;
}

