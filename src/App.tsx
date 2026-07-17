import { useState, useEffect, useRef, useCallback } from 'react'
import logo from '@/imports/logo_tamatman.jfif'
import {
  db,
  ref,
  push,
  set,
  get,
  child,
  auth,
  storage,
  analytics
} from './firebase'
import { logEvent } from 'firebase/analytics'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import {
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage'
import { Course, Booking, Inquiry, UserProfile, SiteImages, GalleryItem, TestimonialItem, EnquiryAttempt, CourseVideo } from './types'

// ── Razorpay Script Loader ──────────────────────────────────────────────
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const encodeEmail = (email: string) => email.replace(/\./g, ',')

// ── Helpers ───────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function AnimatedCounter({ target, suffix = '', active }: { target: number; suffix?: string; active: boolean }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let frame = 0
    const total = Math.round(2000 / 16)
    const timer = setInterval(() => {
      frame++
      setCount(Math.floor(target * Math.min(frame / total, 1)))
      if (frame >= total) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [active, target])
  return <>{count}{suffix}</>
}

function UnsplashImg({ id, w, h, alt, className }: { id: string; w: number; h: number; alt: string; className?: string }) {
  if (!id) return null
  const isFullUrl = id.startsWith('http://') || id.startsWith('https://') || id.startsWith('data:') || id.startsWith('/') || id.includes('.')
  return (
    <img
      src={isFullUrl ? id : `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`}
      alt={alt}
      className={className}
      loading="lazy"
    />
  )
}

// ── Static Data ──────────────────────────────────────────────────────────

const NAV_LINKS = ['Home', 'About', 'Programs', 'Courses', 'Vedanta Trails', 'Gallery', 'Testimonials', 'Contact']

const SERVICES = [
  { icon: '🧘', title: 'Yoga', items: ['Traditional Yoga', 'Power Yoga', 'Hatha Yoga', 'Ashtanga', 'Morning Yoga', 'Evening Yoga'] },
  { icon: '🌸', title: 'Meditation', items: ['Guided Meditation', 'Mindfulness', 'Breathing Practice', 'Stress Relief'] },
  { icon: '💃', title: 'Zumba', items: ['Dance Fitness', 'Cardio Sessions', 'Group Classes'] },
  { icon: '🏃', title: 'Aerobics', items: ['Energy Training', 'Weight Management', 'Body Toning'] },
  { icon: '⚖️', title: 'Weight Loss', items: ['Customized Programs', 'Diet Consultation', 'Fitness Planning', 'Lifestyle Coaching'] },
  { icon: '✨', title: 'Chakra Balancing', items: ['Energy Healing', 'Sound Therapy', 'Crystal Healing'] },
  { icon: '📿', title: 'Vedic Chanting', items: ['Mantra Meditation', 'Sacred Vibrations', 'Spiritual Healing'] },
  { icon: '🌿', title: 'Ayurvedic Therapy', items: ['Abhyanga Massage', 'Detox Treatments', 'Herbal Steam Bath', 'Stress Management'] },
]

const VEDANTA_ACTIVITIES = [
  { emoji: '🌿', label: 'Jungle Trek' }, { emoji: '🏛', label: 'Ancient Temple Visit' },
  { emoji: '🧘', label: 'Meditation Workshops' }, { emoji: '🔥', label: 'Bonfire & Spiritual Evenings' },
  { emoji: '💃', label: 'Tribal Dance Experience' }, { emoji: '🌄', label: 'Sunrise Yoga' },
  { emoji: '🌱', label: 'Nature Walk' }, { emoji: '🍃', label: 'Ayurvedic Lifestyle Sessions' },
  { emoji: '🥗', label: 'Organic Satvik Meals' }, { emoji: '🌸', label: 'Chakra Healing' },
  { emoji: '📿', label: 'Vedic Chanting' }, { emoji: '🚶', label: 'Forest Mindfulness' },
]

const WHY_CHOOSE = [
  { icon: '🌿', title: 'Authentic Ayurveda', desc: 'Rooted in ancient Vedic traditions and classical Ayurvedic texts.' },
  { icon: '🏅', title: 'Certified Trainers', desc: 'All instructors hold recognized international certifications.' },
  { icon: '💚', title: 'Natural Healing', desc: 'Pure herbs, organic treatments, and nature-first wellness protocols.' },
  { icon: '🎯', title: 'Personalized Wellness', desc: 'Programs designed for your unique Dosha constitution.' },
  { icon: '🕊️', title: 'Peaceful Environment', desc: 'A sanctuary of calm nestled in nature, away from the city noise.' },
  { icon: '🏕️', title: 'Nature Retreats', desc: 'Immersive Vedanta Trails connecting you back to the elements.' },
  { icon: '✨', title: 'Luxury Experience', desc: 'Premium-quality sessions with artisanal attention to every detail.' },
  { icon: '👥', title: 'Community Support', desc: 'Join a vibrant circle of practitioners sharing the path of wellness.' },
]

const GALLERY_ITEMS = [
  { id: 1, cat: 'yoga', photo: '1506905925346-21bda4d32df4', label: 'Sunrise Yoga', span: 'tall' },
  { id: 2, cat: 'yoga', photo: '1599447421416-3414cef25f74', label: 'Hatha Yoga Class', span: 'normal' },
  { id: 3, cat: 'nature', photo: '1441974231531-c6227db76b6e', label: 'Forest Retreat', span: 'wide' },
  { id: 4, cat: 'nature', photo: '1448375240586-882707db888b', label: 'Mountain Nature', span: 'normal' },
  { id: 5, cat: 'retreats', photo: '1504280390367-361c6d9f38f4', label: 'Vedanta Trek', span: 'tall' },
  { id: 6, cat: 'yoga', photo: '1545389336-cf090694435e', label: 'Deep Meditation', span: 'normal' },
  { id: 7, cat: 'events', photo: '1508672019048-c12b11a10eea', label: 'Yoga Workshop', span: 'wide' },
  { id: 8, cat: 'nature', photo: '1501854140801-50d01698950b', label: 'Himalayan Sunrise', span: 'normal' },
  { id: 9, cat: 'events', photo: '1571019613454-1cb2f99b2d8b', label: 'Dance Fitness', span: 'normal' },
  { id: 10, cat: 'retreats', photo: '1490645967584-a7c9d0f91f1f', label: 'Satvik Organic Meals', span: 'normal' },
  { id: 11, cat: 'yoga', photo: '1506126613408-eca07ce68773', label: 'Morning Flow', span: 'wide' },
  { id: 12, cat: 'events', photo: '1570168007204-dfb528c6958f', label: 'Temple Visit', span: 'normal' },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Yoga Transformation', text: "Tamatman changed my life completely. After 3 months of consistent practice under their certified trainers, I feel stronger, calmer, and more aligned with myself than ever before. The personal attention is extraordinary.", photo: '1494790108377-be9c29b29330' },
  { name: 'Rahul Mehta', role: 'Weight Loss Journey', text: "I lost 18 kg in 8 weeks through their personalized weight loss program. The combination of diet consultation, yoga, and aerobics was perfectly balanced for my body type. The team's support was incredible.", photo: '1507003211169-0a1dd7228f2d' },
  { name: 'Ananya Krishnan', role: 'Retreat Experience', text: "The Vedanta Trails retreat was absolutely magical. Two nights in the forest with morning yoga, chakra healing, and organic meals — I returned completely transformed and at peace with myself.", photo: '1438761681033-6461ffad8d80' },
  { name: 'Vikram Nair', role: 'Meditation Journey', text: "The 21-day meditation course gave me techniques I use every single day. The instructors are deeply knowledgeable and genuinely caring. This is authentic wellness at its finest.", photo: '1472099645785-5658abf4ff4e' },
]

const GALLERY_FILTERS = ['All', 'Yoga', 'Nature', 'Retreats', 'Events']

const DEFAULT_COURSES: Course[] = [
  { id: 'yoga-foundation', title: 'Yoga Foundation Course', duration: '1 Month', tag: 'Beginner Friendly', features: ['Flexible Batch Timings', 'Personal Attention', 'Certificate'], popular: false, price: 1999 },
  { id: 'advanced-yoga', title: 'Advanced Yoga Course', duration: '3 Months', tag: 'Professional Training', features: ['Expert Certified Trainers', 'Advanced Techniques', 'Certificate'], popular: true, price: 4999 },
  { id: 'weight-loss', title: 'Weight Loss Transformation', duration: '8 Weeks', tag: 'Intensive', features: ['Customized Diet Plan', 'Workout Routine', 'Weekly Progress Tracking'], popular: false, price: 2999 },
  { id: 'meditation-course', title: 'Meditation Course', duration: '21 Days', tag: 'Mindfulness', features: ['Stress Management', 'Mindfulness Practices', 'Daily Guided Sessions'], popular: false, price: 1499 },
  { id: 'aerobics-program', title: 'Aerobics Program', duration: 'Monthly', tag: 'Fitness', features: ['Energy Training', 'Group Sessions', 'Fun Cardio Workouts'], popular: false, price: 999 },
  { id: 'zumba-program', title: 'Zumba Program', duration: 'Monthly', tag: 'Dance Fitness', features: ['Dance Fitness', 'High-Energy Cardio', 'Group Atmosphere'], popular: false, price: 999 },
]

// ── Section wrapper with scroll reveal ───────────────────────────────────

function Section({ id, children, className = '', style }: { id?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { ref, inView } = useInView()
  return (
    <section
      id={id}
      ref={ref as React.RefObject<HTMLElement>}
      className={`section-reveal ${inView ? 'visible' : ''} ${className}`}
      style={style}
    >
      {children}
    </section>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState('All')
  const [lightbox, setLightbox] = useState<{ id: string; label: string } | null>(null)
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  // Firebase User & Profile States
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Data Lists from Firebase
  const [courses, setCourses] = useState<Course[]>([])
  const [bookingsList, setBookingsList] = useState<Booking[]>([])
  const [inquiriesList, setInquiriesList] = useState<Inquiry[]>([])
  const [usersList, setUsersList] = useState<UserProfile[]>([])
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [testimonialsList, setTestimonialsList] = useState<TestimonialItem[]>([])
  const [siteImages, setSiteImages] = useState<SiteImages>({})
  const [attemptsList, setAttemptsList] = useState<EnquiryAttempt[]>([])

  // Modal / UI state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [isAdminLoginMode, setIsAdminLoginMode] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authError, setAuthError] = useState('')

  // Booking & Inquiry Form States
  const [bookingData, setBookingData] = useState({ name: '', phone: '', email: '', program: '', date: '', time: '', message: '' })
  const [inquiryData, setInquiryData] = useState({ name: '', phone: '', email: '', date: '', message: '' })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [inquirySuccess, setInquirySuccess] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedCourseDetails, setSelectedCourseDetails] = useState<Course | null>(null)
  const [activeCourseVideoUrl, setActiveCourseVideoUrl] = useState<string>('')

  // Attempt tracking state
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [currentInquiryAttemptId, setCurrentInquiryAttemptId] = useState<string | null>(null)

  // Admin View state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminTab, setAdminTab] = useState<'courses' | 'bookings' | 'inquiries' | 'users' | 'site_images' | 'gallery' | 'testimonials' | 'attempts'>('courses')

  // Dynamic lists form states (Admin)
  const [showGalleryForm, setShowGalleryForm] = useState(false)
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null)
  const [galleryFormCat, setGalleryFormCat] = useState('yoga')
  const [galleryFormLabel, setGalleryFormLabel] = useState('')
  const [galleryFormSpan, setGalleryFormSpan] = useState<'normal' | 'wide' | 'tall'>('normal')
  const [galleryFormFile, setGalleryFormFile] = useState<File | null>(null)
  const [galleryFormUrl, setGalleryFormUrl] = useState('')

  const [showTestimonialForm, setShowTestimonialForm] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null)
  const [testimonialFormName, setTestimonialFormName] = useState('')
  const [testimonialFormRole, setTestimonialFormRole] = useState('')
  const [testimonialFormText, setTestimonialFormText] = useState('')
  const [testimonialFormFile, setTestimonialFormFile] = useState<File | null>(null)
  const [testimonialFormUrl, setTestimonialFormUrl] = useState('')

  // Course Editing Form State
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseFormTitle, setCourseFormTitle] = useState('')
  const [courseFormDuration, setCourseFormDuration] = useState('')
  const [courseFormTag, setCourseFormTag] = useState('')
  const [courseFormFeatures, setCourseFormFeatures] = useState('')
  const [courseFormPopular, setCourseFormPopular] = useState(false)
  const [courseFormPrice, setCourseFormPrice] = useState(1999)
  const [courseFormFile, setCourseFormFile] = useState<File | null>(null)
  const [courseFormDescription, setCourseFormDescription] = useState('')
  const [courseFormDemoVideoUrl, setCourseFormDemoVideoUrl] = useState('')
  const [courseFormDemoVideoFile, setCourseFormDemoVideoFile] = useState<File | null>(null)
  const [courseFormVideos, setCourseFormVideos] = useState<CourseVideo[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const statsRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

  // Check Scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Stats reveal observer
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Auto scroll testimonials
  useEffect(() => {
    if (testimonialsList.length === 0) return
    const timer = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % testimonialsList.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [testimonialsList.length])

  // ── Firebase Core Sync & Listeners ──────────────────────────────────────
  useEffect(() => {
    // 1. Auth state change listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Fetch or create user profile in DB
        const userRef = ref(db, `users/${firebaseUser.uid}`)
        const snap = await get(userRef)
        let profile: UserProfile

        if (!snap.exists()) {
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || authName || firebaseUser.email?.split('@')[0] || 'User',
            role: 'user',
            createdAt: new Date().toISOString()
          }
          await set(userRef, profile)
        } else {
          profile = snap.val() as UserProfile
        }
        setUserProfile(profile)

        // Seed or check admin status
        let isAdminUser = false
        try {
          const encoded = encodeEmail(firebaseUser.email || '')
          const uidSnap = await get(ref(db, `admins/${firebaseUser.uid}`))
          const emailSnap = await get(ref(db, `admins/${encoded}`))

          // If admins node doesn't exist, we seed admin@tamatman.com as admin
          try {
            const allAdminsSnap = await get(ref(db, 'admins'))
            if (!allAdminsSnap.exists()) {
              await set(ref(db, 'admins/admin@tamatman,com'), true)
            }
          } catch (seedErr) {
            // Seeding might fail due to database write rules for non-admins, ignore
          }

          isAdminUser = (uidSnap.exists() && uidSnap.val() === true) || (emailSnap.exists() && emailSnap.val() === true) || (profile.role === 'admin')
        } catch (err) {
          // If checking root admins node fails due to Permission denied, check the user profile role
          isAdminUser = profile.role === 'admin'
        }
        setIsAdmin(isAdminUser)
      } else {
        setUser(null)
        setUserProfile(null)
        setIsAdmin(false)
        setShowAdminPanel(false)
      }
    })

    // 2. Fetch Courses
    const loadCourses = async () => {
      const coursesRef = ref(db, 'courses')
      const snapshot = await get(coursesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const courseList: Course[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        setCourses(courseList)
      } else {
        // Seed default courses
        const initialMap: Record<string, Omit<Course, 'id'>> = {}
        DEFAULT_COURSES.forEach(c => {
          const { id, ...rest } = c
          initialMap[id] = rest
        })
        await set(coursesRef, initialMap)
        setCourses(DEFAULT_COURSES)
      }
    }

    // 3. Fetch Site Images Customizations
    const loadSiteImages = async () => {
      const imagesRef = ref(db, 'site_images')
      const snapshot = await get(imagesRef)
      if (snapshot.exists()) {
        setSiteImages(snapshot.val())
      }
    }

    // 4. Fetch Dynamic Gallery Items
    const loadGallery = async () => {
      const galleryRef = ref(db, 'gallery')
      const snapshot = await get(galleryRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const list: GalleryItem[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        setGalleryItems(list)
      } else {
        // Seed default gallery items
        const initialMap: Record<string, Omit<GalleryItem, 'id'>> = {}
        GALLERY_ITEMS.forEach(g => {
          initialMap[String(g.id)] = { cat: g.cat, photo: g.photo, label: g.label, span: g.span }
        })
        await set(galleryRef, initialMap)
        setGalleryItems(GALLERY_ITEMS.map(g => ({ ...g, id: String(g.id) })))
      }
    }

    // 5. Fetch Dynamic Testimonial Items
    const loadTestimonials = async () => {
      const testimonialsRef = ref(db, 'testimonials')
      const snapshot = await get(testimonialsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const list: TestimonialItem[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }))
        setTestimonialsList(list)
      } else {
        // Seed default testimonials
        const initialMap: Record<string, Omit<TestimonialItem, 'id'>> = {}
        TESTIMONIALS.forEach((t, i) => {
          const id = `testimonial_${i}`
          initialMap[id] = { name: t.name, role: t.role, text: t.text, photo: t.photo }
        })
        await set(testimonialsRef, initialMap)
        const mappedDefaults = TESTIMONIALS.map((t, i) => ({ id: `testimonial_${i}`, name: t.name, role: t.role, text: t.text, photo: t.photo }))
        setTestimonialsList(mappedDefaults)
      }
    }

    loadCourses()
    loadSiteImages()
    loadGallery()
    loadTestimonials()
    return () => unsubscribe()
  }, [])

  // Sync Admin data if user is admin
  useEffect(() => {
    if (!isAdmin) return

    // Sync bookings
    const bookingsRef = ref(db, 'bookings')
    get(bookingsRef).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([key, val]) => ({
          id: key,
          ...(val as Omit<Booking, 'id'>)
        }))
        setBookingsList(list.reverse())
      }
    })

    // Sync inquiries
    const inquiriesRef = ref(db, 'inquiries')
    get(inquiriesRef).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([key, val]) => ({
          id: key,
          ...(val as Omit<Inquiry, 'id'>)
        }))
        setInquiriesList(list.reverse())
      }
    })

    // Sync Users list
    const usersRef = ref(db, 'users')
    get(usersRef).then(snap => {
      if (snap.exists()) {
        const list = Object.values(snap.val()) as UserProfile[]
        setUsersList(list)
      }
    })

    // Sync attempts list
    const attemptsRef = ref(db, 'attempts')
    get(attemptsRef).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([key, val]) => ({
          id: key,
          ...(val as Omit<EnquiryAttempt, 'id'>)
        }))
        setAttemptsList(list.reverse())
      }
    })
  }, [isAdmin, showAdminPanel])

  // Booking Form Lead Attempt tracking
  useEffect(() => {
    if (!showBookingModal) {
      if (currentAttemptId) {
        // Abandoned
        const endAttempt = async () => {
          try {
            await set(ref(db, `attempts/${currentAttemptId}/status`), 'abandoned')
          } catch (err) {
            console.error("Error updating attempt status:", err)
          }
        }
        endAttempt()
        setCurrentAttemptId(null)
      }
      return
    }

    const createAttempt = async () => {
      try {
        const attemptsRef = ref(db, 'attempts')
        const newAttemptRef = push(attemptsRef)
        const attemptId = newAttemptRef.key
        if (!attemptId) return

        const initialAttempt: EnquiryAttempt = {
          id: attemptId,
          status: 'opened',
          timestamp: new Date().toISOString(),
          ...(user ? {
            userId: user.uid,
            userEmail: user.email || '',
            userName: userProfile?.name || ''
          } : {})
        }
        await set(newAttemptRef, initialAttempt)
        setCurrentAttemptId(attemptId)
      } catch (err) {
        console.error("Error creating attempt:", err)
      }
    }
    createAttempt()
  }, [showBookingModal])

  useEffect(() => {
    if (!currentAttemptId) return
    const hasData = Object.values(bookingData).some(val => val !== '')
    if (!hasData) return

    const timer = setTimeout(async () => {
      try {
        await set(ref(db, `attempts/${currentAttemptId}/status`), 'typing')
        await set(ref(db, `attempts/${currentAttemptId}/formData`), bookingData)
      } catch (err) {
        console.error("Error updating attempt draft:", err)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [bookingData, currentAttemptId])

  // Inquiry Form Lead Attempt tracking
  useEffect(() => {
    const hasData = Object.values(inquiryData).some(val => val !== '')
    if (!hasData) return

    if (!currentInquiryAttemptId) {
      const createInquiryAttempt = async () => {
        try {
          const attemptsRef = ref(db, 'attempts')
          const newAttemptRef = push(attemptsRef)
          const attemptId = newAttemptRef.key
          if (!attemptId) return

          const initialAttempt: EnquiryAttempt = {
            id: attemptId,
            status: 'typing',
            timestamp: new Date().toISOString(),
            ...(user ? {
              userId: user.uid,
              userEmail: user.email || '',
              userName: userProfile?.name || ''
            } : {}),
            formData: inquiryData
          }
          await set(newAttemptRef, initialAttempt)
          setCurrentInquiryAttemptId(attemptId)
        } catch (err) {
          console.error("Error creating inquiry attempt:", err)
        }
      }
      createInquiryAttempt()
    } else {
      const timer = setTimeout(async () => {
        try {
          await set(ref(db, `attempts/${currentInquiryAttemptId}/formData`), inquiryData)
        } catch (err) {
          console.error("Error updating inquiry attempt draft:", err)
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [inquiryData])

  // ── Auth Handling ────────────────────────────────────────────────────────
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword)
        setShowAuthModal(false)
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword)
        const firebaseUser = userCredential.user

        if (isAdminLoginMode) {
          // Check if admin verified
          let isUserAdmin = false
          try {
            const encoded = encodeEmail(firebaseUser.email || '')
            const uidSnap = await get(ref(db, `admins/${firebaseUser.uid}`))
            const emailSnap = await get(ref(db, `admins/${encoded}`))
            const userRef = ref(db, `users/${firebaseUser.uid}`)
            const userSnap = await get(userRef)
            const role = userSnap.exists() ? userSnap.val().role : 'user'

            isUserAdmin = (uidSnap.exists() && uidSnap.val() === true) || (emailSnap.exists() && emailSnap.val() === true) || role === 'admin'
          } catch (err) {
            console.error("Admin verification failed:", err)
            // Fallback: check profile role if we can't read the admins node due to permissions
            const userRef = ref(db, `users/${firebaseUser.uid}`)
            const userSnap = await get(userRef)
            const role = userSnap.exists() ? userSnap.val().role : 'user'
            isUserAdmin = role === 'admin'
          }

          if (!isUserAdmin) {
            await signOut(auth)
            setAuthError('Access Denied: You are not authorized as an administrator.')
            return
          }
          setShowAdminPanel(true)
        }
        setShowAuthModal(false)
      }
      setAuthEmail('')
      setAuthPassword('')
      setAuthName('')
      setIsAdminLoginMode(false)
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error')
    }
  }

  const handleSignOut = () => {
    signOut(auth)
  }

  // ── Razorpay Payment ─────────────────────────────────────────────────────
  const handleBuyCourse = async (course: Course) => {
    if (!user) {
      setIsSignUpMode(false)
      setShowAuthModal(true)
      return
    }

    // Check if already purchased
    if (userProfile?.purchasedCourses?.[course.id]) {
      alert("You already own this course!")
      return
    }

    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      alert('Failed to load Razorpay SDK. Check network status.')
      return
    }

    const options = {
      key: 'rzp_test_placeholder', // User can configure/replace in dashboard
      amount: course.price * 100, // amount in paisa
      currency: 'INR',
      name: 'Tamatman Ayur Yoga',
      description: `Enrollment for ${course.title}`,
      image: siteImages?.logoUrl || logo,
      handler: async function (response: any) {
        // Payment successful
        try {
          const purchaseId = response.razorpay_payment_id || `pay_${Date.now()}`
          
          // Save Purchase details
          await set(ref(db, `purchases/${purchaseId}`), {
            id: purchaseId,
            userId: user.uid,
            userEmail: user.email,
            courseId: course.id,
            amount: course.price,
            paymentId: purchaseId,
            timestamp: new Date().toISOString()
          })

          // Update User purchased courses list
          await set(ref(db, `users/${user.uid}/purchasedCourses/${course.id}`), true)

          // Refresh local profile state
          setUserProfile(prev => prev ? {
            ...prev,
            purchasedCourses: { ...prev.purchasedCourses, [course.id]: true }
          } : null)

          alert(`Payment Successful! Enrolled in ${course.title} 🙏`)
        } catch (err) {
          console.error("Error confirming payment details:", err)
        }
      },
      prefill: {
        name: userProfile?.name || '',
        email: user.email || '',
        contact: ''
      },
      theme: {
        color: '#6E3AA8'
      }
    }

    const rzp = new (window as any).Razorpay(options)
    rzp.open()
  }

  // ── Booking and Inquiry form submissions ──────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const bookingId = `booking_${Date.now()}`
      const newBooking = {
        ...bookingData,
        timestamp: new Date().toISOString(),
        ...(user ? { userId: user.uid } : {}),
        ...(currentAttemptId ? { attemptId: currentAttemptId } : {})
      }
      await set(ref(db, `bookings/${bookingId}`), newBooking)

      if (currentAttemptId) {
        await set(ref(db, `attempts/${currentAttemptId}/status`), 'submitted')
        await set(ref(db, `attempts/${currentAttemptId}/formData`), bookingData)
        setCurrentAttemptId(null)
      }

      if (analytics) {
        logEvent(analytics, 'booking_submitted', {
          program: bookingData.program
        })
      }
      setBookingSuccess(true)
      setBookingData({ name: '', phone: '', email: '', program: '', date: '', time: '', message: '' })
      setTimeout(() => {
        setBookingSuccess(false)
        setShowBookingModal(false)
      }, 4000)
    } catch (err) {
      console.error("Error saving booking:", err)
      alert("Failed to book appointment. Please try again.")
    }
  }

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const inquiryId = `inquiry_${Date.now()}`
      const newInquiry = {
        ...inquiryData,
        timestamp: new Date().toISOString(),
        ...(user ? { userId: user.uid } : {}),
        ...(currentInquiryAttemptId ? { attemptId: currentInquiryAttemptId } : {})
      }
      await set(ref(db, `inquiries/${inquiryId}`), newInquiry)

      if (currentInquiryAttemptId) {
        await set(ref(db, `attempts/${currentInquiryAttemptId}/status`), 'submitted')
        await set(ref(db, `attempts/${currentInquiryAttemptId}/formData`), inquiryData)
        setCurrentInquiryAttemptId(null)
      }

      if (analytics) {
        logEvent(analytics, 'inquiry_submitted', {
          date: inquiryData.date
        })
      }
      setInquirySuccess(true)
      setInquiryData({ name: '', phone: '', email: '', date: '', message: '' })
      setTimeout(() => setInquirySuccess(false), 4000)
    } catch (err) {
      console.error("Error saving inquiry:", err)
      alert("Failed to submit inquiry. Please try again.")
    }
  }

  // ── Course CRUD Operations (Admin) ───────────────────────────────────────
  const openCourseForm = (course: Course | null = null) => {
    if (course) {
      setEditingCourse(course)
      setCourseFormTitle(course.title)
      setCourseFormDuration(course.duration)
      setCourseFormTag(course.tag)
      setCourseFormFeatures(course.features.join(', '))
      setCourseFormPopular(course.popular)
      setCourseFormPrice(course.price)
      setCourseFormDescription(course.description || '')
      setCourseFormDemoVideoUrl(course.demoVideoUrl || '')
      setCourseFormVideos(course.videos || [])
    } else {
      setEditingCourse(null)
      setCourseFormTitle('')
      setCourseFormDuration('')
      setCourseFormTag('')
      setCourseFormFeatures('')
      setCourseFormPopular(false)
      setCourseFormPrice(1999)
      setCourseFormDescription('')
      setCourseFormDemoVideoUrl('')
      setCourseFormVideos([])
    }
    setCourseFormFile(null)
    setCourseFormDemoVideoFile(null)
    setShowCourseForm(true)
  }

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploadingMedia(true)
      let imageUrl = editingCourse?.imageUrl || ''
      let demoVideoUrl = courseFormDemoVideoUrl

      if (courseFormFile) {
        const fileRef = sRef(storage, `course_images/${Date.now()}_${courseFormFile.name}`)
        const uploadResult = await uploadBytes(fileRef, courseFormFile)
        imageUrl = await getDownloadURL(uploadResult.ref)
      }

      if (courseFormDemoVideoFile) {
        const videoFileRef = sRef(storage, `course_demos/${Date.now()}_${courseFormDemoVideoFile.name}`)
        const uploadResult = await uploadBytes(videoFileRef, courseFormDemoVideoFile)
        demoVideoUrl = await getDownloadURL(uploadResult.ref)
      }

      const updatedVideos: CourseVideo[] = []
      for (const video of courseFormVideos) {
        const castVideo = video as any
        if (castVideo.file) {
          const lessonFileRef = sRef(storage, `course_lessons/${Date.now()}_${castVideo.file.name}`)
          const uploadResult = await uploadBytes(lessonFileRef, castVideo.file)
          const downloadUrl = await getDownloadURL(uploadResult.ref)
          updatedVideos.push({ title: video.title, url: downloadUrl })
        } else {
          updatedVideos.push({ title: video.title, url: video.url })
        }
      }

      const courseId = editingCourse ? editingCourse.id : `course_${Date.now()}`
      const newCourse: Omit<Course, 'id'> = {
        title: courseFormTitle,
        duration: courseFormDuration,
        tag: courseFormTag,
        features: courseFormFeatures.split(',').map(s => s.trim()).filter(Boolean),
        popular: courseFormPopular,
        price: courseFormPrice,
        description: courseFormDescription,
        demoVideoUrl,
        videos: updatedVideos,
        ...(imageUrl ? { imageUrl } : {})
      }

      await set(ref(db, `courses/${courseId}`), newCourse)

      // Refresh list
      const updatedList = editingCourse
        ? courses.map(c => c.id === courseId ? { id: courseId, ...newCourse } : c)
        : [...courses, { id: courseId, ...newCourse }]
      setCourses(updatedList)

      setShowCourseForm(false)
      setEditingCourse(null)
      setUploadingMedia(false)
    } catch (err) {
      console.error("Error saving course:", err)
      alert("Failed to save course.")
      setUploadingMedia(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return
    try {
      await set(ref(db, `courses/${courseId}`), null)
      setCourses(courses.filter(c => c.id !== courseId))
    } catch (err) {
      console.error("Error deleting course:", err)
    }
  }

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploadingMedia(true)
      let photo = galleryFormUrl

      if (galleryFormFile) {
        const fileRef = sRef(storage, `gallery/${Date.now()}_${galleryFormFile.name}`)
        const uploadResult = await uploadBytes(fileRef, galleryFormFile)
        photo = await getDownloadURL(uploadResult.ref)
      }

      if (!photo) {
        alert("Please specify a photo URL or upload an image file.")
        setUploadingMedia(false)
        return
      }

      const itemId = editingGallery ? editingGallery.id : `gallery_${Date.now()}`
      const newItem: GalleryItem = {
        id: itemId,
        cat: galleryFormCat,
        photo,
        label: galleryFormLabel,
        span: galleryFormSpan
      }

      await set(ref(db, `gallery/${itemId}`), newItem)

      // Refresh list
      const updatedList = editingGallery
        ? galleryItems.map(g => g.id === itemId ? newItem : g)
        : [...galleryItems, newItem]
      setGalleryItems(updatedList)

      setShowGalleryForm(false)
      setEditingGallery(null)
      setGalleryFormLabel('')
      setGalleryFormUrl('')
      setGalleryFormFile(null)
      setUploadingMedia(false)
    } catch (err) {
      console.error("Error saving gallery item:", err)
      alert("Failed to save gallery item.")
      setUploadingMedia(false)
    }
  }

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploadingMedia(true)
      let photo = testimonialFormUrl

      if (testimonialFormFile) {
        const fileRef = sRef(storage, `testimonials/${Date.now()}_${testimonialFormFile.name}`)
        const uploadResult = await uploadBytes(fileRef, testimonialFormFile)
        photo = await getDownloadURL(uploadResult.ref)
      }

      if (!photo) {
        alert("Please specify a photo URL or upload an image file.")
        setUploadingMedia(false)
        return
      }

      const testimonialId = editingTestimonial ? editingTestimonial.id : `testimonial_${Date.now()}`
      const newItem: TestimonialItem = {
        id: testimonialId,
        name: testimonialFormName,
        role: testimonialFormRole,
        text: testimonialFormText,
        photo
      }

      await set(ref(db, `testimonials/${testimonialId}`), newItem)

      // Refresh list
      const updatedList = editingTestimonial
        ? testimonialsList.map(t => t.id === testimonialId ? newItem : t)
        : [...testimonialsList, newItem]
      setTestimonialsList(updatedList)

      setShowTestimonialForm(false)
      setEditingTestimonial(null)
      setTestimonialFormName('')
      setTestimonialFormRole('')
      setTestimonialFormText('')
      setTestimonialFormUrl('')
      setTestimonialFormFile(null)
      setUploadingMedia(false)
    } catch (err) {
      console.error("Error saving testimonial:", err)
      alert("Failed to save testimonial.")
      setUploadingMedia(false)
    }
  }

  // ── Render Helpers ───────────────────────────────────────────────────────
  const filteredGallery = galleryFilter === 'All'
    ? galleryItems
    : galleryItems.filter(g => g.cat.toLowerCase() === galleryFilter.toLowerCase())

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false)
    setShowAdminPanel(false)
    if (id === 'Book Appointment' || id === 'book-appointment' || id === 'Enquire Now' || id === 'enquire-now') {
      setShowBookingModal(true)
      return
    }
    const el = document.getElementById(id.toLowerCase().replace(/\s+/g, '-'))
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Poppins, sans-serif', backgroundColor: '#FCFAF8', color: '#2E2E2E' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrolled || showAdminPanel ? 'rgba(255,255,255,0.97)' : 'transparent',
          boxShadow: scrolled || showAdminPanel ? '0 4px 30px rgba(183,122,217,0.12)' : 'none',
          backdropFilter: scrolled || showAdminPanel ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled || showAdminPanel ? 'blur(20px)' : 'none',
          borderBottom: scrolled || showAdminPanel ? '1px solid rgba(183,122,217,0.1)' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('home')}>
            <img src={siteImages?.logoUrl || logo} alt="Tamatman Logo" className="h-12 w-12 object-contain rounded-full" style={{ border: '2px solid rgba(183,122,217,0.4)' }} />
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.25rem', color: '#6E3AA8', lineHeight: 1.1 }}>Tamatman</div>
              <div style={{ fontSize: '0.65rem', color: '#B77AD9', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Ayur Yoga Center</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <button
                key={link}
                onClick={() => scrollTo(link)}
                className="nav-link"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: scrolled || showAdminPanel ? '#5A4A6A' : '#7a6a8a',
                  cursor: 'pointer',
                  transition: 'color 0.25s'
                }}
              >
                {link}
              </button>
            ))}
          </div>

          {/* User Auth Info / Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-full text-xs font-semibold transition-all border border-purple-200"
            >
              Enquire Now
            </button>
            {user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-all"
                    style={{
                      borderColor: showAdminPanel ? '#6E3AA8' : 'rgba(110,58,168,0.3)',
                      color: showAdminPanel ? 'white' : '#6E3AA8',
                      backgroundColor: showAdminPanel ? '#6E3AA8' : 'transparent',
                    }}
                  >
                    Admin Dashboard
                  </button>
                )}
                <div className="text-right">
                  <div className="text-sm font-semibold text-purple-900">{userProfile?.name}</div>
                  <button onClick={handleSignOut} className="text-xs text-red-500 hover:underline">Log Out</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setIsAdminLoginMode(true); setIsSignUpMode(false); setShowAuthModal(true) }}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-all underline cursor-pointer"
                >
                  Admin Login
                </button>
                <button
                  onClick={() => { setIsSignUpMode(false); setIsAdminLoginMode(false); setShowAuthModal(true) }}
                  className="btn-primary"
                  style={{ padding: '8px 24px', fontSize: '0.85rem' }}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Btn */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-purple-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <span className="text-2xl">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-purple-100 flex flex-col p-6 gap-4">
            {NAV_LINKS.map(link => (
              <button
                key={link}
                onClick={() => scrollTo(link)}
                style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: '1rem', color: '#5A4A6A', padding: '6px 0' }}
              >
                {link}
              </button>
            ))}
            <div className="h-px bg-purple-50 my-2" />
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-purple-900">Signed in as {userProfile?.name}</div>
                {isAdmin && (
                  <button
                    onClick={() => { setShowAdminPanel(!showAdminPanel); setMenuOpen(false) }}
                    className="w-full text-center py-2 rounded-xl bg-purple-100 text-purple-900 font-semibold"
                  >
                    Admin Panel
                  </button>
                )}
                <button onClick={() => { handleSignOut(); setMenuOpen(false) }} className="text-left text-red-500 font-medium">Log Out</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={() => { setIsSignUpMode(false); setIsAdminLoginMode(false); setShowAuthModal(true); setMenuOpen(false) }}
                  className="btn-primary w-full text-center py-3 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setIsAdminLoginMode(true); setIsSignUpMode(false); setShowAuthModal(true); setMenuOpen(false) }}
                  className="w-full text-center py-2.5 rounded-xl border border-purple-200 text-purple-700 font-semibold text-xs bg-purple-50/50 hover:bg-purple-50 transition-all"
                >
                  🔐 Admin Login
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Admin Dashboard Overlap View ───────────────────────────────── */}
      {showAdminPanel && isAdmin && (
        <div className="pt-24 min-h-screen bg-gray-50 px-6 pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <h1 className="text-3xl font-extrabold text-purple-950 font-serif">Admin Control Center</h1>
                <p className="text-purple-600 text-sm mt-1">Manage courses, website configuration, dynamic elements, bookings, and inquiries.</p>
              </div>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="bg-white border border-purple-200 text-purple-900 px-6 py-2.5 rounded-full font-medium hover:bg-purple-50 transition-all text-sm self-start"
              >
                ← Back to Website
              </button>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-purple-100 mb-8 overflow-x-auto gap-2">
              {[
                { key: 'courses', label: '📚 Courses' },
                { key: 'site_images', label: '⚙️ Site Images' },
                { key: 'gallery', label: '🖼️ Gallery' },
                { key: 'testimonials', label: '💬 Testimonials' },
                { key: 'bookings', label: '📅 Bookings' },
                { key: 'inquiries', label: '🌿 Inquiries' },
                { key: 'attempts', label: '📈 Leads & Attempts' },
                { key: 'users', label: '👥 Users' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAdminTab(tab.key as any)}
                  className={`px-6 py-3 font-semibold text-sm whitespace-nowrap transition-all border-b-2 ${
                    adminTab === tab.key
                      ? 'border-purple-600 text-purple-900'
                      : 'border-transparent text-gray-500 hover:text-purple-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Courses Management */}
            {adminTab === 'courses' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Dynamic Courses List ({courses.length})</h2>
                  <button onClick={() => openCourseForm()} className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-full">+ Add New Course</button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map(course => (
                    <div key={course.id} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-50 flex flex-col justify-between">
                      <div>
                        {course.imageUrl && (
                          <img src={course.imageUrl} alt={course.title} className="w-full h-40 object-cover rounded-xl mb-4" />
                        )}
                        <span className="inline-block px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-xs font-semibold text-purple-700 mb-2">{course.tag}</span>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{course.title}</h3>
                        <p className="text-purple-600 font-medium text-xs mb-2">Duration: {course.duration} | Price: ₹{course.price}</p>
                        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{course.description || 'No description added.'}</p>
                        <div className="text-[10px] text-gray-400 font-semibold mb-3">Lessons uploaded: {course.videos ? course.videos.length : 0}</div>
                        <ul className="text-xs text-gray-600 space-y-1 mb-6">
                          {(course.features || []).map((f, i) => <li key={i}>• {f}</li>)}
                        </ul>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => openCourseForm(course)} className="flex-1 py-2 text-center text-xs font-medium border border-purple-200 text-purple-900 rounded-xl hover:bg-purple-50 transition-all">Edit</button>
                        <button onClick={() => handleDeleteCourse(course.id)} className="flex-1 py-2 text-center text-xs font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Site Images config */}
            {adminTab === 'site_images' && (
              <div className="bg-white p-8 rounded-2xl border border-purple-100 shadow-sm max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Custom Site Images</h2>
                <p className="text-xs text-gray-500 mb-6">Modify branding logo and key section banners by either uploading a file or pasting a URL.</p>

                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    setUploadingMedia(true)
                    await set(ref(db, 'site_images'), siteImages)
                    alert('Images configuration updated successfully! 🙏')
                    setUploadingMedia(false)
                  } catch (err) {
                    console.error(err)
                    alert('Failed to save configuration settings.')
                    setUploadingMedia(false)
                  }
                }} className="space-y-6">
                  {[
                    { key: 'logoUrl', label: 'Ayur Yoga Center Logo', defaultVal: logo },
                    { key: 'heroUrl', label: 'Hero Background Image', defaultVal: '1506126613408-eca07ce68773' },
                    { key: 'aboutUrl1', label: 'About Page Image 1', defaultVal: '1506126613408-eca07ce68773' },
                    { key: 'aboutUrl2', label: 'About Page Image 2', defaultVal: '1545389336-cf090694435e' },
                    { key: 'vedantaUrl', label: 'Vedanta Trails Background', defaultVal: '1441974231531-c6227db76b6e' },
                    { key: 'contactUrl', label: 'Contact Location Bkg Image', defaultVal: '1501854140801-50d01698950b' }
                  ].map((field) => {
                    const val = siteImages[field.key as keyof SiteImages] || '';
                    return (
                      <div key={field.key} className="p-4 bg-purple-50/20 rounded-xl border border-purple-100/50 flex flex-col sm:flex-row gap-4 justify-between items-start">
                        <div className="flex-1 space-y-2 w-full">
                          <label className="block text-xs font-bold text-purple-950">{field.label}</label>
                          <input
                            type="text"
                            value={val}
                            onChange={e => setSiteImages({ ...siteImages, [field.key]: e.target.value })}
                            className="form-input text-xs"
                            placeholder="Image URL or Unsplash ID"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-semibold">Or upload file:</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files ? e.target.files[0] : null
                                if (file) {
                                  try {
                                    setUploadingMedia(true)
                                    const fileRef = sRef(storage, `site_config/${field.key}_${Date.now()}`)
                                    const uploadResult = await uploadBytes(fileRef, file)
                                    const downloadUrl = await getDownloadURL(uploadResult.ref)
                                    setSiteImages({ ...siteImages, [field.key]: downloadUrl })
                                    setUploadingMedia(false)
                                    alert(`Successfully uploaded ${file.name}! Please hit Save Config below.`)
                                  } catch (err) {
                                    console.error(err)
                                    alert('File upload failed')
                                    setUploadingMedia(false)
                                  }
                                }
                              }}
                              className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:bg-purple-100"
                            />
                          </div>
                        </div>
                        <div className="w-16 h-16 rounded-xl border border-purple-100 overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                          <UnsplashImg id={val || field.defaultVal} w={80} h={80} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )
                  })}

                  <button
                    type="submit"
                    disabled={uploadingMedia}
                    className="btn-primary w-full py-3.5 rounded-xl font-bold tracking-wide disabled:opacity-50 mt-4"
                  >
                    {uploadingMedia ? 'Uploading & Processing...' : 'Save Configuration Banners'}
                  </button>
                </form>
              </div>
            )}

            {/* Gallery items panel */}
            {adminTab === 'gallery' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Dynamic Gallery Items ({galleryItems.length})</h2>
                  <button
                    onClick={() => {
                      setEditingGallery(null)
                      setGalleryFormCat('yoga')
                      setGalleryFormLabel('')
                      setGalleryFormSpan('normal')
                      setGalleryFormUrl('')
                      setGalleryFormFile(null)
                      setShowGalleryForm(true)
                    }}
                    className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-full"
                  >
                    + Add Photo
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {galleryItems.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-purple-50 flex flex-col justify-between">
                      <div>
                        <div className="w-full h-32 rounded-xl overflow-hidden mb-3">
                          <UnsplashImg id={item.photo} w={200} h={150} alt={item.label} className="w-full h-full object-cover" />
                        </div>
                        <span className="inline-block px-2.5 py-0.5 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-semibold text-purple-700 mb-1">{item.cat.toUpperCase()}</span>
                        <h4 className="text-sm font-bold text-gray-900 mb-1 leading-tight">{item.label}</h4>
                        <p className="text-[10px] text-gray-400 mb-4">Grid Span: {item.span}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingGallery(item)
                            setGalleryFormCat(item.cat)
                            setGalleryFormLabel(item.label)
                            setGalleryFormSpan(item.span)
                            setGalleryFormUrl(item.photo)
                            setGalleryFormFile(null)
                            setShowGalleryForm(true)
                          }}
                          className="flex-1 py-1.5 text-center text-[10px] font-semibold border border-purple-200 text-purple-900 rounded-lg hover:bg-purple-50 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this gallery item?")) return
                            try {
                              await set(ref(db, `gallery/${item.id}`), null)
                              setGalleryItems(galleryItems.filter(g => g.id !== item.id))
                            } catch (err) {
                              console.error(err)
                            }
                          }}
                          className="flex-1 py-1.5 text-center text-[10px] font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials panel */}
            {adminTab === 'testimonials' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Dynamic Testimonials ({testimonialsList.length})</h2>
                  <button
                    onClick={() => {
                      setEditingTestimonial(null)
                      setTestimonialFormName('')
                      setTestimonialFormRole('')
                      setTestimonialFormText('')
                      setTestimonialFormUrl('')
                      setTestimonialFormFile(null)
                      setShowTestimonialForm(true)
                    }}
                    className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-full"
                  >
                    + Add Testimonial
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testimonialsList.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-200 flex-shrink-0">
                            <UnsplashImg id={t.photo} w={50} h={50} alt={t.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight">{t.name}</h4>
                            <p className="text-[10px] text-purple-600 font-semibold">{t.role}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 italic mb-6">"{t.text}"</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTestimonial(t)
                            setTestimonialFormName(t.name)
                            setTestimonialFormRole(t.role)
                            setTestimonialFormText(t.text)
                            setTestimonialFormUrl(t.photo)
                            setTestimonialFormFile(null)
                            setShowTestimonialForm(true)
                          }}
                          className="flex-1 py-1.5 text-center text-[10px] font-semibold border border-purple-200 text-purple-900 rounded-lg hover:bg-purple-50 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this testimonial?")) return
                            try {
                              await set(ref(db, `testimonials/${t.id}`), null)
                              setTestimonialsList(testimonialsList.filter(item => item.id !== t.id))
                            } catch (err) {
                              console.error(err)
                            }
                          }}
                          className="flex-1 py-1.5 text-center text-[10px] font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings View */}
            {adminTab === 'bookings' && (
              <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50 text-purple-900 border-b border-purple-100">
                        <th className="p-4 font-bold">Client Name</th>
                        <th className="p-4 font-bold">Phone / Email</th>
                        <th className="p-4 font-bold">Requested Program</th>
                        <th className="p-4 font-bold">Preferred Time</th>
                        <th className="p-4 font-bold">Additional Note</th>
                        <th className="p-4 font-bold">Date / Time Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsList.map(booking => (
                        <tr key={booking.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                          <td className="p-4 font-semibold text-gray-900">{booking.name}</td>
                          <td className="p-4">
                            <div>{booking.phone}</div>
                            <div className="text-xs text-gray-500">{booking.email}</div>
                          </td>
                          <td className="p-4 font-medium text-purple-700">{booking.program}</td>
                          <td className="p-4">
                            <div>{booking.date}</div>
                            <div className="text-xs text-gray-500">{booking.time}</div>
                          </td>
                          <td className="p-4 text-xs text-gray-600 max-w-xs truncate">{booking.message || '—'}</td>
                          <td className="p-4 text-xs text-gray-500">{new Date(booking.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                      {bookingsList.length === 0 && (
                        <tr><td colSpan={6} className="text-center p-8 text-gray-500">No booking appointments found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inquiries View */}
            {adminTab === 'inquiries' && (
              <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50 text-purple-900 border-b border-purple-100">
                        <th className="p-4 font-bold">Name</th>
                        <th className="p-4 font-bold">Phone / Email</th>
                        <th className="p-4 font-bold">Requested Date</th>
                        <th className="p-4 font-bold">Message Details</th>
                        <th className="p-4 font-bold">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiriesList.map(inq => (
                        <tr key={inq.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                          <td className="p-4 font-semibold text-gray-900">{inq.name}</td>
                          <td className="p-4">
                            <div>{inq.phone}</div>
                            <div className="text-xs text-gray-500">{inq.email || '—'}</div>
                          </td>
                          <td className="p-4 text-purple-700 font-medium">{inq.date || 'Flexible'}</td>
                          <td className="p-4 text-xs text-gray-600 max-w-xs">{inq.message || '—'}</td>
                          <td className="p-4 text-xs text-gray-500">{new Date(inq.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                      {inquiriesList.length === 0 && (
                        <tr><td colSpan={5} className="text-center p-8 text-gray-500">No retreat inquiries found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attempts / Leads tracking View */}
            {adminTab === 'attempts' && (
              <div>
                {(() => {
                  const total = attemptsList.length
                  const submitted = attemptsList.filter(a => a.status === 'submitted').length
                  const abandoned = attemptsList.filter(a => a.status === 'abandoned').length
                  const typing = attemptsList.filter(a => a.status === 'typing').length
                  const opened = attemptsList.filter(a => a.status === 'opened').length
                  const convRate = total > 0 ? Math.round((submitted / total) * 100) : 0

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm text-center">
                        <div className="text-xs font-semibold text-gray-400 uppercase">Total Hits</div>
                        <div className="text-2xl font-black text-purple-950 mt-1">{total}</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm text-center">
                        <div className="text-xs font-semibold text-green-500 uppercase">Submissions</div>
                        <div className="text-2xl font-black text-green-600 mt-1">{submitted}</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm text-center">
                        <div className="text-xs font-semibold text-amber-500 uppercase">Abandoned Leads</div>
                        <div className="text-2xl font-black text-amber-600 mt-1">{abandoned}</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm text-center">
                        <div className="text-xs font-semibold text-indigo-500 uppercase">Warm Leads</div>
                        <div className="text-2xl font-black text-indigo-600 mt-1">{typing}</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm text-center col-span-2 md:col-span-1">
                        <div className="text-xs font-semibold text-purple-500 uppercase">Conversion Rate</div>
                        <div className="text-2xl font-black text-purple-600 mt-1">{convRate}%</div>
                      </div>
                    </div>
                  )
                })()}

                <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-purple-50 text-purple-900 border-b border-purple-100">
                          <th className="p-4 font-bold">User Identity</th>
                          <th className="p-4 font-bold">Leads status</th>
                          <th className="p-4 font-bold">Captured Draft details</th>
                          <th className="p-4 font-bold">Time Triggered</th>
                          <th className="p-4 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attemptsList.map(a => (
                          <tr key={a.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                            <td className="p-4">
                              {a.userName ? (
                                <div>
                                  <div className="font-semibold text-gray-900">{a.userName}</div>
                                  <div className="text-[10px] text-purple-600 font-mono">UID: {a.userId?.slice(0, 6)}...</div>
                                </div>
                              ) : (
                                <div className="text-gray-400 italic">Guest Practitioner</div>
                              )}
                              <div className="text-xs text-gray-500 mt-0.5">{a.userEmail || 'No email logged'}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                a.status === 'submitted' ? 'bg-green-100 text-green-800' :
                                a.status === 'abandoned' ? 'bg-red-100 text-red-800' :
                                a.status === 'typing' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {a.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-gray-700 max-w-sm">
                              {a.formData ? (
                                <div className="space-y-1 bg-purple-50/20 p-2.5 rounded-xl border border-purple-100/50">
                                  {a.formData.name && <div>👤 <span className="font-semibold">{a.formData.name}</span></div>}
                                  {a.formData.phone && <div>📞 <span className="font-semibold text-purple-700">{a.formData.phone}</span></div>}
                                  {a.formData.email && <div>✉️ <span>{a.formData.email}</span></div>}
                                  {a.formData.program && <div>🧘 Program: <span className="font-semibold">{a.formData.program}</span></div>}
                                  {a.formData.message && <div className="text-gray-500 italic mt-1 font-serif">"{a.formData.message}"</div>}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No input details captured yet.</span>
                              )}
                            </td>
                            <td className="p-4 text-xs text-gray-500">
                              {new Date(a.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4">
                              {a.formData && a.formData.phone && (
                                <a
                                  href={`tel:${a.formData.phone}`}
                                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold rounded-lg text-xs transition-all inline-block"
                                >
                                  Call Lead 📞
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                        {attemptsList.length === 0 && (
                          <tr><td colSpan={5} className="text-center p-8 text-gray-500">No activity or attempts recorded yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Users List */}
            {adminTab === 'users' && (
              <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-purple-50 text-purple-900 border-b border-purple-100">
                        <th className="p-4 font-bold">UID</th>
                        <th className="p-4 font-bold">User Name</th>
                        <th className="p-4 font-bold">Email Address</th>
                        <th className="p-4 font-bold">Role</th>
                        <th className="p-4 font-bold">Purchased Course IDs</th>
                        <th className="p-4 font-bold">Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.uid} className="border-b border-purple-50 hover:bg-purple-50/50">
                          <td className="p-4 text-xs text-gray-400 font-mono">{u.uid.slice(0, 8)}...</td>
                          <td className="p-4 font-semibold text-gray-950">{u.name}</td>
                          <td className="p-4">{u.email}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                            }`}>{u.role}</span>
                          </td>
                          <td className="p-4 text-xs text-purple-700">
                            {u.purchasedCourses ? Object.keys(u.purchasedCourses).join(', ') : 'None'}
                          </td>
                          <td className="p-4 text-xs text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Website Sections */}
      {!showAdminPanel && (
        <>
          {/* ── Hero ────────────────────────────────────────────────────────── */}
          <Section id="home" className="min-h-screen relative flex items-center justify-center pt-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFF6FD 0%, #FAF0F9 45%, #F4EAFF 100%)' }}>
            <div className="absolute inset-0 z-0">
              <div className="absolute w-[500px] h-[500px] rounded-full filter blur-[120px] opacity-25" style={{ background: '#B77AD9', top: '-10%', left: '5%' }} />
              <div className="absolute w-[600px] h-[600px] rounded-full filter blur-[150px] opacity-20" style={{ background: '#F4B4D9', bottom: '-15%', right: '-5%' }} />
            </div>

            <span className="lotus-petal animate-float" style={{ top: '22%', left: '8%', fontSize: '2.5rem' }}>🌸</span>
            <span className="lotus-petal animate-float-b" style={{ top: '35%', right: '10%', fontSize: '3rem' }}>🧘</span>
            <span className="lotus-petal animate-float" style={{ bottom: '20%', left: '15%', fontSize: '2rem' }}>✨</span>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="section-label mb-6">🌸 Holistic Ayur Yoga Retreat</div>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', fontWeight: 800, color: '#6E3AA8', lineHeight: 1.15 }}>
                  Awaken Your <br />
                  <span style={{ background: 'linear-gradient(90deg, #6E3AA8 20%, #B77AD9 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Inner Sanctuary
                  </span>
                </h1>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: '#B77AD9', marginTop: 16 }}>
                  Unite your Body, Mind and Spirit with authentic Ayurvedic wisdom.
                </p>
                <p style={{ fontSize: '0.95rem', color: '#7a6a8a', maxWidth: 480, marginTop: 12, lineHeight: 1.75 }}>
                  Discover premium Yoga training, Chakra balancing, and Vedic chanting in a tranquil nature sanctuary. Designed for modern lifestyles seeking ancient balance.
                </p>
                <div className="flex flex-wrap gap-4 mt-8">
                  <button onClick={() => scrollTo('programs')} className="btn-primary glow-btn" style={{ padding: '16px 36px', fontSize: '1rem' }}>
                    Explore Programs 🧘
                  </button>
                  <button onClick={() => scrollTo('enquire-now')} className="btn-primary glow-btn" style={{ padding: '16px 36px', fontSize: '1rem' }}>
                    Enquire Now
                  </button>
                </div>
              </div>

              <div className="relative flex justify-center">
                <div className="absolute inset-0 rounded-full filter blur-[60px] opacity-40" style={{ background: 'radial-gradient(circle, #B77AD9, transparent 70%)', transform: 'scale(1.2)' }} />
                <div className="w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full overflow-hidden border-[10px] border-white relative z-10" style={{ boxShadow: '0 24px 70px rgba(110,58,168,0.18)' }}>
                  <UnsplashImg id={siteImages?.heroUrl || "1506126613408-eca07ce68773"} w={700} h={700} alt="Holistic yoga meditation pose" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Stats Counter ───────────────────────────────────────────────── */}
          <Section className="py-16 px-6" style={{ backgroundColor: '#FCFAF8' }}>
            <div ref={statsRef} className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { target: 12, suffix: '+', label: 'Years Experience' },
                { target: 8, suffix: 'k+', label: 'Happy Practitioners' },
                { target: 15, suffix: '+', label: 'Certified Masters' },
                { target: 100, suffix: '%', label: 'Natural & Satvik' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 800, color: '#6E3AA8' }}>
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} active={statsVisible} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#B77AD9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── About Tamatman ────────────────────────────────────────────── */}
          <Section id="about" className="py-24 px-6" style={{ backgroundColor: '#FCFAF8' }}>
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl filter blur-[40px] opacity-30" style={{ background: '#B77AD9' }} />
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <UnsplashImg id={siteImages?.aboutUrl1 || "1506126613408-eca07ce68773"} w={350} h={450} alt="Yoga morning stretch" className="rounded-3xl object-cover w-full h-[280px]" />
                  <UnsplashImg id={siteImages?.aboutUrl2 || "1545389336-cf090694435e"} w={350} h={450} alt="Forest meditation alignment" className="rounded-3xl object-cover w-full h-[280px] mt-8" />
                </div>
              </div>

              <div>
                <div className="section-label mb-6">🌿 Our Vision</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4.5vw, 3rem)', fontWeight: 700, color: '#6E3AA8', lineHeight: 1.25 }}>
                  Restoring Pure Balance in a Fragmented World
                </h2>
                <p style={{ fontSize: '0.95rem', color: '#7a6a8a', marginTop: 16, lineHeight: 1.8 }}>
                  Tamatman Ayur Yoga Center is built on authentic Vedic principles. We focus on holistic realignment, rather than just exercise. By combining Hatha Yoga with custom Ayurvedic dietary protocols, dynamic breathing techniques, and Vedic chanting, we open the gateways to physical health and spiritual peace.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mt-8 text-sm font-semibold text-purple-900">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🌸</span> Traditional Vedic Lineage
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🌿</span> Personalized Dosha Diet
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🧘</span> Immersive Nature Retreats
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✨</span> Certified Ayur Yoga Acharyas
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Programs / Services ───────────────────────────────────────── */}
          <Section id="programs" className="py-24 px-6" style={{ backgroundColor: '#F7F2FB' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>🧘 Our Services</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Holistic Wellness Programs
                </h2>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: '#B77AD9', marginTop: 8 }}>
                  Every program designed to restore balance and ignite vitality
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {SERVICES.map((svc, i) => (
                  <div key={i} className="service-card">
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">{svc.icon}</div>
                    <h3 className="text-sm sm:text-lg font-bold font-serif text-purple-950 mb-2 sm:mb-3">{svc.title}</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {svc.items.map((item, j) => (
                        <li key={j} className="text-xs sm:text-sm text-gray-500 py-0.5 sm:py-1 flex items-center gap-1.5 sm:gap-2">
                          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#B77AD9', flexShrink: 0 }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Courses (Razorpay Integration) ────────────────────────────── */}
          <Section id="courses" className="py-24 px-6" style={{ backgroundColor: '#FCFAF8' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>Interactive Courses</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Transform With Expert Guidance
                </h2>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: '#B77AD9', marginTop: 8 }}>
                  Purchase courses online and begin practicing under direct mentorship
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, i) => {
                  const owned = userProfile?.purchasedCourses?.[course.id]
                  return (
                    <div key={course.id} onClick={() => setSelectedCourseDetails(course)} className={`course-card cursor-pointer ${course.popular ? 'popular' : ''}`}>
                      {course.popular && (
                        <div style={{ position: 'absolute', top: 20, right: 20, background: 'linear-gradient(135deg, #B77AD9, #D68CEB)', color: 'white', fontSize: '0.7rem', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 50 }}>
                          POPULAR
                        </div>
                      )}
                      {course.imageUrl && (
                        <img src={course.imageUrl} alt={course.title} className="w-full h-44 object-cover rounded-2xl mb-4" />
                      )}
                      <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, rgba(183,122,217,0.1), rgba(243,180,217,0.1))', border: '1px solid rgba(183,122,217,0.2)', borderRadius: 50, padding: '4px 14px', fontSize: '0.75rem', color: '#B77AD9', fontWeight: 600, marginBottom: 16 }}>
                        {course.tag}
                      </div>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.25rem', color: '#2E2E2E', marginBottom: 6 }}>{course.title}</h3>
                      <div className="flex justify-between items-center mb-4">
                        <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: '#B77AD9' }}>
                          Duration: {course.duration}
                        </span>
                        <span className="text-lg font-bold text-purple-950">₹{course.price}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                        {(course.features || []).map((f, j) => (
                          <li key={j} style={{ fontSize: '0.875rem', color: '#5a4a6a', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: '#B77AD9', fontSize: '1rem' }}>✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourseDetails(course);
                        }}
                        className={`w-full py-3 rounded-2xl font-bold tracking-wide transition-all ${
                          owned
                            ? 'bg-green-100 text-green-700 cursor-default border border-green-200'
                            : 'btn-primary text-white glow-btn'
                        }`}
                      >
                        {owned ? 'Access Course' : 'View Details & Buy'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* ── Vedanta Trails ────────────────────────────────────────────── */}
          <Section id="vedanta-trails" className="py-0 relative overflow-hidden">
            <div className="absolute inset-0">
              <UnsplashImg id={siteImages?.vedantaUrl || "1441974231531-c6227db76b6e"} w={1920} h={1000} alt="Forest nature retreat" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.85) 0%, rgba(110,58,168,0.75) 100%)' }} />
            </div>

            <span className="lotus-petal animate-float" style={{ top: '10%', right: '5%', fontSize: '3rem' }}>🌿</span>
            <span className="lotus-petal animate-float-b" style={{ bottom: '15%', left: '4%', fontSize: '2.5rem' }}>🪷</span>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
              <div className="text-center mb-16">
                <div className="section-label" style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.25)', color: 'white', display: 'inline-flex', margin: '0 auto 16px' }}>
                  🌲 Premium Retreat
                </div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 700, color: 'white' }}>
                  Vedanta Trails
                </h2>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: 'rgba(243,180,217,0.9)', margin: '8px 0 8px' }}>
                  2 Nights • 3 Days Ayur Yoga Nature Retreat
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 560, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
                  Reconnect with Nature, Ancient Wisdom and Inner Peace in an immersive forest sanctuary away from the modern world.
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <h3 className="text-center font-serif text-xl text-white mb-6">Retreat Activities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {VEDANTA_ACTIVITIES.map((act, i) => (
                    <div key={i} className="glass rounded-2xl px-4 py-3 flex items-center justify-center gap-3 card-hover" style={{ cursor: 'default' }}>
                      <span style={{ fontSize: '1.4rem' }}>{act.emoji}</span>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{act.label}</span>
                    </div>
                  ))}
                </div>

                <div className="glass rounded-2xl p-6 mt-10 text-center max-w-xl mx-auto">
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: 'white', marginBottom: 12 }}>Upcoming Dates</h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, rgba(183,122,217,0.3), rgba(243,180,217,0.25))', borderRadius: 50, padding: '8px 24px', color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 500 }}>
                    <span>📅</span> Dates Coming Soon — Book an Appointment to Join!
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Why Choose ───────────────────────────────────────────────── */}
          <Section className="py-24 px-6" style={{ backgroundColor: '#F7F2FB' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>💎 Why Tamatman</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Why Choose Tamatman
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {WHY_CHOOSE.map((item, i) => (
                  <div key={i} className="card-hover text-center p-4 sm:p-8 rounded-2xl bg-white" style={{ boxShadow: '0 6px 24px rgba(183,122,217,0.08)', border: '1px solid rgba(183,122,217,0.1)' }}>
                    <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">{item.icon}</div>
                    <h3 className="text-xs sm:text-sm font-bold font-serif text-purple-950 mb-1.5 sm:mb-2">{item.title}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Gallery ───────────────────────────────────────────────────── */}
          <Section id="gallery" className="py-24 px-6" style={{ backgroundColor: '#FCFAF8' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>🖼 Gallery</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Moments of Mindfulness
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mb-10">
                {GALLERY_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setGalleryFilter(f)}
                    className="px-6 py-2.5 rounded-full font-medium text-sm transition-all"
                    style={{
                      background: galleryFilter === f ? 'linear-gradient(90deg, #6E3AA8, #B77AD9)' : 'white',
                      color: galleryFilter === f ? 'white' : '#7a6a8a',
                      border: '1.5px solid',
                      borderColor: galleryFilter === f ? 'transparent' : 'rgba(183,122,217,0.2)',
                      boxShadow: galleryFilter === f ? '0 4px 15px rgba(110,58,168,0.25)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="gallery-grid">
                {filteredGallery.map(item => (
                  <div
                    key={item.id}
                    className={`gallery-item ${item.span} relative rounded-2xl overflow-hidden cursor-pointer`}
                    onClick={() => setLightbox({ id: item.photo, label: item.label })}
                  >
                    <UnsplashImg id={item.photo} w={400} h={500} alt={item.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent flex items-end p-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
                      <div className="text-white text-sm font-semibold tracking-wide font-serif">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Testimonials ──────────────────────────────────────────────── */}
          <Section id="testimonials" className="py-24 px-6 relative overflow-hidden" style={{ backgroundColor: '#F7F2FB' }}>
            <div className="absolute w-[400px] h-[400px] rounded-full filter blur-[120px] opacity-15" style={{ background: '#B77AD9', top: '10%', left: '-10%' }} />

            <div className="max-w-4xl mx-auto relative z-10">
              <div className="text-center mb-12">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>💬 Feedbacks</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Stories of Transformation
                </h2>
              </div>

              <div className="min-h-[280px] flex items-center">
                {testimonialsList.map((t, idx) => (
                  <div
                    key={idx}
                    className="transition-all duration-700 w-full"
                    style={{
                      display: idx === testimonialIdx ? 'block' : 'none',
                      opacity: idx === testimonialIdx ? 1 : 0,
                      transform: idx === testimonialIdx ? 'translateY(0)' : 'translateY(15px)'
                    }}
                  >
                    <div className="bg-white rounded-3xl p-8 sm:p-12 relative" style={{ boxShadow: '0 16px 40px rgba(110,58,168,0.06)', border: '1px solid rgba(183,122,217,0.1)' }}>
                      <span className="absolute -top-6 -left-2 text-[6rem] leading-none opacity-10 select-none text-purple-900">“</span>
                      <p className="text-lg italic text-purple-950 font-serif leading-relaxed mb-6 relative z-10">
                        {t.text}
                      </p>
                      <div className="flex items-center gap-4">
                        <UnsplashImg id={t.photo} w={120} h={120} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-purple-950">{t.name}</div>
                          <div className="text-xs text-purple-500 font-medium tracking-wide">{t.role}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 mt-8">
                {testimonialsList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTestimonialIdx(i)}
                    style={{
                      width: i === testimonialIdx ? 24 : 10,
                      height: 10,
                      borderRadius: 5,
                      background: i === testimonialIdx ? 'linear-gradient(90deg, #6E3AA8, #B77AD9)' : 'rgba(183,122,217,0.25)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </Section>



          {/* ── Contact ───────────────────────────────────────────────────── */}
          <Section id="contact" className="py-24 px-6" style={{ backgroundColor: '#F7F2FB' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <div className="section-label" style={{ margin: '0 auto 16px' }}>📍 Find Us</div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#6E3AA8' }}>
                  Visit Tamatman
                </h2>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {[
                    { icon: '📍', title: 'Address', lines: ['Tamatman Ayur Yoga Center', 'DD 231, Street No. 293, DD Block(Newtown)', 'Action Area I, Newtown, Kolkata, West Bengal 700156'] },
                    { icon: '📞', title: 'Phone', lines: ['08910343584'], isPhone: true },
                    { icon: '✉️', title: 'Email', lines: ['info@tamatman.com', 'bookings@tamatman.com'] },
                    { icon: '⏰', title: 'Opening Hours', lines: ['Everyday: 6:30 AM – 7:30 PM'] },
                  ].map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 flex gap-4" style={{ boxShadow: '0 4px 16px rgba(183,122,217,0.08)', border: '1px solid rgba(183,122,217,0.1)' }}>
                      <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 600, color: '#6E3AA8', marginBottom: 4 }}>{item.title}</div>
                        {item.isPhone ? (
                          <a
                            href="tel:08910343584"
                            className="inline-block mt-1 px-4 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-lg text-xs font-semibold transition-all"
                          >
                            Call 08910343584 📞
                          </a>
                        ) : (
                          item.lines.map((l, j) => <div key={j} style={{ fontSize: '0.875rem', color: '#7a6a8a', lineHeight: 1.65 }}>{l}</div>)
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-2 relative rounded-3xl overflow-hidden" style={{ minHeight: 400 }}>
                  <UnsplashImg id={siteImages?.contactUrl || "1501854140801-50d01698950b"} w={900} h={500} alt="Serene nature - Tamatman location" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(110,58,168,0.6), rgba(183,122,217,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '24px 36px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📍</div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: 'white', marginBottom: 4 }}>Tamatman Ayur Yoga Center</div>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>DD 231, Block DD, Newtown, Kolkata 700156</div>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=DD+231,+Street+No.+293,+DD+Block(Newtown),+Action+Area+I,+Newtown,+Kolkata,+West+Bengal+700156"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 28px', fontSize: '0.875rem' }}
                      >
                        Open in Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer style={{ backgroundColor: '#1a0d2e', color: 'white', padding: '64px 24px 32px' }}>
            <div className="max-w-7xl mx-auto">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12" style={{ borderBottom: '1px solid rgba(183,122,217,0.2)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <img src={siteImages?.logoUrl || logo} alt="Tamatman Logo" className="h-14 w-14 object-contain rounded-full" style={{ border: '2px solid rgba(183,122,217,0.4)' }} />
                    <div>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.15rem', color: 'white' }}>Tamatman</div>
                      <div style={{ fontSize: '0.65rem', color: '#B77AD9', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ayur Yoga Center</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                    A sanctuary of holistic wellness rooted in ancient Vedic wisdom, where body, mind and soul unite in harmony.
                  </p>
                </div>

                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: 'white', marginBottom: 20 }}>Quick Links</h4>
                  <div className="flex flex-col gap-2">
                    {['Home', 'About', 'Programs', 'Courses', 'Vedanta Trails', 'Gallery', 'Testimonials', 'Contact'].map(l => (
                      <button
                        key={l}
                        onClick={() => scrollTo(l)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', textAlign: 'left', padding: '2px 0' }}
                      >
                        {l}
                      </button>
                    ))}
                    <button
                      onClick={() => { setIsAdminLoginMode(true); setIsSignUpMode(false); setShowAuthModal(true) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#B77AD9', textAlign: 'left', padding: '2px 0', textDecoration: 'underline' }}
                    >
                      🔐 Admin Login
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: 'white', marginBottom: 20 }}>Programs</h4>
                  <div className="flex flex-col gap-2">
                    {['Traditional Yoga', 'Power Yoga', 'Meditation', 'Zumba Classes', 'Aerobics', 'Weight Loss', 'Chakra Healing', 'Vedic Chanting'].map(p => (
                      <div key={p} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', padding: '2px 0' }}>
                        • {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: 'white', marginBottom: 12 }}>Stay Connected</h4>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, marginBottom: 16 }}>
                    Subscribe to receive wellness tips, upcoming retreat dates, and exclusive offers.
                  </p>
                  <form onSubmit={e => { e.preventDefault(); alert("Subscribed! 🙏") }} className="flex flex-col gap-3">
                    <input
                      type="email"
                      placeholder="Your email address"
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'white', borderColor: 'rgba(183,122,217,0.3)' }}
                    />
                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.85rem' }}>
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>

              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  © 2026 Tamatman Ayur Yoga Center. All rights reserved.
                </p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Crafted with 🌸 for holistic wellness
                </p>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* ── Auth Modal (Login / Sign Up) ────────────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-purple-100">
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(''); setIsAdminLoginMode(false) }}
              className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold font-serif text-purple-950 mb-2">
              {isAdminLoginMode ? '🔐 Admin Control Center' : isSignUpMode ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-500 text-xs mb-6">
              {isAdminLoginMode ? 'Enter administrative login credentials.' : isSignUpMode ? 'Register to enroll in certified courses and tracks.' : 'Sign in to access your purchased courses.'}
            </p>

            {authError && (
              <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl mb-4 font-medium border border-red-100">
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {isSignUpMode && !isAdminLoginMode && (
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="form-input"
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="form-input"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="form-input"
              />
              <button type="submit" className="btn-primary w-full py-3.5 text-sm font-bold tracking-wide rounded-xl mt-2 glow-btn">
                {isAdminLoginMode ? 'Admin Login 🔑' : isSignUpMode ? 'Register Account 🙏' : 'Sign In'}
              </button>
            </form>

            {!isAdminLoginMode && (
              <div className="text-center mt-6 text-xs text-gray-500">
                {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthError('') }}
                  className="text-purple-700 font-semibold hover:underline"
                >
                  {isSignUpMode ? 'Sign In' : 'Create One'}
                </button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-purple-50">
              <button
                onClick={() => { setIsAdminLoginMode(!isAdminLoginMode); setAuthError(''); setIsSignUpMode(false) }}
                className="text-purple-600 hover:text-purple-800 text-xs font-semibold underline tracking-wide block mx-auto"
              >
                {isAdminLoginMode ? '← Back to Standard Sign In' : '🔐 Access Admin Portal Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Course Create / Edit Form Modal (Admin) ───────────────────────── */}
      {showCourseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative border border-purple-100 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowCourseForm(false)} className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none">✕</button>
            <h2 className="text-xl font-bold font-serif text-purple-950 mb-6">
              {editingCourse ? 'Edit Yoga Course' : 'Create New Course'}
            </h2>

            <form onSubmit={handleSaveCourse} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Course Title *</label>
                <input type="text" required value={courseFormTitle} onChange={e => setCourseFormTitle(e.target.value)} className="form-input" placeholder="e.g. Yoga Foundation Course" />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Course Description *</label>
                <textarea required rows={3} value={courseFormDescription} onChange={e => setCourseFormDescription(e.target.value)} className="form-input" placeholder="Enter course description overview..." style={{ resize: 'none' }} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Duration *</label>
                  <input type="text" required value={courseFormDuration} onChange={e => setCourseFormDuration(e.target.value)} className="form-input" placeholder="e.g. 1 Month" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Price (₹ INR) *</label>
                  <input type="number" required value={courseFormPrice} onChange={e => setCourseFormPrice(Number(e.target.value))} className="form-input" placeholder="e.g. 1999" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Badge/Tag *</label>
                  <input type="text" required value={courseFormTag} onChange={e => setCourseFormTag(e.target.value)} className="form-input" placeholder="e.g. Beginner Friendly" />
                </div>
                <div className="flex items-center pt-8">
                  <input type="checkbox" id="popular" checked={courseFormPopular} onChange={e => setCourseFormPopular(e.target.checked)} className="mr-2" />
                  <label htmlFor="popular" className="text-xs font-bold text-purple-950 cursor-pointer">Mark as Popular</label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Key Features (comma separated) *</label>
                <input type="text" required value={courseFormFeatures} onChange={e => setCourseFormFeatures(e.target.value)} className="form-input" placeholder="e.g. Flexible Batch Timings, Personal Attention" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5 font-sans">Course Cover Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={e => setCourseFormFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Demo Video File</label>
                  <input type="file" accept="video/*" onChange={e => setCourseFormDemoVideoFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Or Demo Video URL</label>
                <input type="text" value={courseFormDemoVideoUrl} onChange={e => setCourseFormDemoVideoUrl(e.target.value)} className="form-input text-xs" placeholder="Paste demo video URL" />
              </div>

              {/* Dynamic Course Videos upload */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-purple-950">Course Lesson Videos ({courseFormVideos.length})</label>
                  <button
                    type="button"
                    onClick={() => setCourseFormVideos([...courseFormVideos, { title: '', url: '' }])}
                    className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold hover:bg-purple-200"
                  >
                    + Add Lesson
                  </button>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto p-2 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                  {courseFormVideos.map((vid, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-purple-100 flex flex-col gap-2 relative">
                      <button
                        type="button"
                        onClick={() => setCourseFormVideos(courseFormVideos.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        Remove
                      </button>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Lesson Title *</label>
                          <input
                            type="text"
                            required
                            value={vid.title}
                            onChange={e => {
                              const updated = [...courseFormVideos]
                              updated[idx].title = e.target.value
                              setCourseFormVideos(updated)
                            }}
                            className="form-input text-xs"
                            placeholder="e.g. Introduction to Hatha"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Video URL or Upload *</label>
                          <input
                            type="text"
                            value={vid.url}
                            onChange={e => {
                              const updated = [...courseFormVideos]
                              updated[idx].url = e.target.value
                              setCourseFormVideos(updated)
                            }}
                            className="form-input text-xs"
                            placeholder="Paste video URL"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Or Upload Video File</label>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={e => {
                            const updated = [...courseFormVideos]
                            const file = e.target.files ? e.target.files[0] : null
                            if (file) {
                              ;(updated[idx] as any).file = file
                              updated[idx].url = `[Pending Upload: ${file.name}]`
                              setCourseFormVideos(updated)
                            }
                          }}
                          className="block w-full text-[10px] text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-purple-50 file:text-purple-700"
                        />
                      </div>
                    </div>
                  ))}
                  {courseFormVideos.length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-400 font-semibold">No lessons added yet. Click "+ Add Lesson".</div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={uploadingMedia} className="btn-primary py-3 rounded-xl mt-4 glow-btn text-sm font-bold disabled:opacity-50">
                {uploadingMedia ? 'Uploading Files & Saving Course...' : 'Save Course 🙏'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Gallery Create / Edit Form Modal (Admin) ───────────────────────── */}
      {showGalleryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative border border-purple-100 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setShowGalleryForm(false); setEditingGallery(null); }}
              className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold font-serif text-purple-950 mb-6">
              {editingGallery ? 'Edit Gallery Photo' : 'Add New Gallery Photo'}
            </h2>

            <form onSubmit={handleSaveGallery} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Photo Title / Label *</label>
                <input
                  type="text"
                  required
                  value={galleryFormLabel}
                  onChange={e => setGalleryFormLabel(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Sunrise Hatha Flow"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Category *</label>
                  <select
                    value={galleryFormCat}
                    onChange={e => setGalleryFormCat(e.target.value)}
                    className="form-input"
                    style={{ cursor: 'pointer' }}
                  >
                    {['yoga', 'nature', 'retreats', 'events'].map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Grid Span (Layout Style) *</label>
                  <select
                    value={galleryFormSpan}
                    onChange={e => setGalleryFormSpan(e.target.value as any)}
                    className="form-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="normal">Normal (Square)</option>
                    <option value="wide">Wide (Landscape)</option>
                    <option value="tall">Tall (Portrait)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Image URL or Unsplash ID</label>
                <input
                  type="text"
                  value={galleryFormUrl}
                  onChange={e => setGalleryFormUrl(e.target.value)}
                  className="form-input text-xs"
                  placeholder="Paste URL or Unsplash ID"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Or Upload Photo File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setGalleryFormFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingMedia}
                className="btn-primary py-3 rounded-xl mt-4 glow-btn text-sm font-bold disabled:opacity-50"
              >
                {uploadingMedia ? 'Uploading & Saving...' : 'Save Gallery Photo 🌿'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Testimonial Create / Edit Form Modal (Admin) ────────────────────── */}
      {showTestimonialForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative border border-purple-100 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => { setShowTestimonialForm(false); setEditingTestimonial(null); }}
              className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold font-serif text-purple-950 mb-6">
              {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
            </h2>

            <form onSubmit={handleSaveTestimonial} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={testimonialFormName}
                    onChange={e => setTestimonialFormName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1.5">Program / Role *</label>
                  <input
                    type="text"
                    required
                    value={testimonialFormRole}
                    onChange={e => setTestimonialFormRole(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Yoga Transformation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Feedback Quote / Text *</label>
                <textarea
                  required
                  rows={4}
                  value={testimonialFormText}
                  onChange={e => setTestimonialFormText(e.target.value)}
                  className="form-input"
                  placeholder="Enter feedback testimonial details..."
                  style={{ resize: 'none' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Avatar Image URL or Unsplash ID</label>
                <input
                  type="text"
                  value={testimonialFormUrl}
                  onChange={e => setTestimonialFormUrl(e.target.value)}
                  className="form-input text-xs"
                  placeholder="Paste avatar URL or Unsplash ID"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1.5">Or Upload Avatar File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setTestimonialFormFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingMedia}
                className="btn-primary py-3 rounded-xl mt-4 glow-btn text-sm font-bold disabled:opacity-50"
              >
                {uploadingMedia ? 'Uploading & Saving...' : 'Save Testimonial 🙏'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Gallery View */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center">
            <button className="absolute -top-10 right-0 text-white font-bold text-2xl focus:outline-none">✕</button>
            <UnsplashImg id={lightbox.id} w={1200} h={900} alt={lightbox.label} className="max-w-full max-h-[75vh] object-contain rounded-2xl" />
            <div className="text-white font-serif mt-4 text-center">{lightbox.label}</div>
          </div>
        </div>
      )}

      {/* ── Booking Modal (Toast popup form) ──────────────────────────────── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative border border-purple-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowBookingModal(false); setBookingSuccess(false) }}
              className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <div className="section-label inline-block" style={{ margin: '0 auto 8px' }}>🌿 Enquire Now</div>
              <h2 className="text-2xl font-bold font-serif text-purple-950">Begin Your Wellness Journey</h2>
              <p className="text-purple-600 text-xs mt-1">Submit your details and we'll get back to you shortly</p>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌸</div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#6E3AA8', marginBottom: 8 }}>Enquiry Submitted!</h3>
                <p style={{ color: '#7a6a8a', fontSize: '0.9rem' }}>We'll contact you shortly to guide you. Namaste 🙏</p>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="grid sm:grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name *" required value={bookingData.name} onChange={e => setBookingData(d => ({ ...d, name: e.target.value }))} className="form-input" />
                <input type="tel" placeholder="Phone Number *" required value={bookingData.phone} onChange={e => setBookingData(d => ({ ...d, phone: e.target.value }))} className="form-input" />
                <input type="email" placeholder="Email Address" value={bookingData.email} onChange={e => setBookingData(d => ({ ...d, email: e.target.value }))} className="form-input" />
                <select value={bookingData.program} onChange={e => setBookingData(d => ({ ...d, program: e.target.value }))} className="form-input" style={{ cursor: 'pointer' }}>
                  <option value="">Select Program</option>
                  {['Yoga', 'Meditation', 'Zumba', 'Aerobics', 'Weight Loss', 'Chakra Balancing', 'Vedic Chanting', 'Vedanta Retreat'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select value={bookingData.time} onChange={e => setBookingData(d => ({ ...d, time: e.target.value }))} className="form-input sm:col-span-2" style={{ cursor: 'pointer' }}>
                  <option value="">Preferred Time</option>
                  {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:00 PM', '6:00 PM', '7:00 PM'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Additional message or requirements..."
                  rows={3}
                  value={bookingData.message}
                  onChange={e => setBookingData(d => ({ ...d, message: e.target.value }))}
                  className="form-input sm:col-span-2"
                  style={{ resize: 'none' }}
                />
                <button type="submit" className="btn-primary sm:col-span-2 glow-btn w-full py-3.5 text-sm font-bold mt-2">
                  Send Enquiry 🙏
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Course Details Modal (Full screen overlay) ────────────────────── */}
      {selectedCourseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative border border-purple-100 max-h-[95vh] overflow-y-auto flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => { setSelectedCourseDetails(null); setActiveCourseVideoUrl('') }}
              className="absolute top-4 right-4 text-purple-900 font-bold text-xl hover:text-purple-600 focus:outline-none z-10 bg-purple-50 hover:bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center transition-all"
            >
              ✕
            </button>

            <div className="grid md:grid-cols-2 gap-6 p-6 sm:p-10">
              {/* Left Side: Video Player */}
              <div className="flex flex-col justify-between h-full gap-4">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-inner border border-purple-100">
                  <video
                    key={activeCourseVideoUrl || selectedCourseDetails.demoVideoUrl}
                    src={activeCourseVideoUrl || selectedCourseDetails.demoVideoUrl || "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-41585-large.mp4"}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-purple-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {activeCourseVideoUrl ? '📖 Lesson Active' : '🎬 Course Demo Video'}
                  </div>
                </div>

                {/* Lesson Videos List for Purchased Course */}
                {(() => {
                  const owned = userProfile?.purchasedCourses?.[selectedCourseDetails.id]
                  return owned && selectedCourseDetails.videos && selectedCourseDetails.videos.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm max-h-[180px] overflow-y-auto">
                      <h4 className="font-serif font-bold text-sm text-purple-950 mb-2">📚 Course Lessons ({selectedCourseDetails.videos.length})</h4>
                      <div className="flex flex-col gap-1.5">
                        {selectedCourseDetails.videos.map((vid, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveCourseVideoUrl(vid.url)}
                            className={`text-left text-xs p-2 rounded-xl border transition-all flex items-center justify-between ${
                              activeCourseVideoUrl === vid.url
                                ? 'bg-purple-100 border-purple-300 text-purple-950 font-bold'
                                : 'bg-purple-50/30 border-purple-100/50 text-purple-900 hover:bg-purple-50'
                            }`}
                          >
                            <span>{idx + 1}. {vid.title}</span>
                            <span className="text-[10px] bg-purple-200 px-2 py-0.5 rounded-full text-purple-800">Play</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100/50">
                  <h4 className="font-serif font-bold text-purple-950 mb-2">🧘 Why practice with us?</h4>
                  <p className="text-xs text-purple-900/80 leading-relaxed">
                    Gain full lifetime access to step-by-step HD video lessons, curated breathing techniques, customized nutrition manuals, and direct mentoring with certified Acharyas.
                  </p>
                </div>
              </div>

              {/* Right Side: Course details & Action */}
              <div className="flex flex-col justify-between h-full">
                <div>
                  <span className="inline-block px-3.5 py-1 bg-purple-100 rounded-full text-xs font-semibold text-purple-800 mb-3">
                    {selectedCourseDetails.tag}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-purple-950 mb-2">
                    {selectedCourseDetails.title}
                  </h2>
                  <p className="text-purple-600 text-sm font-semibold mb-3">
                    📅 Course Duration: {selectedCourseDetails.duration}
                  </p>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                    {selectedCourseDetails.description || 'No overview description provided for this course yet.'}
                  </p>

                  <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-3">
                    What you will learn:
                  </h3>
                  <ul className="space-y-3.5 mb-8">
                    {(selectedCourseDetails.features || []).map((f, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <span className="text-purple-600 text-lg leading-none">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 text-sm font-medium">One-time Enrollment Fee:</span>
                    <span className="text-3xl font-black text-purple-950">₹{selectedCourseDetails.price}</span>
                  </div>

                  {(() => {
                    const owned = userProfile?.purchasedCourses?.[selectedCourseDetails.id]
                    return owned ? (
                      <div className="w-full text-center py-4 bg-green-100 text-green-700 font-bold rounded-2xl border border-green-200 cursor-default">
                        You already own this course
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const course = selectedCourseDetails;
                          setSelectedCourseDetails(null);
                          handleBuyCourse(course);
                        }}
                        className="btn-primary w-full py-4 text-sm font-extrabold tracking-wider rounded-2xl glow-btn shadow-lg"
                      >
                        Buy Course & Start Practicing
                      </button>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Enquire Now */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-900 hover:to-purple-700 text-white font-bold text-xs tracking-wide rounded-full px-5 py-3.5 shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 border border-purple-400/25 active:scale-95"
      >
        Enquire Now
      </button>

    </div>
  )
}
