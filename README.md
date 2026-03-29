# Enrollix - Education CRM

Modern admission management platform for counselors to manage leads, pipeline stages, and follow-ups with real-time updates and insights.

**Status**: Production Ready | **Version**: 1.0 | **Last Updated**: March 2026

## Key Navigation

- **Quick Start?** → [guides/QUICK_DEPLOYMENT.md](guides/QUICK_DEPLOYMENT.md) (45 minutes to live!)
- **Full Deployment Guide?** → [guides/DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md)
- **Testing & Feedback?** → [guides/SHIP_TO_USER_GUIDE.md](guides/SHIP_TO_USER_GUIDE.md)
- **Documentation Index?** → [docs/](docs/) or [guides/](guides/)

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS + Framer Motion (animations)
- **Backend**: Express.js + TypeScript + JWT authentication
- **Database**: PostgreSQL + Prisma ORM
- **Deployment**: Vercel (Frontend) + Render (Backend + Database)

## Project Structure

```
enrollix/
├── backend/           ← Express API server + Prisma ORM
├── frontend/          ← Next.js web application
├── docs/              ← Technical documentation (SMS, branding, features, testing)
├── guides/            ← Deployment & usage guides
├── logs/              ← Application logs
├── docker-compose.yml ← PostgreSQL setup for local dev
├── render.yaml        ← Render infrastructure config
└── README.md          ← This file
```

### Folder Details

- **`backend/`** - Express.js API with authentication, lead management, SMS integration
- **`frontend/`** - Next.js web app with dashboard, lead management, animations
- **`docs/`** - Technical documentation (SMS setup, branding, testing, features)
- **`guides/`** - Deployment guides (Quick start, Vercel, Render, testing)
- **`logs/`** - Application runtime logs

### Core Features

- **Authentication**: JWT-based login with role-based access control
- **Lead Management**: Create, edit, view, and pipeline movement for leads
- **Pipeline Kanban**: Drag-and-drop leads across pipeline stages (Lead → Contacted → Interested → Qualified → Applied → Enrolled)
- **Activity Tracking**: Log calls, WhatsApp, emails, notes with follow-up scheduling
- **Admin Dashboard**: Overview of leads, pipeline metrics, follow-up tasks
- **SMS Integration**: Twilio SMS for lead notifications and follow-ups
- **Real-time Updates**: Instant UI updates when leads are modified
- **Responsive Design**: Mobile-friendly interface with animations
- **Premium UI**: Modern login page with gradient animations

## Quick Start

### 1. Local Development Setup

**Prerequisites**: Node.js 18+, PostgreSQL (or Docker)

**Backend Setup**:
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
# Backend runs on http://localhost:4000
```

**Frontend Setup**:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

**Database**: 
```bash
docker compose up -d
# PostgreSQL starts on localhost:5432
```

### 2. Production Deployment

See **[guides/QUICK_DEPLOYMENT.md](guides/QUICK_DEPLOYMENT.md)** for step-by-step instructions (45 minutes to live!).

**Default Deployment**:
- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL
- **Cost**: Free tier ($0/month)

## Demo Credentials

```
Admin Account:
Email: admin@crm.local
Password: Password@123

Counselor Account:
Email: counselor@crm.local
Password: Password@123
```

## API Documentation

**Core Endpoints**:
```
POST   /auth/login                  # Login
GET    /auth/me                     # Current user
GET    /leads                       # List all leads
POST   /leads                       # Create lead
GET    /leads/:id                   # Get lead detail
PUT    /leads/:id                   # Update lead
PATCH  /leads/:id/status            # Update lead status
POST   /activities                  # Log activity
GET    /activities/:lead_id         # Get lead activities
GET    /users/counselors            # List counselors
GET    /api/info                    # System info
GET    /health                      # Health check
```

Full API documentation available in backend code.

## Documentation

### Getting Started
- [Quick Deployment (45 min)](guides/QUICK_DEPLOYMENT.md)
- [Full Deployment Guide](guides/DEPLOYMENT_GUIDE.md)
- [Counselor Quick Start](guides/COUNSELOR_QUICK_START.md)

### Deployment
- [Vercel Frontend Setup](guides/VERCEL_DEPLOYMENT.md)
- [Render Backend Setup](guides/RENDER_DEPLOYMENT.md)
- [Deployment Checklist](guides/DEPLOYMENT_CHECKLIST.md)

### Features & Setup
- [SMS Integration](docs/SMS_QUICK_START.md)
- [Branding Guidelines](docs/ENROLLIX_BRANDING.md)
- [Feature Summary](docs/FEATURE_SUMMARY.md)

### Testing
- [Testing Checklist](docs/TESTING_CHECKLIST.md)
- [Real-World UX Testing](guides/REAL_WORLD_UX_TESTING.md)
- [Ship to User Guide](guides/SHIP_TO_USER_GUIDE.md)

## Support & Troubleshooting

### Common Issues

**Login fails?**
- Check DATABASE_URL in backend .env
- Verify JWT_SECRET is set
- Check backend logs: `logs/`  

**Frontend can't reach backend?**
- Verify NEXT_PUBLIC_API_URL in frontend .env.local
- Check backend CORS_ORIGIN setting
- Ensure both are HTTPS in production

**Database won't connect?**
- Check PostgreSQL is running (`docker compose ps`)
- Verify connection string is correct
- Check firewall/network access

See [guides/DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md) for more troubleshooting.

## Development

### Scripts

**Backend**:
```bash
npm run dev           # Development mode with auto-reload
npm run build         # Compile TypeScript to JavaScript
npm start             # Run compiled production code
npm test              # Run all tests
npm run prisma:migrate # Create new migration
npm run prisma:seed   # Seed database
```

**Frontend**:
```bash
npm run dev      # Development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Check code quality
```

### Testing

- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- **E2E Tests**: `npm run test:e2e`
- **All Tests**: `npm run test:ci`

See [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md) for testing procedures.

## Roadmap

### Completed ✅
- JWT authentication and authorization
- Lead CRUD and pipeline management
- Activity tracking and follow-ups
- SMS integration (Twilio)
- Admin dashboard and analytics
- Premium UI with animations
- Full deployment setup (Render + Vercel)
- Comprehensive testing suite

### Planned 📋
- Email integration
- Advanced reporting & exports
- Mobile app
- API rate limiting
- Advanced search & filters
- Custom fields for leads
- Team collaboration features
- Performance analytics

## Contributing

Contributions welcome! Please:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - All rights reserved

## Contact & Support

For issues or questions:
- Check [docs/](docs/) and [guides/](guides/) folders
- Review [DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md)
- Check logs in [logs/](logs/) directory

---

**Ready to deploy?** Start with [guides/QUICK_DEPLOYMENT.md](guides/QUICK_DEPLOYMENT.md) 🚀
