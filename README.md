# Campus Connect Marketplace

A complete full-stack student marketplace mobile application built with React Native and Node.js.

## Project Overview

Campus Connect is a hyper-local student marketplace that enables students to buy and sell items within their campus community. The application features user authentication, listing management, and real-time messaging.

## Technology Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication with bcrypt
- Comprehensive testing with Jest

**Frontend:**
- React Native
- React Navigation v6
- Axios for API communication
- AsyncStorage for token persistence

## Project Structure

```
campus-connect/
├── backend/                 # Node.js/Express.js API server
│   ├── config/             # Database configuration
│   ├── middleware/         # Express middleware
│   ├── models/            # Mongoose data models
│   ├── routes/            # API route handlers
│   ├── tests/             # Backend test files
│   ├── utils/             # Utility functions
│   ├── .env.template      # Environment variables template
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/               # React Native mobile app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── screens/       # Screen components
│   │   ├── services/      # API client and services
│   │   ├── tests/         # Frontend test files
│   │   └── utils/         # Utility functions
│   ├── App.js             # Main app component
│   ├── index.js           # App entry point
│   ├── app.json           # App configuration
│   ├── metro.config.js    # Metro bundler configuration
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## Features

### Core Functionality
- **User Authentication**: Secure registration and login with JWT tokens
- **Listing Management**: Create, browse, and manage marketplace listings
- **Real-time Messaging**: Chat system between buyers and sellers
- **Category System**: Organized listings by categories (Textbooks, Electronics, etc.)
- **User Dashboard**: Manage personal listings and mark items as sold

### Technical Features
- **Security**: Input validation, XSS prevention, secure password hashing
- **Error Handling**: Comprehensive error management and user feedback
- **Testing**: Extensive test coverage with unit and integration tests
- **Responsive Design**: Mobile-first UI with React Native components
- **API Documentation**: RESTful API with clear endpoint structure

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

### Listings
- `GET /api/listings` - Get all active listings
- `GET /api/listings/my` - Get user's listings
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id/sold` - Mark listing as sold

### Messages
- `GET /api/messages/:conversationId` - Get conversation history
- `POST /api/messages` - Send message

### Health Check
- `GET /api/health` - API health status

## Setup Instructions

### Prerequisites
- Node.js (LTS version)
- MongoDB (local installation or MongoDB Atlas)
- React Native development environment

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template and configure:
   ```bash
   cp .env.template .env
   ```
   Edit `.env` with your MongoDB URI and JWT secret.

4. Start the development server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   npm run ios
   ```

4. For Android:
   ```bash
   npm run android
   ```

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Development Status

✅ **PROJECT COMPLETE** - All features implemented and tested!

- ✅ User authentication system with JWT tokens
- ✅ Listing management with CRUD operations
- ✅ Real-time messaging system
- ✅ Frontend implementation with all screens
- ✅ Comprehensive error handling and validation
- ✅ Security middleware and input sanitization
- ✅ Extensive test coverage

## License

MIT License