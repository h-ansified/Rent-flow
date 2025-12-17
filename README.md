# 🏠 RentFlow Dashboard

A modern, full-stack property rental management system built with React, Express, and PostgreSQL. RentFlow simplifies property management with an intuitive interface for tracking tenants, properties, payments, and maintenance requests.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)

## ✨ Features

### 🔐 Authentication & Security
- **Secure Authentication** - Password hashing with bcrypt
- **Session Management** - Persistent sessions with Express Session
- **Remember Me** - Optional extended session duration
- **Password Reset** - Email-based password recovery flow
- **Welcome Screen** - Onboarding for new users
- **Protected Routes** - Role-based access control

### 📊 Core Functionality
- **Property Management** - Add, edit, and track rental properties
- **Tenant Tracking** - Manage tenant information and lease agreements
- **Payment Processing** - Record and monitor rent payments
- **Maintenance Requests** - Track and resolve property maintenance issues
- **Dashboard Analytics** - Visual insights with charts and statistics
- **Responsive Design** - Mobile-friendly interface

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Wouter** - Lightweight routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Styling framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hook Form** - Form management with Zod validation
- **Lucide React** - Icon library

### Backend
- **Express 4.21** - Web framework
- **TypeScript** - Type safety
- **Passport.js** - Authentication middleware
- **PostgreSQL** - Database
- **Drizzle ORM** - Type-safe database toolkit
- **Bcrypt** - Password hashing
- **Express Session** - Session management
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting

### DevOps & Tools
- **Vite** - Build tool and dev server
- **ESBuild** - JavaScript bundler
- **Drizzle Kit** - Database migrations
- **TSX** - TypeScript execution

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/h-ansified/RentFlow-Dashboard.git
   cd RentFlow-Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/rentflow
   SESSION_SECRET=your-secret-key-here
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

## 🚀 Usage

### Development
```bash
npm run dev        # Start development server
npm run check      # Type check TypeScript
npm run db:push    # Push database schema changes
```

### Production
```bash
npm run build      # Build for production
npm start          # Start production server
```

## 📁 Project Structure

```
RentFlow-Dashboard/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── pages/         # Page components
│   │       ├── dashboard.tsx
│   │       ├── login.tsx
│   │       ├── signup.tsx
│   │       ├── properties.tsx
│   │       ├── tenants.tsx
│   │       ├── payments.tsx
│   │       ├── maintenance.tsx
│   │       └── settings.tsx
├── server/                # Backend Express application
│   ├── auth.ts           # Authentication logic
│   ├── db.ts             # Database configuration
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   └── storage.ts        # File storage utilities
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema (Drizzle)
├── migrations/           # Database migrations
└── dist/                 # Production build output
```

## 🔑 Key Features Explained

### Authentication Flow
1. **Sign Up** - New users create an account with email and password
2. **Welcome Screen** - First-time users see an onboarding screen
3. **Login** - Existing users authenticate with credentials
4. **Remember Me** - Optional 30-day session persistence
5. **Password Reset** - Secure password recovery via email

### Dashboard
- **Overview Stats** - Key metrics at a glance
- **Recent Activity** - Latest payments, maintenance requests
- **Charts & Graphs** - Visual analytics with Recharts
- **Quick Actions** - Fast access to common tasks

### Property Management
- Add/edit property details (address, type, rent amount)
- Upload property images
- Track occupancy status
- View property history

### Tenant Management
- Store tenant contact information
- Track lease agreements
- View payment history
- Manage move-in/move-out dates

### Payment Tracking
- Record rent payments
- Generate payment receipts
- Track overdue payments
- View payment history and trends

### Maintenance Requests
- Submit maintenance issues
- Assign priority levels
- Track repair status
- Attach photos/documents

## 🔒 Security

- **Password Hashing** - Bcrypt with salt rounds
- **Session Security** - HTTP-only cookies, secure flags in production
- **Rate Limiting** - Protection against brute force attacks
- **Helmet.js** - Security headers
- **CORS** - Configured cross-origin resource sharing
- **Input Validation** - Zod schemas for all inputs

## 🚢 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `NODE_ENV=production`

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   npm start
   ```

## 📄 Database Schema

The application uses PostgreSQL with Drizzle ORM. Key tables include:

- **users** - User accounts and authentication
- **properties** - Rental property information
- **tenants** - Tenant details and lease info
- **payments** - Payment records and history
- **maintenance** - Maintenance request tracking

To create or update the database schema:
```bash
npm run db:push
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**h-ansified**
- GitHub: [@h-ansified](https://github.com/h-ansified)
- Email: hanw009@gmail.com

## 🙏 Acknowledgments

- Built with [Replit](https://replit.com)
- UI components from [Radix UI](https://radix-ui.com)
- Icons from [Lucide](https://lucide.dev)
- Styled with [Tailwind CSS](https://tailwindcss.com)

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Email: hanw009@gmail.com

---

**Made with ❤️ for property managers**
