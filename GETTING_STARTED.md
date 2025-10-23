# Getting Started with VideoSum

**Time to first working feature**: ~4 hours
**Last Updated**: October 16, 2025

---

## 🎯 Goal

By the end of this guide, you'll have:
- ✅ A working Next.js application
- ✅ Database connected and migrated
- ✅ User authentication functional
- ✅ Video file upload working
- ✅ Basic dashboard displaying videos

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 20+** installed
  ```bash
  node --version  # Should be v20.x.x or higher
  ```

- [ ] **Git** installed and configured
  ```bash
  git --version
  ```

- [ ] **PostgreSQL** database ready (choose one):
  - Option A: Local (Docker recommended)
  - Option B: Cloud (Railway.app free tier)

- [ ] **Code editor** (VS Code recommended with extensions):
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense

- [ ] **API Keys** (get these ready):
  - OpenAI API key (https://platform.openai.com)
  - Vercel account (https://vercel.com)

---

## 🚀 Quick Start (4 Hours)

### Hour 1: Project Setup

#### Step 1: Initialize Next.js Project (10 min)

```bash
# Create Next.js application
npx create-next-app@latest videosum --typescript --tailwind --app --src-dir=false

# Navigate to project
cd videosum

# Open in VS Code
code .
```

**Answer prompts**:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- src/ directory: **No**
- App Router: **Yes**
- Import alias: **Yes** (@/*)

#### Step 2: Install Dependencies (10 min)

```bash
# Core dependencies
npm install prisma @prisma/client
npm install next-auth@beta  # v5 for App Router
npm install bcryptjs
npm install react-dropzone
npm install @vercel/blob
npm install zod

# Dev dependencies
npm install @types/bcryptjs --save-dev

# shadcn/ui setup
npx shadcn-ui@latest init
```

**shadcn/ui prompts**:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

```bash
# Install UI components
npx shadcn-ui@latest add button card input form label dropdown-menu avatar progress toast
```

#### Step 3: Set Up Environment Variables (10 min)

```bash
# Copy example env file
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database (update with your credentials)
DATABASE_URL="postgresql://videosum:password123@localhost:5432/videosum"

# NextAuth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate this
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob (get from vercel.com after creating project)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# OpenAI (get from platform.openai.com)
OPENAI_API_KEY="sk-..."
```

**Getting Vercel Blob Token**:
1. Go to https://vercel.com
2. Create new project (import GitHub repo or manual)
3. Go to Storage → Create → Blob
4. Copy the `BLOB_READ_WRITE_TOKEN`

#### Step 4: Database Setup (15 min)

**Option A: Local PostgreSQL with Docker**

```bash
# Start PostgreSQL container
docker run --name videosum-db \
  -e POSTGRES_USER=videosum \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=videosum \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps
```

**Option B: Railway PostgreSQL (Cloud)**

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project
4. Add PostgreSQL service
5. Copy `DATABASE_URL` from Railway dashboard
6. Paste into `.env.local`

#### Step 5: Prisma Setup (15 min)

```bash
# Initialize Prisma
npx prisma init
```

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String

  videos       Video[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([email])
}

model Video {
  id          String   @id @default(cuid())
  title       String
  sourceType  String   // "upload", "zoom", "youtube", "meet", "vimeo"
  sourceUrl   String?
  fileUrl     String?
  status      String   @default("pending")

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, createdAt])
}
```

```bash
# Run migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

#### Step 6: Test Setup (10 min)

```bash
# Start development server
npm run dev
```

Visit http://localhost:3000 - you should see Next.js default page.

**✅ Hour 1 Complete!**

---

### Hour 2: Authentication

#### Step 1: Create Database Client (5 min)

Create `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### Step 2: NextAuth Configuration (15 min)

Create `lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const isValid = await compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
}
```

#### Step 3: NextAuth Route Handler (5 min)

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

#### Step 4: Signup API (10 min)

Create `app/api/auth/signup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = signupSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
```

#### Step 5: Login Page (15 min)

Create `app/auth/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to VideoSum</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              Login
            </Button>
            <p className="text-sm text-center">
              Don't have an account?{' '}
              <a href="/auth/signup" className="text-blue-600">
                Sign up
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### Step 6: Signup Page (10 min)

Create `app/auth/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })

    if (res.ok) {
      router.push('/auth/login')
    } else {
      const data = await res.json()
      setError(data.error || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              Sign Up
            </Button>
            <p className="text-sm text-center">
              Already have an account?{' '}
              <a href="/auth/login" className="text-blue-600">
                Login
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### Step 7: Test Authentication (10 min)

```bash
# Restart dev server (if needed)
npm run dev
```

1. Go to http://localhost:3000/auth/signup
2. Create an account
3. Go to http://localhost:3000/auth/login
4. Login with your credentials

**✅ Hour 2 Complete!**

---

### Hour 3: File Upload

#### Step 1: Upload API Route (20 min)

Create `app/api/videos/upload/route.ts`:

```typescript
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate file size (2GB max)
    const maxSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 2GB)' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`videos/${file.name}`, file, {
      access: 'public',
    })

    // Save to database
    const video = await prisma.video.create({
      data: {
        title: title || file.name,
        sourceType: 'upload',
        fileUrl: blob.url,
        status: 'uploaded',
        userId: session.user.id,
      },
    })

    return NextResponse.json({ video })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

#### Step 2: Upload Page (25 min)

Create `app/(dashboard)/upload/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
        setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''))
      }
    },
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)

    try {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/videos/${data.video.id}`)
      } else {
        alert('Upload failed')
      }
    } catch (error) {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg">
                  {isDragActive
                    ? 'Drop video here'
                    : 'Drag & drop video or click to select'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supported: MP4, MOV, AVI, MKV (max 2GB)
                </p>
              </div>
            )}
          </div>

          {file && (
            <>
              <div>
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                />
              </div>

              {uploading && <Progress value={progress} />}

              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

#### Step 3: Test Upload (15 min)

1. Go to http://localhost:3000/upload
2. Drag and drop a video file
3. Click "Upload Video"
4. Should redirect to video detail page

**✅ Hour 3 Complete!**

---

### Hour 4: Dashboard & Video List

#### Step 1: Videos API (15 min)

Create `app/api/videos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const videos = await prisma.video.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ videos })
}
```

#### Step 2: Dashboard Page (20 min)

Create `app/(dashboard)/dashboard/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Video {
  id: string
  title: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos')
      const data = await res.json()
      setVideos(data.videos)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/upload">
          <Button>Upload Video</Button>
        </Link>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No videos yet</p>
            <Link href="/upload">
              <Button>Upload Your First Video</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <Card key={video.id}>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`px-2 py-1 rounded text-sm ${
                      video.status === 'completed' ? 'bg-green-100 text-green-800' :
                      video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      video.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {video.status}
                    </span>
                    <span className="ml-4 text-sm text-gray-500">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Link href={`/videos/${video.id}`}>
                    <Button variant="outline">View</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Step 3: Navigation (15 min)

Create `components/nav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Nav() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold">
          VideoSum
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost">Upload</Button>
          </Link>
          <Button variant="outline" onClick={() => signOut()}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
```

Add navigation to `app/(dashboard)/layout.tsx`:

```typescript
import { Nav } from '@/components/nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Nav />
      {children}
    </div>
  )
}
```

#### Step 4: Test Everything (10 min)

1. Login
2. Go to dashboard
3. Upload a video
4. See it appear in dashboard
5. Click "View" to see video details

**✅ Hour 4 Complete!**

---

## 🎉 Success!

You now have a working VideoSum application with:
- ✅ User authentication
- ✅ Video file upload
- ✅ Video list dashboard
- ✅ Database persistence

---

## 🚀 Next Steps

### Week 2: Core Features
- [ ] Add URL-based video input (Zoom, YouTube)
- [ ] Build platform detection
- [ ] Create video detail page with video player

### Week 3-4: Processing Pipeline
- [ ] Integrate Deepgram for transcription
- [ ] Implement FFmpeg frame extraction
- [ ] Set up BullMQ job queue
- [ ] Add real-time progress updates

### Week 5-6: AI Integration
- [ ] OpenAI integration for summarization
- [ ] Visual analysis of frames
- [ ] Markdown generation
- [ ] Download functionality

**Follow [TODO.md](TODO.md) for detailed tasks**

---

## 🐛 Troubleshooting

### "PrismaClient is unable to run in browser"
- Make sure you're using `'use server'` or API routes for Prisma queries
- Never import Prisma in client components

### "Module not found: next-auth"
- Install with: `npm install next-auth@beta`
- Make sure you're using v5 for App Router

### "BLOB_READ_WRITE_TOKEN is not defined"
- Get token from Vercel dashboard (Storage → Blob)
- Add to `.env.local`
- Restart dev server

### Videos not uploading
- Check Vercel Blob quota in dashboard
- Verify file size < 2GB
- Check file type (mp4, mov, avi, mkv only)

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)

---

**Questions?** Check [README.md](README.md) or create an issue!

**Ready for Phase 2?** See [ROADMAP.md](ROADMAP.md) for what's next!
