# AgriGuard Authentication System Setup

## Overview
Complete end-to-end authentication system with JWT tokens, password hashing, and MongoDB user storage.

## Architecture

### Backend (Node.js + Express + MongoDB)
- **Database**: MongoDB (local or cloud)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs with 10-salt rounds
- **Token Expiry**: 7 days

### Frontend (React + Vite)
- **Session Storage**: localStorage for auth token and user data
- **Request Interceptor**: Auto-attaches JWT token to API requests
- **Protected Routes**: Check for user before rendering pages

## Backend Implementation

### Files Created/Modified

1. **Database Connection** (`src/db/connection.ts`)
   - Connects to MongoDB using mongoose
   - Environment variable: `MONGODB_URI` (default: `mongodb://localhost:27017/agrivision`)

2. **User Model** (`src/models/User.ts`)
   - Fields: fullName, phoneNumber, area, role, email, password
   - Phone number must be 10 digits
   - Passwords hashed before saving
   - Supports two roles: `farmer` or `municipality_official`

3. **Auth Controller** (`src/controllers/auth.controller.ts`)
   - `register()`: Create new user account
   - `login()`: Authenticate and return JWT token
   - `verifyToken()`: Validate JWT tokens

4. **Auth Middleware** (`src/middleware/auth.ts`)
   - `authenticateToken`: Verify JWT in requests
   - `requireRole`: Check user permission level

5. **Auth Routes** (`src/routes/auth.routes.ts`)
   - `POST /api/auth/register` - Register new user
   - `POST /api/auth/login` - Login with credentials

## Frontend Implementation

### Files Created/Modified

1. **API Service** (`src/services/api.js`)
   - `registerUser(userData)` - POST to /api/auth/register
   - `loginUser(phoneNumber, password)` - POST to /api/auth/login
   - `logoutUser()` - Clear localStorage
   - `getStoredUser()` - Retrieve stored user data
   - Request interceptor automatically adds Authorization header

2. **Pages**
   - **Registration** (`src/pages/Registration.jsx`)
     - Language selection (English, Tamil, Kannada)
     - Role selection (Farmer, Municipality Official)
     - Form: Full name, phone, area, password
     - Connects to `/api/auth/register`
   
   - **Login** (`src/pages/Login.jsx`)
     - Phone + password login
     - Remember me option
     - Demo credentials display
     - Connects to `/api/auth/login`

3. **App State** (`src/App.jsx`)
   - Checks localStorage for existing auth token on load
   - Routes to /register if no user
   - Routes to /login for authentication
   - Protected routes after successful login

## Environment Variables

### Backend (.env)
```
# Database
MONGODB_URI=mongodb://localhost:27017/agrivision
JWT_SECRET=agrivision-super-secret-key-change-in-production

# Port
PORT=8000
NODE_ENV=development
```

### Frontend (.env or .env.local)
```
VITE_BACKEND_URL=http://localhost:8000
```

## How It Works

### Registration Flow
1. User fills form (name, phone, area, role, password)
2. Frontend calls `registerUser()`
3. Backend validates and hashes password
4. User created in MongoDB
5. JWT token generated
6. Token returned to frontend
7. Token stored in localStorage
8. User redirected to dashboard

### Login Flow
1. User enters phone + password
2. Frontend calls `loginUser()`
3. Backend finds user by phone number
4. Password compared with hash
5. If valid, JWT token generated
6. Token stored in localStorage
7. User redirected to dashboard

### Protected Routes
1. On app load, `getStoredUser()` checks localStorage
2. If token exists, user is logged in
3. Token sent in `Authorization: Bearer <token>` header
4. Backend middleware verifies token
5. If invalid or expired, user returned to login

## Testing

### Register Demo User
- **Phone**: 9876543210
- **Password**: test123
- **Role**: farmer
- **Name**: Any name
- **Area**: Any area

### Login
- Use phone: 9876543210
- Password: test123

## Security Features

✅ **Password Hashing**: bcryptjs with salt rounds
✅ **JWT Tokens**: 7-day expiry for sessions
✅ **Request Validation**: Zod schema validation
✅ **Error Messages**: Generic to prevent user enumeration
✅ **Rate Limiting**: Built-in rate limiter on /api/
✅ **CORS**: Enabled for frontend origin
✅ **Helmet**: Security headers middleware

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  fullName: String (required, min 2 chars),
  phoneNumber: String (required, unique, 10 digits),
  email: String (optional, unique),
  area: String (required),
  role: "farmer" | "municipality_official",
  password: String (hashed, required),
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### "MongoDB connection failed"
- Ensure MongoDB is running locally on port 27017
- Or set MONGODB_URI to your cloud MongoDB connection string
- Docker: `docker run -d -p 27017:27017 mongo`

### "Invalid or expired token"
- Token may have expired (7-day expiry)
- User needs to login again
- Or clear localStorage and restart

### "Phone number already exists"
- Phone must be unique per user
- Can't register twice with same phone
- Login with existing account instead

## Future Enhancements

- [ ] Email verification
- [ ] Forgot password flow
- [ ] Two-factor authentication
- [ ] OAuth integration (Google, GitHub)
- [ ] Session management dashboard
- [ ] Audit logs for security events
- [ ] API key authentication for mobile apps
- [ ] Refresh token rotation
