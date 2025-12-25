# Dhanvarshagoldloan

A comprehensive Customer Relationship Management (CRM) system built with Angular 16 for managing loan applications, customer details, KYC documents, and valuations.

## 🚀 Features

- **Loan Application Management**: Complete wizard-based loan application process
- **Customer Management**: Personal details, family details, work details, and more
- **KYC Document Management**: Upload and manage Aadhaar, PAN, and other KYC documents
- **Valuation System**: First, second, and final valuation tracking
- **Dashboard**: Analytics and charts using ECharts
- **Enhanced Authentication**: Secure login with JWT token-based authentication, rate limiting, and session management
- **Document Upload**: Photo and document upload functionality with webcam support
- **Modern UI/UX**: Improved views with better error handling, loading states, and user feedback
- **Security Features**: Input sanitization, XSS protection, and comprehensive validation
- **User Profile Management**: User info display, logout functionality, and session tracking

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher recommended)
- **npm** (v9.x or higher) or **yarn**
- **Angular CLI** (v16.2.16)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dhanvarshagoldloan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Update `src/app/environment.ts` with your development API URL:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'https://your-dev-api-url.com'
   };
   ```

   For production, update `src/app/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-production-api-url.com'
   };
   ```

## 🏃 Running the Application

### Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Production Build

```bash
npm run build:prod
# or
ng build --configuration production
```

The build artifacts will be stored in the `dist/dhanvarshagoldloan/` directory.

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/              # Authentication guards, interceptors, and services
│   ├── layout/            # Main layout components
│   │   ├── dashboard/     # Dashboard component
│   │   ├── header/        # Header component
│   │   ├── sidebar/       # Sidebar navigation
│   │   ├── loan-application-wizard/  # Multi-step loan application wizard
│   │   │   └── steps/     # Individual wizard steps
│   │   └── worklist/      # Worklist component
│   ├── login/             # Login component
│   ├── pages/             # Additional page components
│   ├── services/          # Angular services
│   │   ├── PersonalDetailsService.ts
│   │   └── toast.service.ts
│   ├── environment.ts     # Development environment config
│   ├── environment.prod.ts # Production environment config
│   └── app.module.ts      # Root module
├── assets/                # Static assets (images, etc.)
└── styles.css             # Global styles
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test
# or
ng test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## 🎨 Code Formatting

### Format Code

```bash
npm run format
```

### Check Formatting

```bash
npm run format:check
```

## 📦 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🏗️ Technology Stack

- **Angular** 16.2.0
- **Angular Material** 16.2.14
- **RxJS** 7.8.0
- **ECharts** 5.6.0 (via ngx-echarts)
- **ngx-webcam** 0.4.1
- **TypeScript** 5.1.3

## 🔐 Authentication & Security

The application uses JWT token-based authentication with enhanced security features:

### Security Features
- **JWT Token Management**: Automatic token validation and expiration handling
- **Rate Limiting**: Login attempt tracking with account lockout after 5 failed attempts
- **Input Sanitization**: XSS protection and input validation using security utilities
- **Session Management**: Secure session handling with automatic token refresh
- **Password Visibility Toggle**: User-friendly password field with show/hide functionality
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and more
- **Role-Based Access Control**: Support for user roles and permissions (ready for implementation)

### Authentication Flow
- The `AuthInterceptor` automatically adds the authentication token to all HTTP requests
- `AuthGuard` protects routes and redirects unauthenticated users to login
- `LoginGuard` prevents logged-in users from accessing the login page
- Automatic session expiration handling with user-friendly error messages

### Security Utilities
Located in `src/app/utils/security.util.ts`:
- Input sanitization functions
- XSS protection helpers
- Email, phone, and username validation
- Password strength validation
- HTML escaping utilities

## 📝 Key Components

### Loan Application Wizard

Multi-step wizard for creating loan applications:
- Personal Details
- Family Details
- Address & Activity
- Work Details
- KYC Details
- Nominee Details
- Reference Details
- Gold Ownership Details
- First Valuation
- Second Valuation
- Final Valuation
- Additional Documents

### Services

- **AuthService**: Handles authentication, token management, and user info storage
- **PersonalDetailsService**: Handles all customer-related API calls
- **ToastService**: Provides toast notifications for user feedback with enhanced error handling
- **LoaderService**: Manages global loading states

### Security & Utilities

- **Security Utilities** (`src/app/utils/security.util.ts`): Input sanitization, XSS protection, and validation helpers
- **Auth Interceptor**: Enhanced error handling with detailed error messages for different HTTP status codes
- **Auth Guards**: Route protection with automatic redirects and session management

### UI/UX Improvements

- **Enhanced Login Page**: 
  - Password visibility toggle
  - Real-time form validation
  - Login attempt tracking with lockout
  - Better error messages and user feedback
  - Improved accessibility

- **Header Component**:
  - User profile dropdown menu
  - Logout functionality
  - User information display
  - Navigation with active route highlighting

- **Error Handling**:
  - Comprehensive error messages for all HTTP status codes
  - User-friendly error notifications
  - Network error detection and handling
  - Retry mechanisms (ready for implementation)

## 🌐 API Configuration

The application communicates with a backend API. Configure the API URL in the environment files:

- Development: `src/app/environment.ts`
- Production: `src/app/environment.prod.ts`

## 🤝 Contributing

1. Follow the Angular style guide
2. Use Prettier for code formatting
3. Write unit tests for new features
4. Follow the existing code structure and naming conventions

## 📄 License

This project is private and proprietary.

## 🆘 Support

For Angular CLI help, use `ng help` or check the [Angular CLI documentation](https://angular.io/cli).

---

**Note**: Make sure to update the API URLs in the environment files before running the application.
